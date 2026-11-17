import "server-only"

import { Types } from "mongoose"

import { CheckResult } from "@shared/models/check-result"
import { slotStatus, uptimePercent, type CheckCounts } from "@shared/stats"
import { HOUR_MS, safeTimeZone, startOfHourIn } from "@shared/time"
import type { UptimeSlot } from "@shared/types"
import { COUNT_ACCUMULATORS, bucketIndex } from "@/lib/check-buckets"
import { listMonitors, type MonitorListItem } from "@/lib/monitors"

// Everything /app shows, in two queries: the user's monitors, and one
// aggregation over the last 24 h of their checks ({monitorId, checkedAt}
// index) grouped by monitor and local hour.

export const DASHBOARD_SLOTS = 24

export type DashboardMonitor = MonitorListItem & {
  uptime24h: number | null
  checks24h: number
  /** One per local hour, oldest first; the last one is the current hour. */
  slots: UptimeSlot[]
}

export type DashboardSummary = {
  total: number
  up: number
  down: number
  degraded: number
  paused: number
  pending: number
  /** Mean of every response in the last 24 h, across all monitors. */
  avgResponseMs: number | null
  uptime24h: number | null
}

export type DashboardData = {
  generatedAt: string
  timeZone: string
  summary: DashboardSummary
  /** Down monitors first, then newest first. */
  monitors: DashboardMonitor[]
}

type HourGroup = CheckCounts & {
  _id: { monitorId: Types.ObjectId; bucket: number }
  responseMsSum: number
  responseCount: number
}

function emptyCounts(): CheckCounts {
  return { total: 0, up: 0, degraded: 0 }
}

function addCounts(target: CheckCounts, group: CheckCounts) {
  target.total += group.total
  target.up += group.up
  target.degraded += group.degraded
}

export async function getDashboard(user: {
  id: string
  timezone: string
}): Promise<DashboardData> {
  const timeZone = safeTimeZone(user.timezone)
  const monitors = await listMonitors(user.id)
  const now = new Date()
  // Slot 0 starts 23 h before the current local hour. Checks between now−24 h
  // and slot 0 land in bucket −1: counted in the 24 h totals, not drawn.
  const firstSlot = new Date(
    startOfHourIn(now, timeZone).getTime() - (DASHBOARD_SLOTS - 1) * HOUR_MS
  )

  const groups = monitors.length
    ? await CheckResult.aggregate<HourGroup>([
        {
          $match: {
            monitorId: { $in: monitors.map((m) => new Types.ObjectId(m.id)) },
            checkedAt: { $gte: new Date(now.getTime() - 24 * HOUR_MS) },
          },
        },
        {
          $group: {
            _id: {
              monitorId: "$monitorId",
              bucket: bucketIndex(firstSlot, HOUR_MS),
            },
            ...COUNT_ACCUMULATORS,
            responseMsSum: { $sum: { $ifNull: ["$responseTimeMs", 0] } },
            responseCount: {
              $sum: { $cond: [{ $isNumber: "$responseTimeMs" }, 1, 0] },
            },
          },
        },
      ])
    : []

  const byMonitor = new Map<string, Map<number, HourGroup>>()
  const overall = emptyCounts()
  let responseMsSum = 0
  let responseCount = 0
  for (const group of groups) {
    const key = group._id.monitorId.toString()
    const buckets = byMonitor.get(key) ?? new Map<number, HourGroup>()
    buckets.set(group._id.bucket, group)
    byMonitor.set(key, buckets)
    addCounts(overall, group)
    responseMsSum += group.responseMsSum
    responseCount += group.responseCount
  }

  const rows = monitors.map((monitor): DashboardMonitor => {
    const buckets = byMonitor.get(monitor.id)
    const totals = emptyCounts()
    for (const group of buckets?.values() ?? []) addCounts(totals, group)
    const slots = Array.from({ length: DASHBOARD_SLOTS }, (_, i) => {
      const group = buckets?.get(i)
      return {
        start: new Date(firstSlot.getTime() + i * HOUR_MS).toISOString(),
        status: group ? slotStatus(group) : null,
        uptime: group ? uptimePercent(group.up, group.total) : null,
        checks: group?.total ?? 0,
      }
    })
    return {
      ...monitor,
      uptime24h: uptimePercent(totals.up, totals.total),
      checks24h: totals.total,
      slots,
    }
  })
  // Stable sort: down monitors float up, everything else keeps its order.
  rows.sort((a, b) => Number(b.status === "down") - Number(a.status === "down"))

  const count = (status: MonitorListItem["status"]) =>
    monitors.filter((m) => m.status === status).length

  return {
    generatedAt: now.toISOString(),
    timeZone,
    summary: {
      total: monitors.length,
      up: count("up"),
      down: count("down"),
      degraded: count("degraded"),
      paused: count("paused"),
      pending: count("pending"),
      avgResponseMs: responseCount
        ? Math.round(responseMsSum / responseCount)
        : null,
      uptime24h: uptimePercent(overall.up, overall.total),
    },
    monitors: rows,
  }
}
