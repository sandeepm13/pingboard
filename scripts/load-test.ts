// Load test for the checker: seeds N monitors (1-minute interval) pointing at
// a local test site, runs the built worker against them for a few minutes and
// reports whether it kept up: checks per monitor, duplicates, gaps, and the
// worker's own "schedule lag" (due time → start of the check).
//
//   npm run build:worker
//   LOADTEST_MONGODB_URI=mongodb://127.0.0.1:27100 \
//   LOADTEST_REDIS_URL=redis://127.0.0.1:6379/1 \
//   npm run load-test
//
// Optional: LOADTEST_MONITORS (300), LOADTEST_MINUTES (10),
// LOADTEST_CONCURRENCY (worker default), LOADTEST_SLOW_SHARE (0.05: share of
// requests that take 1–3 s), LOADTEST_HANG_SHARE (0.02: share that never
// answer and time out after 10 s).
//
// Needs its own throwaway MongoDB and an empty Redis database: it drops the
// database and flushes the Redis db afterwards. Never point it at real data.

import { spawn } from "node:child_process"
import { randomBytes } from "node:crypto"
import { createServer } from "node:http"
import type { AddressInfo } from "node:net"
import { createInterface } from "node:readline"

import { Redis } from "ioredis"
import mongoose from "mongoose"

import { CheckResult } from "@shared/models/check-result"
import { Monitor } from "@shared/models/monitor"
import { User } from "@shared/models/user"
import { percentile } from "@shared/stats"

const MONGODB_URI = process.env.LOADTEST_MONGODB_URI
const REDIS_URL = process.env.LOADTEST_REDIS_URL
const MONITORS = Number(process.env.LOADTEST_MONITORS ?? 300)
const MINUTES = Number(process.env.LOADTEST_MINUTES ?? 10)
const SLOW_SHARE = Number(process.env.LOADTEST_SLOW_SHARE ?? 0.05)
const HANG_SHARE = Number(process.env.LOADTEST_HANG_SHARE ?? 0.02)
const DB_NAME = "pingboard_loadtest"
const HEALTH_PORT = 3301

if (!MONGODB_URI || !REDIS_URL) {
  console.error("Set LOADTEST_MONGODB_URI and LOADTEST_REDIS_URL (throwaway).")
  process.exit(1)
}

function between(min: number, max: number) {
  return min + Math.random() * (max - min)
}

/** A site with a realistic mix: mostly fast, some slow, a few hanging. */
function startTargetSite() {
  const server = createServer((_req, res) => {
    const roll = Math.random()
    if (roll < HANG_SHARE) return // never answers: the check times out
    const ms =
      roll < HANG_SHARE + SLOW_SHARE ? between(1_000, 3_000) : between(20, 300)
    setTimeout(() => res.writeHead(200).end("ok"), ms)
  })
  return new Promise<{ url: string; close: () => void }>((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => {
          server.closeAllConnections()
          server.close()
        },
      })
    })
  )
}

async function seed(siteUrl: string) {
  await mongoose.connection.dropDatabase()
  const user = await User.create({
    name: "Load test",
    email: "loadtest@example.com",
    plan: "pro",
    onboardedAt: new Date(),
  })
  await Monitor.insertMany(
    Array.from({ length: MONITORS }, (_, i) => ({
      userId: user._id,
      name: `Load ${i + 1}`,
      url: `${siteUrl}/m/${i + 1}`,
      intervalMinutes: 1,
      timeoutMs: 10_000,
      status: "pending",
    }))
  )
}

type LagLine = {
  checks: number
  avgLagMs: number
  p95LagMs: number
  maxLagMs: number
}

