import { STATUS_PAGE_LIMITS, UPTIME_HISTORY_DAYS } from "./constants"
import { dailySlots, sumCounts, uptimePercent, type CheckCounts } from "./stats"
import type { MonitorStatus, StatusPageTheme, UptimeSlot } from "./types"

// What a public status page says overall, from its monitors' current status.
// Shared by the page banner, its Open Graph image and the README badge.

export type OverallStatus =
  "operational" | "degraded" | "partial" | "major" | "unknown"

/**
 * Paused and never-checked monitors don't count. Any down → partial outage;
 * more than half down → major outage; only slow → degraded; none counted →
 * unknown (so a page of paused monitors never claims "operational").
 */
export function overallStatus(
  statuses: readonly MonitorStatus[]
): OverallStatus {
  let active = 0
  let down = 0
  let degraded = 0
  for (const status of statuses) {
    if (status === "paused" || status === "pending") continue
    active++
    if (status === "down") down++
    else if (status === "degraded") degraded++
  }
  if (active === 0) return "unknown"
  if (down * 2 > active) return "major"
  if (down > 0) return "partial"
  return degraded > 0 ? "degraded" : "operational"
}

export const OVERALL_STATUS_LABELS: Record<OverallStatus, string> = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  partial: "Partial outage",
  major: "Major outage",
  unknown: "No status yet",
}

/** One service's status in words a visitor understands. */
export const PUBLIC_STATUS_LABELS: Record<MonitorStatus, string> = {
  up: "Operational",
  degraded: "Degraded performance",
  down: "Outage",
  paused: "Paused",
  pending: "No data yet",
}

/** Short README badge text. */
export const BADGE_MESSAGES: Record<OverallStatus, string> = {
  operational: "up",
  degraded: "degraded",
  partial: "partial outage",
  major: "down",
  unknown: "unknown",
}

// ---------------------------------------------------------------------------
// The public view. Everything a visitor's browser receives is built here, from
// an explicit list of fields: no monitor ids, URLs (unless showUrls), methods,
// headers, bodies, keywords, status codes or error messages.

export type PublicService<Series> = {
  /** Position-based key; monitor ids stay private. */
  key: string
  name: string
  /** Only when the owner turned on showUrls. */
  url: string | null
  status: MonitorStatus
  uptime90d: number | null
  slots: UptimeSlot[]
  /** Only when the owner turned on showResponseTimes. */
  responseSeries: Series | null
}

export type PublicIncident = {
  key: string
  serviceName: string
  startedAt: string
  resolvedAt: string | null
  durationSeconds: number | null
  ongoing: boolean
}

export type PublicAnnouncement = {
  key: string
  message: string
  createdAt: string
}

export type PublicStatusView<Series = unknown> = {
  slug: string
  title: string
  description: string
  logoUrl: string | null
  theme: StatusPageTheme
  /** "Powered by PingBoard" in the footer (free plan). */
  branding: boolean
  showResponseTimes: boolean
  overall: OverallStatus
  services: PublicService<Series>[]
  incidents: PublicIncident[]
  announcements: PublicAnnouncement[]
  generatedAt: string
}

export type StatusViewInput<Series> = {
  page: {
    slug: string
    title: string
    description: string
    logoUrl: string | null
    theme: StatusPageTheme
    showUrls: boolean
    showResponseTimes: boolean
    monitors: readonly { monitorId: string; displayName: string }[]
    announcements: readonly { message: string; createdAt: Date }[]
  }
  /** The owner's monitors by id; ids missing here are skipped. */
  monitors: ReadonlyMap<string, { status: MonitorStatus; url: string }>
  histories: ReadonlyMap<string, readonly (CheckCounts & { day: number })[]>
  incidents: readonly {
    monitorId: string
    startedAt: Date
    resolvedAt: Date | null
    durationSeconds: number | null
    open: boolean
  }[]
  series: ReadonlyMap<string, Series> | null
  branding: boolean
  now: Date
}

export function toPublicStatusView<Series>(
  input: StatusViewInput<Series>
): PublicStatusView<Series> {
  const { page, now } = input
  const names = new Map<string, string>()
  const services: PublicService<Series>[] = []

  for (const entry of page.monitors) {
    const monitor = input.monitors.get(entry.monitorId)
    if (!monitor) continue
    names.set(entry.monitorId, entry.displayName)
    const history = input.histories.get(entry.monitorId) ?? []
    const total = sumCounts(history)
    services.push({
      key: `s${services.length}`,
      name: entry.displayName,
      url: page.showUrls ? monitor.url : null,
      status: monitor.status,
      uptime90d: uptimePercent(total.up, total.total),
      slots: dailySlots(history, UPTIME_HISTORY_DAYS, now),
      responseSeries:
        page.showResponseTimes && input.series
          ? (input.series.get(entry.monitorId) ?? null)
          : null,
    })
  }

  const since = now.getTime() - STATUS_PAGE_LIMITS.incidentDays * 86_400_000
  const incidents = input.incidents
    .filter(
      (incident) =>
        names.has(incident.monitorId) &&
        (incident.open ||
          (incident.resolvedAt && incident.resolvedAt.getTime() >= since))
    )
    .sort((a, b) => {
      if (a.open !== b.open) return a.open ? -1 : 1
      return b.startedAt.getTime() - a.startedAt.getTime()
    })
    .map((incident, index) => ({
      key: `i${index}`,
      serviceName: names.get(incident.monitorId) ?? "",
      startedAt: incident.startedAt.toISOString(),
      resolvedAt: incident.resolvedAt?.toISOString() ?? null,
      durationSeconds: incident.durationSeconds,
      ongoing: incident.open,
    }))

  return {
    slug: page.slug,
    title: page.title,
    description: page.description,
    logoUrl: page.logoUrl,
    theme: page.theme,
    branding: input.branding,
    showResponseTimes: page.showResponseTimes,
    overall: overallStatus(services.map((service) => service.status)),
    services,
    incidents,
    announcements: page.announcements.map((announcement, index) => ({
      key: `a${index}`,
      message: announcement.message,
      createdAt: announcement.createdAt.toISOString(),
    })),
    generatedAt: now.toISOString(),
  }
}
