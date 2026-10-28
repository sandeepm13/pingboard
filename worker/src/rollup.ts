import type { AnyBulkWriteOperation, Types } from "mongoose"

import { ROLLUP_LOOKBACK_DAYS } from "@shared/constants"
import { CheckResult } from "@shared/models/check-result"
import { DailyStat, type DailyStatDoc } from "@shared/models/daily-stat"
import {
  DAY_MS,
  startOfUtcDay,
  summarizeResponseTimes,
  uptimePercent,
} from "@shared/stats"

import type { Logger } from "./logger"

// Daily rollup: CheckResults of one UTC day → one DailyStat per monitor.
// Idempotent (upsert on monitorId + day), so a day can be recomputed any time
// before its raw results expire (30 days).

export type DayGroup = {
  _id: Types.ObjectId
  userId: Types.ObjectId
  totalChecks: number
  upChecks: number
  degradedChecks: number
  /** Includes nulls for checks without a response (timeouts, DNS errors). */
  responseTimes: (number | null)[]
}

export function summarizeDay(
  group: DayGroup,
  day: Date,
  computedAt: Date
): DailyStatDoc {
  const times = group.responseTimes.filter(
    (value): value is number => typeof value === "number"
  )
  return {
    monitorId: group._id,
    userId: group.userId,
    day,
    totalChecks: group.totalChecks,
    upChecks: group.upChecks,
    degradedChecks: group.degradedChecks,
    uptimePct: uptimePercent(group.upChecks, group.totalChecks),
    ...summarizeResponseTimes(times),
    computedAt,
  }
}

const BATCH_SIZE = 500

export async function rollupDay(date: Date): Promise<number> {
  const day = startOfUtcDay(date)
  const cursor = CheckResult.aggregate<DayGroup>([
    {
      $match: {
        checkedAt: { $gte: day, $lt: new Date(day.getTime() + DAY_MS) },
      },
    },
    {
      $group: {
        _id: "$monitorId",
        userId: { $first: "$userId" },
        totalChecks: { $sum: 1 },
        upChecks: { $sum: { $cond: ["$isUp", 1, 0] } },
        degradedChecks: {
          $sum: { $cond: [{ $eq: ["$status", "degraded"] }, 1, 0] },
        },
        responseTimes: { $push: "$responseTimeMs" },
      },
    },
  ]).cursor({ batchSize: 100 })

  const computedAt = new Date()
  let ops: AnyBulkWriteOperation<DailyStatDoc>[] = []
  let monitors = 0
  const flush = async () => {
    if (ops.length) await DailyStat.bulkWrite(ops, { ordered: false })
    ops = []
  }
  for await (const group of cursor) {
    const stat = summarizeDay(group, day, computedAt)
    ops.push({
      updateOne: {
        filter: { monitorId: stat.monitorId, day },
        update: { $set: stat },
        upsert: true,
      },
    })
    monitors++
    if (ops.length >= BATCH_SIZE) await flush()
  }
  await flush()
  return monitors
}

/** Recomputes the last ROLLUP_LOOKBACK_DAYS complete UTC days. */
export async function runDailyRollup(
  logger: Logger,
  now: Date = new Date()
): Promise<void> {
  const today = startOfUtcDay(now)
  for (let back = ROLLUP_LOOKBACK_DAYS; back >= 1; back--) {
    const day = new Date(today.getTime() - back * DAY_MS)
    const started = performance.now()
    const monitors = await rollupDay(day)
    logger.info(
      {
        day: day.toISOString().slice(0, 10),
        monitors,
        ms: Math.round(performance.now() - started),
      },
      "daily rollup done"
    )
  }
}
