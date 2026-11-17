import "server-only"

import { Types } from "mongoose"
import { cache } from "react"
import { z } from "zod"

import {
  CHECK_RESULT_RETENTION_DAYS,
  UPTIME_HISTORY_DAYS,
} from "@shared/constants"
import { CheckResult } from "@shared/models/check-result"
import { DailyStat } from "@shared/models/daily-stat"
import {
  DAY_MS,
  startOfUtcDay,
  sumCounts,
  uptimePercent,
  type CheckCounts,
} from "@shared/stats"
import { HOUR_MS } from "@shared/time"
import type { CheckStatus } from "@shared/types"
import {
  COUNT_ACCUMULATORS,
  bucketIndex,
  p95Accumulator,
  roundMs,
} from "@/lib/check-buckets"

// Read models for /app/monitors/[id]. Callers must have checked ownership
// (findOwnedMonitor) first; these only take the monitor's id.

export const CHART_RANGES = ["1h", "24h", "7d", "30d"] as const
export type ChartRange = (typeof CHART_RANGES)[number]

export const CHECKS_PAGE_SIZE = 20

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value)

/** Search params of the detail page; anything malformed falls back to the default. */
export const monitorDetailParamsSchema = z.object({
  range: z.preprocess(firstValue, z.enum(CHART_RANGES).catch("24h")),
  before: z.preprocess(
    firstValue,
    z.iso.datetime().optional().catch(undefined)
  ),
  after: z.preprocess(firstValue, z.iso.datetime().optional().catch(undefined)),
  failures: z.preprocess(
    firstValue,
    z
      .literal("1")
      .optional()
      .catch(undefined)
      .transform((value) => value === "1")
  ),
})

export type MonitorDetailParams = z.output<typeof monitorDetailParamsSchema>

export type DayRow = CheckCounts & {
  /** Midnight UTC. */
  day: number
  avgResponseMs: number | null
  p95ResponseMs: number | null
}

type DayGroup = CheckCounts & {
  _id: { monitorId: Types.ObjectId; day: number }
  avgResponseMs: number | null
  p95ResponseMs: (number | null)[] | null
}

/** Runs of consecutive days as [from, to) ranges, so the $or stays short. */
function dayRanges(days: number[]): [number, number][] {
  const ranges: [number, number][] = []
  for (const day of days) {
    const last = ranges.at(-1)
    if (last && last[1] === day) last[1] = day + DAY_MS
    else ranges.push([day, day + DAY_MS])
  }
  return ranges
}

/**
 * One row per UTC day with checks, for the last UPTIME_HISTORY_DAYS days
 * including today, oldest first, for several monitors at once (2 queries in
 * total). Complete days come from DailyStat; today, and any day the rollup
 * hasn't written yet, are aggregated from raw checks (only where raw checks
 * still exist and not before the monitor existed).
 */
export async function getDailyHistories(
  monitors: readonly { id: string; createdAtMs: number }[]
): Promise<Map<string, DayRow[]>> {
  const result = new Map<string, Map<number, DayRow>>(
    monitors.map((monitor) => [monitor.id, new Map()])
  )
  if (monitors.length === 0) return new Map()
  const today = startOfUtcDay(new Date()).getTime()
  const firstDay = today - (UPTIME_HISTORY_DAYS - 1) * DAY_MS

  const stats = await DailyStat.find({
    monitorId: { $in: monitors.map((monitor) => monitor.id) },
    day: { $gte: new Date(firstDay), $lt: new Date(today) },
  })
    .select(
      "monitorId day totalChecks upChecks degradedChecks avgResponseMs p95ResponseMs"
    )
    .lean()
  for (const stat of stats) {
    result.get(stat.monitorId.toString())?.set(stat.day.getTime(), {
      day: stat.day.getTime(),
      total: stat.totalChecks,
      up: stat.upChecks,
      degraded: stat.degradedChecks,
      avgResponseMs: stat.avgResponseMs ?? null,
      p95ResponseMs: stat.p95ResponseMs ?? null,
    })
  }

  const clauses = monitors.flatMap((monitor) => {
    const rows = result.get(monitor.id)
    const rawFrom = Math.max(
      firstDay,
      startOfUtcDay(new Date(monitor.createdAtMs)).getTime(),
      today - (CHECK_RESULT_RETENTION_DAYS - 1) * DAY_MS
    )
    const missing: number[] = []
    for (let day = rawFrom; day <= today; day += DAY_MS) {
      if (!rows?.has(day)) missing.push(day)
    }
    const monitorId = new Types.ObjectId(monitor.id)
    return dayRanges(missing).map(([from, to]) => ({
      monitorId,
      checkedAt: { $gte: new Date(from), $lt: new Date(to) },
    }))
  })

  if (clauses.length) {
    const groups = await CheckResult.aggregate<DayGroup>([
      { $match: { $or: clauses } },
      {
        $group: {
          _id: {
            monitorId: "$monitorId",
            day: bucketIndex(new Date(firstDay), DAY_MS),
          },
          ...COUNT_ACCUMULATORS,
          avgResponseMs: { $avg: "$responseTimeMs" },
          p95ResponseMs: p95Accumulator(),
        },
      },
    ])
    for (const group of groups) {
      const day = firstDay + group._id.day * DAY_MS
      result.get(group._id.monitorId.toString())?.set(day, {
        day,
        total: group.total,
        up: group.up,
        degraded: group.degraded,
        avgResponseMs: roundMs(group.avgResponseMs),
        p95ResponseMs: roundMs(group.p95ResponseMs?.[0]),
      })
    }
  }

  return new Map(
    [...result].map(([id, rows]) => [
      id,
      [...rows.values()].sort((a, b) => a.day - b.day),
    ])
  )
}

