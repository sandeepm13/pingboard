import { UPTIME_HISTORY_DAYS } from "@shared/constants"
import { DAY_MS, startOfUtcDay, type CheckCounts } from "@shared/stats"
import { toPublicStatusView } from "@shared/status-page"
import type { MonitorStatus } from "@shared/types"

import type { ResponseSeries } from "./monitor-stats"
import { mulberry32 } from "./prng"
import type { PublicView } from "./public-status"

// The /demo status page: sample services run through the same
// toPublicStatusView() as real pages, so it shows exactly what visitors of a
// PingBoard status page see. Seeded, relative to `now`.

const CHECKS_PER_DAY = 1_440
const HOUR_MS = 60 * 60_000

type DemoService = {
  id: string
  name: string
  status: MonitorStatus
  baseMs: number
  /** Days ago → failed checks that day. */
  outages: Record<number, number>
  /** Share of days with some slow checks. */
  slowDays: number
}

const SERVICES: DemoService[] = [
  {
    id: "web",
    name: "Website",
    status: "up",
    baseMs: 130,
    outages: { 41: 9 },
    slowDays: 0,
  },
  {
    id: "api",
    name: "Public API",
    status: "up",
    baseMs: 240,
    outages: { 3: 7, 58: 22 },
    slowDays: 0.08,
  },
  {
    id: "app",
    name: "Dashboard",
    status: "up",
    baseMs: 180,
    outages: {},
    slowDays: 0.03,
  },
  {
    id: "hooks",
    name: "Webhooks",
    status: "up",
    baseMs: 310,
    outages: { 9: 14 },
    slowDays: 0.05,
  },
]

function history(service: DemoService, today: number) {
  const rand = mulberry32(service.baseMs)
  return Array.from({ length: UPTIME_HISTORY_DAYS }, (_, i) => {
    const daysAgo = UPTIME_HISTORY_DAYS - 1 - i
    // Today is only partly over.
    const total = daysAgo === 0 ? CHECKS_PER_DAY / 2 : CHECKS_PER_DAY
    const failed = service.outages[daysAgo] ?? 0
    const degraded = rand() < service.slowDays ? Math.ceil(rand() * 20) : 0
    const counts: CheckCounts & { day: number } = {
      day: today - daysAgo * DAY_MS,
      total,
      up: total - failed,
      degraded,
    }
    return counts
  })
}

function series(service: DemoService, now: Date): ResponseSeries {
  const rand = mulberry32(service.baseMs * 7)
  const to = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS
  const from = to - 24 * HOUR_MS
  return {
    range: "24h",
    from,
    to,
    bucketMs: HOUR_MS,
    points: Array.from({ length: 24 }, (_, i) => ({
      t: from + i * HOUR_MS,
      avgMs: Math.round(
        service.baseMs * (0.85 + 0.3 * Math.sin(i / 3.5)) + rand() * 40
      ),
      p95Ms: null,
      checks: 60,
      failed: 0,
    })),
  }
}

/** Ends of the sample incidents: days ago + time of day + duration. */
const INCIDENTS = [
  { serviceId: "api", daysAgo: 3, startHour: 14.2, minutes: 7 },
  { serviceId: "hooks", daysAgo: 9, startHour: 3.5, minutes: 14 },
]

export function buildDemoStatusView(now: Date): PublicView {
  const today = startOfUtcDay(now).getTime()
  return toPublicStatusView<ResponseSeries>({
    page: {
      slug: "demo",
      title: "Acme",
      description:
        "Live status of Acme's website, API and dashboard. Sample data on a PingBoard demo page.",
      logoUrl: null,
      theme: "auto",
      showUrls: false,
      showResponseTimes: true,
      monitors: SERVICES.map((service) => ({
        monitorId: service.id,
        displayName: service.name,
      })),
      announcements: [
        {
          message:
            "Scheduled maintenance on Sunday, 02:00–02:30 UTC: database upgrade. The dashboard may be slow for a few minutes; the API stays up.",
          createdAt: new Date(now.getTime() - 20 * HOUR_MS),
        },
      ],
    },
    monitors: new Map(
      SERVICES.map((service) => [
        service.id,
        { status: service.status, url: "https://acme.example" },
      ])
    ),
    histories: new Map(
      SERVICES.map((service) => [service.id, history(service, today)])
    ),
    incidents: INCIDENTS.map((incident) => {
      const startedAt = new Date(
        today - incident.daysAgo * DAY_MS + incident.startHour * HOUR_MS
      )
      return {
        monitorId: incident.serviceId,
        startedAt,
        resolvedAt: new Date(startedAt.getTime() + incident.minutes * 60_000),
        durationSeconds: incident.minutes * 60,
        open: false,
      }
    }),
    series: new Map(
      SERVICES.map((service) => [service.id, series(service, now)])
    ),
    branding: true,
    now,
  })
}
