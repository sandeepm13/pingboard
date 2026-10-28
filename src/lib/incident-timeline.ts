import { ALERT_KIND_LABELS, CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { formatDuration } from "@shared/time"
import type { AlertDeliveryStatus, IncidentResolution } from "@shared/types"

// The incident page's timeline, as plain data (pure, unit-tested).

export type TimelineTone = "down" | "up" | "warning" | "neutral"

export type TimelineEvent = {
  at: string
  title: string
  detail: string | null
  tone: TimelineTone
}

export type TimelineInput = {
  startedAt: string
  confirmedAt: string
  checksAtConfirm: number
  cause: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  resolution: IncidentResolution | null
  durationSeconds: number | null
  alerts: {
    kind: keyof typeof ALERT_KIND_LABELS
    status: AlertDeliveryStatus
    channelType: keyof typeof CHANNEL_TYPE_LABELS
    channelName: string
    error: string | null
    createdAt: string
    sentAt: string | null
  }[]
}

const DELIVERY_WORDS: Record<AlertDeliveryStatus, string> = {
  queued: "queued",
  retrying: "retrying",
  sent: "sent",
  failed: "failed",
  skipped: "skipped",
}

const RESOLUTION_TITLES: Record<IncidentResolution, string> = {
  recovered: "Recovered — back up",
  paused: "Closed — monitor paused",
  changed: "Closed — monitor URL changed",
}

export function buildTimeline(input: TimelineInput): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      at: input.startedAt,
      title: "First failed check",
      detail: input.cause,
      tone: "down",
    },
    {
      at: input.confirmedAt,
      title: "Marked down",
      detail: `After ${input.checksAtConfirm} failed checks in a row`,
      tone: "down",
    },
  ]
  for (const alert of input.alerts) {
    const kind = ALERT_KIND_LABELS[alert.kind]
    events.push({
      at: alert.sentAt ?? alert.createdAt,
      title: `${kind} alert ${DELIVERY_WORDS[alert.status]} · ${CHANNEL_TYPE_LABELS[alert.channelType]}`,
      detail: alert.error
        ? `${alert.channelName}: ${alert.error}`
        : alert.channelName,
      tone:
        alert.status === "failed"
          ? "down"
          : alert.status === "sent"
            ? "neutral"
            : "warning",
    })
  }
  if (input.acknowledgedAt) {
    events.push({
      at: input.acknowledgedAt,
      title: "Acknowledged",
      detail: "Reminders stopped",
      tone: "neutral",
    })
  }
  if (input.resolvedAt && input.resolution) {
    events.push({
      at: input.resolvedAt,
      title: RESOLUTION_TITLES[input.resolution],
      detail:
        input.durationSeconds !== null
          ? `Lasted ${formatDuration(input.durationSeconds)}`
          : null,
      tone: input.resolution === "recovered" ? "up" : "neutral",
    })
  }
  // Stable sort: same-instant events keep the order above.
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (a, b) =>
        Date.parse(a.event.at) - Date.parse(b.event.at) || a.index - b.index
    )
    .map(({ event }) => event)
}
