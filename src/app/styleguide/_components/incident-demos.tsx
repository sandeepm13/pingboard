import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { ALERT_CHANNEL_TYPES, ALERT_DELIVERY_STATUSES } from "@shared/constants"
import { ChannelIcon } from "@/components/alerts/channel-icon"
import { DeliveryStatus } from "@/components/alerts/delivery-status"
import { IncidentDuration } from "@/components/incidents/incident-duration"
import { IncidentStateBadge } from "@/components/incidents/incident-state-badge"
import { IncidentTimeline } from "@/components/incidents/incident-timeline"
import { buildTimeline } from "@/lib/incident-timeline"

// Fixed timestamps: nothing here may depend on the clock (static prerender).
const timeline = buildTimeline({
  startedAt: "2026-10-26T05:12:00.000Z",
  confirmedAt: "2026-10-26T05:13:00.000Z",
  checksAtConfirm: 2,
  cause: "503 Service Unavailable",
  acknowledgedAt: "2026-10-26T05:15:30.000Z",
  resolvedAt: "2026-10-26T05:19:12.000Z",
  resolution: "recovered",
  durationSeconds: 432,
  alerts: [
    {
      kind: "down",
      status: "sent",
      channelType: "discord",
      channelName: "#ops",
      error: null,
      createdAt: "2026-10-26T05:13:01.000Z",
      sentAt: "2026-10-26T05:13:02.000Z",
    },
    {
      kind: "recovered",
      status: "sent",
      channelType: "email",
      channelName: "My email",
      error: null,
      createdAt: "2026-10-26T05:19:13.000Z",
      sentAt: "2026-10-26T05:19:14.000Z",
    },
  ],
})

export function IncidentDemos() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <IncidentStateBadge open resolution={null} />
        <IncidentStateBadge open={false} resolution="recovered" />
        <IncidentStateBadge open={false} resolution="paused" />
        <span className="text-sm text-muted-foreground">
          Duration:{" "}
          <IncidentDuration
            startedAt="2026-10-26T05:12:00.000Z"
            durationSeconds={432}
            open={false}
          />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {ALERT_DELIVERY_STATUSES.map((status) => (
          <DeliveryStatus key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {ALERT_CHANNEL_TYPES.map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <ChannelIcon type={type} />
            {CHANNEL_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
      <IncidentTimeline events={timeline} />
    </div>
  )
}
