import { Monitor } from "@shared/models/monitor"
import {
  isScheduled,
  planReconcile,
  scheduleMonitor,
  unscheduleMonitor,
  type ChecksQueue,
  type SchedulableMonitor,
} from "@shared/scheduler"

import type { Logger } from "./logger"

/** Re-run while the worker is up, to repair changes the app couldn't push. */
export const RECONCILE_INTERVAL_MS = 10 * 60 * 1000

/**
 * Makes Redis match MongoDB: every active monitor has exactly one scheduler
 * (keyed by its id) with the right interval, and no scheduler exists for a
 * deleted or paused monitor.
 */
export async function reconcileSchedules(
  queue: ChecksQueue,
  logger: Logger
): Promise<{ upserted: number; removed: number; active: number }> {
  const [monitors, schedulers] = await Promise.all([
    Monitor.find({}, { status: 1, intervalMinutes: 1 }).lean(),
    queue.getJobSchedulers(0, -1),
  ])
  const desired: SchedulableMonitor[] = monitors.map((monitor) => ({
    id: monitor._id.toString(),
    status: monitor.status,
    intervalMinutes: monitor.intervalMinutes,
  }))
  const plan = planReconcile(desired, schedulers)

  for (const monitor of plan.upsert) await scheduleMonitor(queue, monitor)
  for (const id of plan.remove) await unscheduleMonitor(queue, id)

  const result = {
    upserted: plan.upsert.length,
    removed: plan.remove.length,
    active: desired.filter(isScheduled).length,
  }
  logger.info(result, "schedules reconciled")
  return result
}
