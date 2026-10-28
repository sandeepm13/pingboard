import { percentile } from "@shared/stats"

// How late checks start compared with when they were due. If the worker can't
// keep up (too little concurrency, slow targets hogging slots), this grows;
// logged once a minute so a load problem shows up in the logs.

export const LAG_REPORT_INTERVAL_MS = 60_000

/**
 * When the job was due. Scheduler jobs are named "repeat:<schedulerId>:<ms>"
 * where <ms> is the slot they were created for; anything else falls back to
 * creation time + delay.
 */
export function dueAt(job: {
  id?: string | null
  timestamp: number
  delay?: number
}): number {
  const slot = job.id?.match(/^repeat:.+:(\d+)$/)?.[1]
  return slot ? Number(slot) : job.timestamp + (job.delay ?? 0)
}

export type LagSummary = {
  checks: number
  avgLagMs: number
  p95LagMs: number
  maxLagMs: number
}

export class LagStats {
  private samples: number[] = []

  record(lagMs: number) {
    this.samples.push(Math.max(0, Math.round(lagMs)))
  }

  /** Summary of the samples since the last call, then starts over. */
  flush(): LagSummary | null {
    const sorted = this.samples.sort((a, b) => a - b)
    this.samples = []
    if (sorted.length === 0) return null
    const sum = sorted.reduce((total, value) => total + value, 0)
    return {
      checks: sorted.length,
      avgLagMs: Math.round(sum / sorted.length),
      p95LagMs: percentile(sorted, 95) ?? 0,
      maxLagMs: sorted[sorted.length - 1] ?? 0,
    }
  }
}
