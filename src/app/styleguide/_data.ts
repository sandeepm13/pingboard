import type { HttpMethod, MonitorStatus, UptimeSlot } from "@shared/types"
import type { ResponseSeries } from "@/lib/monitor-stats"
import { mulberry32 } from "@/lib/prng"

// Deterministic fake data: no Math.random()/new Date() so the page prerenders
// identically on every build and never mismatches on hydration.

const BASE_TIME = Date.UTC(2026, 9, 24, 0, 0, 0)

export function fakeSlots({
  count,
  slotMinutes,
  seed,
  downRate = 0.02,
  degradedRate = 0.05,
  noDataLeading = 0,
  paused = false,
}: {
  count: number
  slotMinutes: number
  seed: number
  downRate?: number
  degradedRate?: number
  noDataLeading?: number
  paused?: boolean
}): UptimeSlot[] {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(BASE_TIME + i * slotMinutes * 60_000).toISOString()
    if (i < noDataLeading) return { start, status: null, uptime: null }
    if (paused) return { start, status: "paused", uptime: null }
    const r = rand()
    if (r < downRate) {
      return { start, status: "down", uptime: 60 + rand() * 35 }
    }
    if (r < downRate + degradedRate) {
      return { start, status: "degraded", uptime: 98 + rand() * 1.9 }
    }
    return { start, status: "up", uptime: 100 }
  })
}

export type FakeMonitor = {
  id: string
  name: string
  url: string
  method: HttpMethod
  status: MonitorStatus
  statusCode: number | null
  responseTimeMs: number | null
  intervalMinutes: number
  uptime24h: number | null
  slots: UptimeSlot[]
}

export const FAKE_MONITORS: FakeMonitor[] = [
  {
    id: "m1",
    name: "Marketing site",
    url: "https://acme.dev",
    method: "GET",
    status: "up",
    statusCode: 200,
    responseTimeMs: 142,
    intervalMinutes: 1,
    uptime24h: 100,
    slots: fakeSlots({
      count: 24,
      slotMinutes: 60,
      seed: 1,
      downRate: 0,
      degradedRate: 0,
    }),
  },
  {
    id: "m2",
    name: "Public API",
    url: "https://api.acme.dev/health",
    method: "GET",
    status: "degraded",
    statusCode: 200,
    responseTimeMs: 1180,
    intervalMinutes: 3,
    uptime24h: 99.71,
    slots: fakeSlots({
      count: 24,
      slotMinutes: 60,
      seed: 2,
      degradedRate: 0.25,
    }),
  },
  {
    id: "m3",
    name: "Checkout",
    url: "https://shop.acme.dev/api/checkout",
    method: "POST",
    status: "down",
    statusCode: 503,
    responseTimeMs: 2950,
    intervalMinutes: 1,
    uptime24h: 96.4,
    slots: fakeSlots({ count: 24, slotMinutes: 60, seed: 3, downRate: 0.15 }),
  },
  {
    id: "m4",
    name: "Docs",
    url: "https://docs.acme.dev",
    method: "HEAD",
    status: "up",
    statusCode: 200,
    responseTimeMs: 88,
    intervalMinutes: 5,
    uptime24h: 100,
    slots: fakeSlots({
      count: 24,
      slotMinutes: 60,
      seed: 4,
      noDataLeading: 6,
      downRate: 0,
      degradedRate: 0,
    }),
  },
  {
    id: "m5",
    name: "Staging",
    url: "https://staging.acme.dev",
    method: "GET",
    status: "paused",
    statusCode: null,
    responseTimeMs: null,
    intervalMinutes: 10,
    uptime24h: null,
    slots: fakeSlots({ count: 24, slotMinutes: 60, seed: 5, paused: true }),
  },
]

/** 24 h of 15-minute buckets with one short outage, for the chart demo. */
export function fakeSeries(): ResponseSeries {
  const rand = mulberry32(21)
  const bucketMs = 15 * 60_000
  const points = Array.from({ length: 96 }, (_, i) => {
    const failed = i >= 60 && i <= 62 ? 3 : 0
    return {
      t: BASE_TIME + i * bucketMs,
      avgMs:
        failed === 3
          ? null
          : Math.round(160 + 90 * Math.sin(i / 9) + rand() * 60),
      p95Ms: null,
      checks: 3,
      failed,
    }
  })
  return {
    range: "24h",
    from: BASE_TIME,
    to: BASE_TIME + 96 * bucketMs,
    bucketMs,
    points,
  }
}
