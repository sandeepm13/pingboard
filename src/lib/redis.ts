import "server-only"

import { Redis } from "ioredis"

import { getEnv } from "./env"

const globalForRedis = globalThis as typeof globalThis & {
  __redis?: Redis
}

/** One Redis client per server process (survives dev hot reloads). */
export function getRedis(): Redis {
  if (!globalForRedis.__redis) {
    const client = new Redis(getEnv().REDIS_URL, {
      // Fail fast: callers (e.g. rate limiting) decide what to do when Redis is down.
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      retryStrategy: (times) => Math.min(times * 200, 2_000),
    })
    // Log once per outage instead of on every reconnect attempt.
    let reported = false
    client.on("error", (error) => {
      if (reported) return
      reported = true
      console.error("[redis] unavailable:", error.message)
    })
    client.on("ready", () => {
      if (reported) console.info("[redis] reconnected")
      reported = false
    })
    globalForRedis.__redis = client
  }
  return globalForRedis.__redis
}
