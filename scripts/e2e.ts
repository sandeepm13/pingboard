// npm run test:e2e [-- playwright args]: empties the e2e database and Redis
// db, runs Playwright (which starts the built web app and worker), then
// empties them again. The reset can't live in Playwright's globalSetup:
// that runs after the servers have started (and created their indexes).

import { spawnSync } from "node:child_process"

import { Redis } from "ioredis"
import mongoose from "mongoose"

import { E2E } from "../playwright.config"

/** Marks a Redis db as ours, so a later run may flush it. */
const REDIS_MARKER = "pingboard:e2e"

async function reset(mark: boolean) {
  const redis = new Redis(E2E.redisUrl)
  try {
    const keys = await redis.dbsize()
    if (keys > 0 && !(await redis.exists(REDIS_MARKER))) {
      throw new Error(
        `${E2E.redisUrl} has ${keys} keys that aren't from an e2e run. Point E2E_REDIS_URL at an empty Redis db.`
      )
    }
    await redis.flushdb()
    if (mark) await redis.set(REDIS_MARKER, "1")
  } finally {
    redis.disconnect()
  }
  const connection = await mongoose
    .createConnection(E2E.mongoUri, { dbName: E2E.mongoDb })
    .asPromise()
  await connection.dropDatabase()
  await connection.close()
}

async function main() {
  await reset(true)
  const run = spawnSync(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    { stdio: "inherit", env: process.env }
  )
  if (!process.env.E2E_KEEP_DATA) await reset(false)
  process.exit(run.status ?? 1)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
