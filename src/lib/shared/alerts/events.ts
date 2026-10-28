import { SSL_ALERT_DAYS } from "../constants"
import type { AlertChannelType, AlertKind } from "../types"
import type { AlertEvent } from "./types"

// Identity of alert events. The same event always gets the same key, which is
// used as the BullMQ job id (no ":" allowed) and, with the channel id, as the
// AlertLog dedupeKey: an event is delivered at most once per channel.

export function alertEventKey(event: AlertEvent): string {
  switch (event.kind) {
    case "down":
    case "recovered":
      return `${event.kind}-${event.incidentId}`
    case "reminder":
      return `reminder-${event.incidentId}-${event.reminder}`
    case "ssl":
      return `ssl-${event.monitorId}-${Date.parse(event.expiresAt)}-${event.thresholdDays}`
    case "degraded":
      return `degraded-${event.monitorId}-${Date.parse(event.checkedAt)}`
  }
}

export function deliveryKey(eventKey: string, channelId: string): string {
  return `${eventKey}-${channelId}`
}

/**
 * The SSL_ALERT_DAYS threshold a certificate is inside (the smallest one that
 * applies), or null when it's further away. Expired certificates count as 3.
 */
export function sslAlertThreshold(daysLeft: number): number | null {
  let hit: number | null = null
  for (const days of SSL_ALERT_DAYS) {
    if (daysLeft <= days) hit = days
  }
  return hit
}

/** When the next "still down" reminder is due, or null when reminders are off. */
export function nextReminderAt(
  from: Date,
  reminderMinutes: number
): Date | null {
  return reminderMinutes > 0
    ? new Date(from.getTime() + reminderMinutes * 60_000)
    : null
}

export const CHANNEL_TYPE_LABELS: Record<AlertChannelType, string> = {
  email: "Email",
  discord: "Discord",
  slack: "Slack",
  telegram: "Telegram",
}

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  down: "Down",
  recovered: "Recovered",
  reminder: "Still down",
  ssl: "SSL expiry",
  degraded: "Slow",
  test: "Test",
}
