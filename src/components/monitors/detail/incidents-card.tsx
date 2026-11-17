import Link from "next/link"
import { ChevronRightIcon, SirenIcon } from "lucide-react"

import {
  IncidentCards,
  IncidentTable,
} from "@/components/incidents/incident-list"
import { Button } from "@/components/ui/button"
import type { CurrentUser } from "@/lib/auth/require-user"
import { listMonitorIncidents } from "@/lib/incidents"
import type { MonitorRecord } from "@/lib/monitors"

/** The monitor's latest incidents (ongoing first) on its page. */
export async function IncidentsCard({
  user,
  monitor,
}: {
  user: CurrentUser
  monitor: MonitorRecord
}) {
  const id = monitor._id.toString()
  const items = await listMonitorIncidents(user.id, id, monitor.name)

  return (
    <section
      aria-labelledby="incidents-heading"
      className="rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
        <h2 id="incidents-heading" className="text-lg font-semibold">
          Incidents
        </h2>
        {items.length > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link
              href={`/app/incidents?monitor=${id}&period=all`}
              prefetch={false}
            >
              All incidents
              <ChevronRightIcon aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="m-4 flex items-center gap-3 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground sm:m-5">
          <SirenIcon className="size-4 shrink-0" aria-hidden="true" />
          No incidents recorded. An outage (2 failed checks in a row) is listed
          here with its start, duration and cause.
        </div>
      ) : (
        <>
          <IncidentTable items={items} showMonitor={false} />
          <IncidentCards items={items} showMonitor={false} />
        </>
      )}
    </section>
  )
}
