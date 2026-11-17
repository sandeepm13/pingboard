import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import type { PublicIncident } from "@shared/status-page"
import { LocalTime } from "@/components/common/local-time"
import { IncidentDuration } from "@/components/incidents/incident-duration"

/** Ongoing outages and those resolved in the last 14 days. No causes or error text. */
export function PublicIncidents({
  incidents,
}: {
  incidents: PublicIncident[]
}) {
  return (
    <section aria-labelledby="past-incidents" className="space-y-3">
      <h2 id="past-incidents" className="text-lg font-semibold">
        Past incidents
      </h2>
      {incidents.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No incidents in the last {STATUS_PAGE_LIMITS.incidentDays} days.
        </p>
      ) : (
        <ol className="divide-y rounded-xl border bg-card">
          {incidents.map((incident) => (
            <IncidentItem key={incident.key} incident={incident} />
          ))}
        </ol>
      )}
    </section>
  )
}

function IncidentItem({ incident }: { incident: PublicIncident }) {
  const Icon = incident.ongoing ? CircleXIcon : CircleCheckIcon
  return (
    <li className="flex gap-3 p-4">
      <Icon
        aria-hidden="true"
        className={
          incident.ongoing
            ? "mt-0.5 size-4 shrink-0 text-down"
            : "mt-0.5 size-4 shrink-0 text-up"
        }
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">
          {incident.serviceName} {incident.ongoing ? "is down" : "was down"}
        </p>
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <div className="flex gap-1.5">
            <dt>{incident.ongoing ? "Ongoing for" : "Duration"}</dt>
            <dd>
              <IncidentDuration
                startedAt={incident.startedAt}
                durationSeconds={incident.durationSeconds}
                open={incident.ongoing}
                className="text-foreground"
              />
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt>Started</dt>
            <dd>
              <LocalTime iso={incident.startedAt} />
            </dd>
          </div>
          {incident.resolvedAt && (
            <div className="flex gap-1.5">
              <dt>Resolved</dt>
              <dd>
                <LocalTime iso={incident.resolvedAt} />
              </dd>
            </div>
          )}
        </dl>
      </div>
    </li>
  )
}
