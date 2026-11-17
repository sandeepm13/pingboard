import Link from "next/link"

import { ALERT_KIND_LABELS, CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { LocalTime } from "@/components/common/local-time"
import type { AlertLogItem } from "@/lib/alert-channels"

import { ChannelIcon } from "./channel-icon"
import { DeliveryStatus } from "./delivery-status"

/** The latest deliveries (all channels), newest first. */
export function AlertLogCard({ rows }: { rows: AlertLogItem[] }) {
  return (
    <section
      aria-labelledby="alert-log-heading"
      className="rounded-xl border bg-card"
    >
      <div className="border-b p-4 sm:px-5">
        <h2 id="alert-log-heading" className="text-lg font-semibold">
          Recent alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          Every alert PingBoard sent or tried to send, per channel.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          No alerts sent yet. Use “Send test alert” to try a channel.
        </p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr_auto] sm:items-center sm:gap-4 sm:px-5"
            >
              <LocalTime
                iso={row.sentAt ?? row.createdAt}
                format="datetime-seconds"
                className="text-xs text-muted-foreground"
              />
              <div className="min-w-0">
                <p className="truncate">
                  <span className="mr-2 rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                    {ALERT_KIND_LABELS[row.kind]}
                  </span>
                  {row.incidentId ? (
                    <Link
                      href={`/app/incidents/${row.incidentId}`}
                      prefetch={false}
                      className="hover:underline"
                    >
                      {row.title}
                    </Link>
                  ) : (
                    row.title
                  )}
                </p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <ChannelIcon type={row.channelType} className="size-3.5" />
                  <span className="truncate">
                    {row.channelName} · {CHANNEL_TYPE_LABELS[row.channelType]}
                  </span>
                </p>
                {row.error && (
                  <p className="mt-1 text-xs break-words text-down">
                    {row.error}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <DeliveryStatus status={row.status} />
                {row.attempts > 1 && (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {row.attempts} tries
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
