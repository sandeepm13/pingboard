import { createServer, type Server } from "node:http"

import type { LagSummary } from "./schedule-lag"

// GET /health → 200 when MongoDB, Redis and the check worker are all OK,
// otherwise 503. Meant for Docker/uptime probes; exposes no monitor data.

export type HealthProbe = () => {
  mongo: boolean
  redis: boolean
  worker: boolean
  lastCheckAt: Date | null
  /** The last minute's schedule lag (null before the first report). */
  scheduleLag: LagSummary | null
}

export function startHealthServer(
  probe: HealthProbe,
  options: { host: string; port: number }
): Promise<Server> {
  const startedAt = Date.now()
  const server = createServer((req, res) => {
    if (req.method !== "GET" || req.url?.split("?")[0] !== "/health") {
      res.writeHead(404).end()
      return
    }
    const state = probe()
    const ok = state.mongo && state.redis && state.worker
    res.writeHead(ok ? 200 : 503, {
      "content-type": "application/json",
      "cache-control": "no-store",
    })
    res.end(
      JSON.stringify({
        status: ok ? "ok" : "unhealthy",
        mongo: state.mongo ? "up" : "down",
        redis: state.redis ? "up" : "down",
        worker: state.worker ? "running" : "stopped",
        lastCheckAt: state.lastCheckAt?.toISOString() ?? null,
        scheduleLag: state.scheduleLag,
        uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      })
    )
  })
  return new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(options.port, options.host, () => resolve(server))
  })
}
