import type { Queue } from "bullmq"

import { alertEventKey } from "@shared/alerts/events"
import type { AlertDeliverJob, AlertEvent } from "@shared/alerts/types"
import { ALERT_LIMITS, JOB_NAMES } from "@shared/constants"

// The "alerts" queue: dispatch (one per event) → deliver (one per channel).
// Separate from "checks", so a slow mail server never delays a check.

export type ReminderTickJob = { tick: true }
export type AlertsJobData = AlertEvent | AlertDeliverJob | ReminderTickJob
export type AlertsQueue = Queue<AlertsJobData>

const KEEP = {
  // Kept for a week so a duplicate event (same job id) is ignored by BullMQ.
  removeOnComplete: { age: 7 * 24 * 60 * 60 },
  removeOnFail: { count: 1_000 },
}

/** Queues one alert event. Same event twice = one job (job id = event key). */
export async function enqueueAlert(queue: AlertsQueue, event: AlertEvent) {
  await queue.add(JOB_NAMES.alertDispatch, event, {
    jobId: alertEventKey(event),
    // Dispatch only touches our DB/Redis; retry infra hiccups quickly.
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    ...KEEP,
  })
}

export async function enqueueDelivery(
  queue: AlertsQueue,
  alertLogId: string,
  dedupeKey: string
) {
  await queue.add(
    JOB_NAMES.alertDeliver,
    { alertLogId },
    {
      jobId: dedupeKey,
      // First try + 3 retries: 30 s, 1 min, 2 min.
      attempts: ALERT_LIMITS.deliveryAttempts,
      backoff: { type: "exponential", delay: ALERT_LIMITS.retryDelayMs },
      ...KEEP,
    }
  )
}
