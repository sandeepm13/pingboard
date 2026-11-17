import { nextReminderAt } from "@shared/alerts/events"
import { Incident } from "@shared/models/incident"
import { User } from "@shared/models/user"

import type { Logger } from "../logger"
import { enqueueAlert, type AlertsQueue } from "./queue"

/** Runs every minute on the alerts queue. */
export const REMINDER_TICK_MS = 60_000

const BATCH = 200

/**
 * Sends the "still down" reminders that are due. Each incident is claimed
 * with a filter on its current nextReminderAt, so two workers (or a slow
 * tick overlapping the next one) can't send the same reminder twice.
 */
export async function runReminderTick(
  queue: AlertsQueue,
  logger: Logger,
  now: Date = new Date()
): Promise<number> {
  const due = await Incident.find({
    open: true,
    acknowledgedAt: null,
    nextReminderAt: { $ne: null, $lte: now },
  })
    .select("userId nextReminderAt")
    .limit(BATCH)
    .lean()

  let sent = 0
  for (const incident of due) {
    // Read the setting now: the user may have turned reminders off meanwhile.
    const user = await User.findById(incident.userId)
      .select("alertReminderMinutes")
      .lean()
    const minutes = user?.alertReminderMinutes ?? 0
    const claimed = await Incident.findOneAndUpdate(
      {
        _id: incident._id,
        open: true,
        acknowledgedAt: null,
        nextReminderAt: incident.nextReminderAt,
      },
      {
        $set: { nextReminderAt: nextReminderAt(now, minutes) },
        ...(minutes > 0 && { $inc: { remindersSent: 1 } }),
      },
      { returnDocument: "after" }
    )
      .select("remindersSent")
      .lean()
    if (!claimed || minutes === 0) continue
    await enqueueAlert(queue, {
      kind: "reminder",
      incidentId: incident._id.toString(),
      reminder: claimed.remindersSent,
    })
    sent++
  }
  if (sent > 0) logger.info({ sent }, "reminders queued")
  return sent
}
