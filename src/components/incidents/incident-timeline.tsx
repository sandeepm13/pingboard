import { cn } from "cn"

import { LocalTime } from "@/components/common/local-time"
import type { TimelineEvent, TimelineTone } from "@/lib/incident-timeline"

const DOT: Record<TimelineTone, string> = {
  down: "bg-down",
  up: "bg-up",
  warning: "bg-degraded",
  neutral: "bg-muted-foreground",
}

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <section
      aria-labelledby="timeline-heading"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <h2 id="timeline-heading" className="mb-4 text-lg font-semibold">
        Timeline
      </h2>
      <ol className="relative space-y-4 border-l pl-5">
        {events.map((event, index) => (
          <li key={index} className="relative">
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card",
                DOT[event.tone]
              )}
            />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <LocalTime
                iso={event.at}
                format="datetime-seconds"
                className="shrink-0 text-xs text-muted-foreground sm:w-40"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{event.title}</p>
                {event.detail && (
                  <p className="text-sm break-words text-muted-foreground">
                    {event.detail}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
