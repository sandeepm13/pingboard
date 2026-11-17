import type { JobSchedulerJson, Queue } from "bullmq"

import { JOB_NAMES } from "./constants"
import type { MonitorStatus } from "./types"

// One BullMQ job scheduler per active monitor, keyed by the monitor id, on the
// "checks" queue. The app calls scheduleMonitor/unscheduleMonitor when a
// monitor changes; the worker reconciles all of them on boot and periodically.

export type CheckJobData = { monitorId: string }

export type ChecksQueue = Queue<CheckJobData>

export type SchedulableMonitor = {
  id: string
  status: MonitorStatus
  intervalMinutes: number
}

export function isScheduled(monitor: Pick<SchedulableMonitor, "status">) {
  return monitor.status !== "paused"
}

export function intervalMs(
  monitor: Pick<SchedulableMonitor, "intervalMinutes">
) {
  return monitor.intervalMinutes * 60_000
}

function checkJobTemplate(monitorId: string) {
  return {
    name: JOB_NAMES.check,
    data: { monitorId },
    opts: {
      // No BullMQ retries: a failed check is a normal result, and the
      // "2 failures in a row" rule is the retry.
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: { count: 500 },
    },
  }
}

/**
 * Creates or updates the monitor's scheduler (or removes it when paused).
 * A newly created scheduler runs its first check immediately; updating an
 * existing one keeps its rhythm. `restart` forces an immediate check, e.g.
 * after the URL changed.
 */
export async function scheduleMonitor(
  queue: ChecksQueue,
  monitor: SchedulableMonitor,
  options: { restart?: boolean } = {}
): Promise<void> {
  if (!isScheduled(monitor)) {
    await unscheduleMonitor(queue, monitor.id)
    return
  }
  if (options.restart) await queue.removeJobScheduler(monitor.id)
  await queue.upsertJobScheduler(
    monitor.id,
    { every: intervalMs(monitor) },
    checkJobTemplate(monitor.id)
  )
}

export async function unscheduleMonitor(
  queue: ChecksQueue,
  monitorId: string
): Promise<void> {
  await queue.removeJobScheduler(monitorId)
}

export type ReconcilePlan = {
  /** Missing, or scheduled with the wrong interval. */
  upsert: SchedulableMonitor[]
  /** Schedulers whose monitor is gone or paused. */
  remove: string[]
}

/** What to change so every active monitor has exactly one correct scheduler. */
export function planReconcile(
  monitors: readonly SchedulableMonitor[],
  schedulers: readonly Pick<JobSchedulerJson, "key" | "every">[]
): ReconcilePlan {
  const active = new Map(
    monitors.filter(isScheduled).map((monitor) => [monitor.id, monitor])
  )
  const existing = new Map(schedulers.map((s) => [s.key, s]))

  const upsert = [...active.values()].filter(
    (monitor) => existing.get(monitor.id)?.every !== intervalMs(monitor)
  )
  const remove = [...existing.keys()].filter((key) => !active.has(key))
  return { upsert, remove }
}