/**
 * getDailyHistories for one monitor. Cached per request: the stat cards, the
 * 90-day bar and the 7d/30d chart share it.
 */
export const getDailyHistory = cache(
  async (monitorId: string, createdAtMs: number): Promise<DayRow[]> => {
    const histories = await getDailyHistories([{ id: monitorId, createdAtMs }])
    return histories.get(monitorId) ?? []
  }
)

/** The last `days` UTC days (including today) of a history. */
export function lastDays(history: DayRow[], days: number): DayRow[] {
  const from = startOfUtcDay(new Date()).getTime() - (days - 1) * DAY_MS
  return history.filter((row) => row.day >= from)
}

export type MonitorStats = {
  uptime24h: number | null
  uptime7d: number | null
  uptime30d: number | null
  checks24h: number
  avgResponseMs24h: number | null
  p95ResponseMs24h: number | null
}

type StatsGroup = {
  total7d: number
  up7d: number
  total24h: number
  up24h: number
  avg24h: number | null
  p95_24h: (number | null)[] | null
}

/** 24h and 7d from raw checks (one pass), 30d from the daily history. */
export async function getMonitorStats(
  monitorId: string,
  history: DayRow[]
): Promise<MonitorStats> {
  const now = Date.now()
  const since24h = new Date(now - 24 * HOUR_MS)
  const in24h = { $gte: ["$checkedAt", since24h] }
  const ms24h = { $cond: [in24h, "$responseTimeMs", null] }

  const [group] = await CheckResult.aggregate<StatsGroup>([
    {
      $match: {
        monitorId: new Types.ObjectId(monitorId),
        checkedAt: { $gte: new Date(now - 7 * DAY_MS) },
      },
    },
    {
      $group: {
        _id: null,
        total7d: { $sum: 1 },
        up7d: { $sum: { $cond: ["$isUp", 1, 0] } },
        total24h: { $sum: { $cond: [in24h, 1, 0] } },
        up24h: { $sum: { $cond: [{ $and: [in24h, "$isUp"] }, 1, 0] } },
        avg24h: { $avg: ms24h },
        p95_24h: p95Accumulator(ms24h),
      },
    },
  ])

  const month = sumCounts(lastDays(history, 30))
  return {
    uptime24h: uptimePercent(group?.up24h ?? 0, group?.total24h ?? 0),
    uptime7d: uptimePercent(group?.up7d ?? 0, group?.total7d ?? 0),
    uptime30d: uptimePercent(month.up, month.total),
    checks24h: group?.total24h ?? 0,
    avgResponseMs24h: roundMs(group?.avg24h),
    p95ResponseMs24h: roundMs(group?.p95_24h?.[0]),
  }
}

export type ChartPoint = {
  /** Bucket start, epoch ms. */
  t: number
  avgMs: number | null
  /** Daily ranges only. */
  p95Ms: number | null
  checks: number
  failed: number
}