function startWorker(lags: LagLine[]) {
  const child = spawn(process.execPath, ["worker/dist/index.mjs"], {
    env: {
      ...process.env,
      NODE_ENV: "test", // JSON logs
      LOG_LEVEL: "info",
      MONGODB_URI,
      MONGODB_DB: DB_NAME,
      REDIS_URL,
      ENCRYPTION_KEY: randomBytes(32).toString("base64"),
      SSRF_ALLOW_PRIVATE: "true",
      EMAIL_PROVIDER: "console",
      WORKER_HEALTH_PORT: String(HEALTH_PORT),
      ...(process.env.LOADTEST_CONCURRENCY && {
        WORKER_CONCURRENCY: process.env.LOADTEST_CONCURRENCY,
      }),
    },
    stdio: ["ignore", "pipe", "inherit"],
  })
  createInterface({ input: child.stdout }).on("line", (line) => {
    try {
      const entry = JSON.parse(line) as LagLine & {
        msg?: string
        level?: number
      }
      if (entry.msg === "schedule lag") {
        lags.push(entry)
        console.log(
          `  lag: ${entry.checks} checks, avg ${entry.avgLagMs} ms, p95 ${entry.p95LagMs} ms, max ${entry.maxLagMs} ms`
        )
      } else if ((entry.level ?? 0) >= 40) {
        console.log(`  worker: ${entry.msg}`)
      }
    } catch {
      // not JSON
    }
  })
  return child
}

async function analyse(startedAt: Date, endedAt: Date) {
  // Skip the first minute: every scheduler starts at once on boot.
  const from = new Date(startedAt.getTime() + 60_000)
  const rows = await CheckResult.aggregate<{ _id: unknown; at: Date[] }>([
    { $match: { checkedAt: { $gte: startedAt, $lt: endedAt } } },
    { $sort: { checkedAt: 1 } },
    { $group: { _id: "$monitorId", at: { $push: "$checkedAt" } } },
  ])
  let duplicates = 0
  let gaps = 0
  const intervals: number[] = []
  for (const row of rows) {
    const times = row.at.map((d) => d.getTime())
    for (let i = 1; i < times.length; i++) {
      const gap = times[i]! - times[i - 1]!
      if (times[i - 1]! >= from.getTime()) intervals.push(gap)
      if (gap < 30_000) duplicates++
      if (gap > 90_000) gaps++
    }
  }
  intervals.sort((a, b) => a - b)
  const total = rows.reduce((sum, row) => sum + row.at.length, 0)
  const minutes = (endedAt.getTime() - startedAt.getTime()) / 60_000
  return {
    monitorsChecked: rows.length,
    checks: total,
    // One at start-up, then one per full minute (the last few may still be
    // in flight when the window closes).
    expectedChecks: (Math.floor(minutes) + 1) * MONITORS,
    duplicates,
    gaps,
    intervalP50Ms: percentile(intervals, 50),
    intervalP99Ms: percentile(intervals, 99),
    intervalMaxMs: intervals.at(-1) ?? null,
  }
}

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: DB_NAME })
  const redis = new Redis(REDIS_URL!)
  if ((await redis.dbsize()) > 0) {
    throw new Error(
      "LOADTEST_REDIS_URL's database isn't empty; use a free one."
    )
  }
  const site = await startTargetSite()
  await seed(site.url)
  console.log(`Seeded ${MONITORS} monitors (1 min). Running ${MINUTES} min…`)

  const lags: LagLine[] = []
  const startedAt = new Date()
  const worker = startWorker(lags)
  await new Promise((resolve) => setTimeout(resolve, MINUTES * 60_000 + 5_000))
  const endedAt = new Date()
  worker.kill()

  const report = await analyse(startedAt, endedAt)
  const steady = lags.slice(1)
  const avg = (key: keyof LagLine) =>
    steady.length
      ? Math.round(steady.reduce((sum, l) => sum + l[key], 0) / steady.length)
      : null
  console.log("\nResult")
  console.table({
    ...report,
    steadyAvgLagMs: avg("avgLagMs"),
    steadyP95LagMs: avg("p95LagMs"),
    worstMaxLagMs: Math.max(0, ...lags.map((l) => l.maxLagMs)),
  })

  site.close()
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  await redis.flushdb()
  redis.disconnect()
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
