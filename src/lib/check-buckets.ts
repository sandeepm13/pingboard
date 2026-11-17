import "server-only"

// Aggregation building blocks for CheckResult queries. Bucketing is done with
// plain arithmetic from a start instant (computed in JS), so the buckets match
// the slots the UI draws exactly, whatever the user's time zone.

/** Index of the fixed-size bucket a check falls in, counted from `from` (−1 = before it). */
export function bucketIndex(from: Date, sizeMs: number) {
  return {
    $floor: { $divide: [{ $subtract: ["$checkedAt", from] }, sizeMs] },
  }
}

/** $group accumulators matching shared/stats.ts CheckCounts. */
export const COUNT_ACCUMULATORS = {
  total: { $sum: 1 },
  up: { $sum: { $cond: ["$isUp", 1, 0] } },
  degraded: { $sum: { $cond: [{ $eq: ["$status", "degraded"] }, 1, 0] } },
}

/** p95 of response times; $percentile skips nulls (timeouts, DNS errors). */
export function p95Accumulator(input: unknown = "$responseTimeMs") {
  return {
    $percentile: { input, p: [0.95], method: "approximate" as const },
  }
}

export function roundMs(value: number | null | undefined): number | null {
  return typeof value === "number" ? Math.round(value) : null
}