export type ResponseSeries = {
  range: ChartRange
  from: number
  to: number
  bucketMs: number
  points: ChartPoint[]
}

const RAW_BUCKETS: Record<"1h" | "24h", { spanMs: number; bucketMs: number }> =
  {
    "1h": { spanMs: HOUR_MS, bucketMs: 60_000 },
    // 15 min buckets line up with local quarter-hours in every real time zone.
    "24h": { spanMs: 24 * HOUR_MS, bucketMs: 15 * 60_000 },
  }

type SeriesGroup = CheckCounts & { _id: number; avgMs: number | null }

/** Response times for the chart: raw checks in buckets (1h/24h) or daily rows (7d/30d). */
export async function getResponseSeries(
  monitorId: string,
  range: ChartRange,
  history: DayRow[]
): Promise<ResponseSeries> {
  const to = Date.now()
  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30
    const today = startOfUtcDay(new Date(to)).getTime()
    return {
      range,
      from: today - (days - 1) * DAY_MS,
      // End of today, so today's bucket is drawn whole.
      to: today + DAY_MS,
      bucketMs: DAY_MS,
      points: lastDays(history, days).map((row) => ({
        t: row.day,
        avgMs: row.avgResponseMs,
        p95Ms: row.p95ResponseMs,
        checks: row.total,
        failed: row.total - row.up,
      })),
    }
  }

  const { spanMs, bucketMs } = RAW_BUCKETS[range]
  const from = Math.floor((to - spanMs) / bucketMs) * bucketMs
  const groups = await CheckResult.aggregate<SeriesGroup>([
    {
      $match: {
        monitorId: new Types.ObjectId(monitorId),
        checkedAt: { $gte: new Date(from) },
      },
    },
    {
      $group: {
        _id: bucketIndex(new Date(from), bucketMs),
        ...COUNT_ACCUMULATORS,
        avgMs: { $avg: "$responseTimeMs" },
      },
    },
    { $sort: { _id: 1 } },
  ])
  return {
    range,
    from,
    to,
    bucketMs,
    points: groups.map((group) => ({
      t: from + group._id * bucketMs,
      avgMs: roundMs(group.avgMs),
      p95Ms: null,
      checks: group.total,
      failed: group.total - group.up,
    })),
  }
}

export type CheckRow = {
  id: string
  checkedAt: string
  status: CheckStatus
  statusCode: number | null
  responseTimeMs: number | null
  errorMessage: string | null
}

export type CheckPage = {
  rows: CheckRow[]
  /** Cursor for the next newer page, null when this is the newest. */
  newerCursor: string | null
  olderCursor: string | null
}

/**
 * Keyset pagination on {monitorId, checkedAt}: no skip/count scans, and new
 * checks arriving don't shift the pages.
 */
export async function getRecentChecks(
  monitorId: string,
  { before, after, failures }: MonitorDetailParams
): Promise<CheckPage> {
  const filter = {
    monitorId: new Types.ObjectId(monitorId),
    ...(failures && { isUp: false }),
  }
  const goingNewer = !before && Boolean(after)
  const cursor = goingNewer ? after : before
  const docs = await CheckResult.find({
    ...filter,
    ...(cursor && {
      checkedAt: goingNewer
        ? { $gt: new Date(cursor) }
        : { $lt: new Date(cursor) },
    }),
  })
    .sort({ checkedAt: goingNewer ? 1 : -1 })
    .limit(CHECKS_PAGE_SIZE + 1)
    .select("checkedAt status statusCode responseTimeMs errorMessage")
    .lean()

  const hasMore = docs.length > CHECKS_PAGE_SIZE
  const page = docs.slice(0, CHECKS_PAGE_SIZE)
  if (goingNewer) page.reverse()

  const rows = page.map((doc) => ({
    id: doc._id.toString(),
    checkedAt: doc.checkedAt.toISOString(),
    status: doc.status,
    statusCode: doc.statusCode ?? null,
    responseTimeMs: doc.responseTimeMs ?? null,
    errorMessage: doc.errorMessage ?? null,
  }))
  const newest = rows[0]?.checkedAt ?? null
  const oldest = rows.at(-1)?.checkedAt ?? null
  return {
    rows,
    newerCursor: (goingNewer ? hasMore : Boolean(cursor)) ? newest : null,
    olderCursor: (goingNewer ? true : hasMore) ? oldest : null,
  }
}
