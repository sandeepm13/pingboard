import type { MonitorStatus, UptimeSlot } from "@shared/types"
import { mulberry32 } from "@/lib/prng"

// Sample monitors for the landing-page preview. Deterministic (seeded) so the
// prerendered HTML and the first client render agree.

export type DemoSpec = {
  id: string
  name: string
  url: string
  baseMs: number
  spreadMs: number
  /** This one alternates between down and up. */
  flips?: boolean
}

export const DEMO_SPECS: DemoSpec[] = [
  {
    id: "web",
    name: "Marketing site",
    url: "acme.dev",
    baseMs: 120,
    spreadMs: 60,
  },
  {
    id: "api",
    name: "Public API",
    url: "api.acme.dev/health",
    baseMs: 620,
    spreadMs: 260,
  },
  {
    id: "checkout",
    name: "Checkout",
    url: "shop.acme.dev/api/checkout",
    baseMs: 260,
    spreadMs: 120,
    flips: true,
  },
  { id: "docs", name: "Docs", url: "docs.acme.dev", baseMs: 80, spreadMs: 30 },
]

export const DEMO_POINTS = 24
export const DEMO_TICK_MS = 2_500

/** 5-tick cycle: 3 up, then 2 down (2 failed checks = down, like the real rule). */
export function isFlipDown(tick: number): boolean {
  return tick % 5 >= 3
}

export function nextResponse(spec: DemoSpec, rand: () => number): number {
  return Math.round(spec.baseMs + (rand() - 0.5) * 2 * spec.spreadMs)
}

export function initialSeries(rand: () => number) {
  return Object.fromEntries(
    DEMO_SPECS.map((spec) => [
      spec.id,
      Array.from({ length: DEMO_POINTS }, (_, i) =>
        // An earlier short outage on the flipping monitor.
        spec.flips && (i === 9 || i === 10) ? null : nextResponse(spec, rand)
      ),
    ])
  ) as Record<string, (number | null)[]>
}

export function createDemoRandom() {
  return mulberry32(42)
}

/** Fixed base so the server render is deterministic; replaced after mount. */
export const DEMO_BASE_TIME = Date.UTC(2026, 9, 27, 12, 0, 0)

export function demoSlots(
  spec: DemoSpec,
  endTime: number,
  latest: MonitorStatus
): UptimeSlot[] {
  const rand = mulberry32(spec.id.length * 97 + spec.baseMs)
  const hour = 60 * 60_000
  const end = Math.floor(endTime / hour) * hour
  return Array.from({ length: 24 }, (_, i) => {
    const start = new Date(end - (23 - i) * hour).toISOString()
    if (i === 23) {
      return {
        start,
        status: latest,
        uptime: latest === "down" ? 92 : 100,
        checks: 60,
      }
    }
    const r = rand()
    if (spec.flips && i === 14) {
      return { start, status: "down", uptime: 96.67, checks: 60 }
    }
    if (spec.id === "api" && r < 0.2) {
      return { start, status: "degraded", uptime: 100, checks: 60 }
    }
    return { start, status: "up", uptime: 100, checks: 60 }
  })
}
