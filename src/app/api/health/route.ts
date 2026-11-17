import mongoose from "mongoose"
import { connection } from "next/server"

import { connectDb } from "@/lib/db"
import { getRedis } from "@/lib/redis"

// GET /api/health → 200 when MongoDB and Redis answer, otherwise 503. Used by
// the Docker healthcheck and the deploy workflow. Public on purpose (probes
// have no session), so it reports only up/down: no hosts, errors or user data.

const PROBE_TIMEOUT_MS = 3_000
const NO_STORE = { "Cache-Control": "no-store" }

async function probe(task: () => Promise<unknown>): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined
  try {
    await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("timed out")),
          PROBE_TIMEOUT_MS
        )
      }),
    ])
    return true
  } catch (error) {
    console.error(
      "[health] probe failed:",
      error instanceof Error ? error.message : error
    )
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function GET() {
  // Request time only: a build-time prerender would bake in a stale answer.
  await connection()

  const [mongo, redis] = await Promise.all([
    probe(async () => {
      await connectDb()
      await mongoose.connection.db?.admin().ping()
    }),
    probe(() => getRedis().ping()),
  ])
  const ok = mongo && redis

  return Response.json(
    {
      status: ok ? "ok" : "unhealthy",
      mongo: mongo ? "up" : "down",
      redis: redis ? "up" : "down",
    },
    { status: ok ? 200 : 503, headers: NO_STORE }
  )
}
