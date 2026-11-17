// Uptime and response-time maths, defined once for the rollup job, the
// dashboard and the status page.

import type { UptimeSlot } from "./types"

/**
 * Uptime % over a set of checks. "degraded" checks count as up (the site
 * answered correctly, just slowly). null when there were no checks: no data
 * is not the same as 0 % or 100 %. Rounded to 3 decimals, but never to
 * exactly 100 while a check failed (or 0 while one passed): one failure in
 * 300 000 checks must not read as a perfect record.
 */
export function uptimePercent(
  upChecks: number,
  totalChecks: number
): number | null {
  if (totalChecks <= 0) return null
  const rounded = Math.round((upChecks / totalChecks) * 100_000) / 1_000
  if (upChecks < totalChecks && rounded >= 100) return 99.999
  if (upChecks > 0 && rounded <= 0) return 0.001
  return rounded
}

/** Nearest-rank percentile of an ascending array (p in 0–100). */
export function percentile(
  sorted: readonly number[],
  p: number
): number | null {
  if (sorted.length === 0) return null
  const rank = Math.ceil((p / 100) * sorted.length)
  return sorted[Math.min(Math.max(rank, 1), sorted.length) - 1] ?? null
}

export type ResponseTimeSummary = {
  avgResponseMs: number | null
  minResponseMs: number | null
  maxResponseMs: number | null
  p95ResponseMs: number | null
}

/** Response times of checks that got an HTTP response (timeouts have none). */
export function summarizeResponseTimes(
  values: readonly number[]
): ResponseTimeSummary {
  if (values.length === 0) {
    return {
      avgResponseMs: null,
      minResponseMs: null,
      maxResponseMs: null,
      p95ResponseMs: null,
    }
  }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((total, value) => total + value, 0)
  return {
    avgResponseMs: Math.round(sum / sorted.length),
    minResponseMs: sorted[0] ?? null,
    maxResponseMs: sorted[sorted.length - 1] ?? null,
    p95ResponseMs: percentile(sorted, 95),
  }
}

export type CheckCounts = {
  total: number
  /** Includes degraded checks. */
  up: number
  degraded: number
}

/**
 * Colour of one uptime-bar slot: any failed check makes it "down" (so a short
 * outage is never hidden by averaging), only slow checks make it "degraded",
 * no checks at all is null ("no data").
 */
export function slotStatus(
  counts: CheckCounts
): "up" | "degraded" | "down" | null {
  if (counts.total <= 0) return null
  if (counts.up < counts.total) return "down"
  return counts.degraded > 0 ? "degraded" : "up"
}

/**
 * One uptime-bar slot per UTC day for the `days` days ending with `now`'s
 * day, oldest first. Days without a row are "no data".
 */
export function dailySlots(
  rows: readonly (CheckCounts & { day: number })[],
  days: number,
  now: Date
): UptimeSlot[] {
  const byDay = new Map(rows.map((row) => [row.day, row]))
  const firstDay = startOfUtcDay(now).getTime() - (days - 1) * DAY_MS
  return Array.from({ length: days }, (_, i) => {
    const day = firstDay + i * DAY_MS
    const row = byDay.get(day)
    return {
      start: new Date(day).toISOString(),
      status: row ? slotStatus(row) : null,
      uptime: row ? uptimePercent(row.up, row.total) : null,
      checks: row?.total ?? 0,
    }
  })
}

/** Adds up counts, e.g. 30 daily rows into one 30-day figure. */
export function sumCounts(rows: readonly CheckCounts[]): CheckCounts {
  return rows.reduce<CheckCounts>(
    (sum, row) => ({
      total: sum.total + row.total,
      up: sum.up + row.up,
      degraded: sum.degraded + row.degraded,
    }),
    { total: 0, up: 0, degraded: 0 }
  )
}

/** Midnight UTC of the day `date` falls in. */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
}

export const DAY_MS = 24 * 60 * 60 * 1000
