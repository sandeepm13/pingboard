import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRightIcon, ShieldCheckIcon } from "lucide-react"

import { safeTimeZone } from "@shared/time"
import { EmptyState } from "@/components/common/empty-state"
import { LinkPending } from "@/components/common/link-pending"
import { PageHeader } from "@/components/common/page-header"
import { MonitorListSkeleton } from "@/components/common/skeletons"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { IncidentFilters } from "@/components/incidents/incident-filters"
import {
  IncidentCards,
  IncidentTable,
} from "@/components/incidents/incident-list"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/require-user"
import {
  incidentListParamsSchema,
  listIncidents,
  type IncidentListItem,
  type IncidentListParams,
} from "@/lib/incidents"

export const metadata: Metadata = { title: "Incidents" }

export default function Page({ searchParams }: PageProps<"/app/incidents">) {
  return (
    <>
      <PageHeader
        title="Incidents"
        description="Every outage across your monitors: when it started, how long it lasted and why."
      />
      <Suspense fallback={<MonitorListSkeleton />}>
        <Incidents searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Incidents({
  searchParams,
}: {
  searchParams: PageProps<"/app/incidents">["searchParams"]
}) {
  const user = await requireUser()
  const params = incidentListParamsSchema.parse(await searchParams)
  const data = await listIncidents(user.id, params, new Date())
  const empty = data.ongoing.length === 0 && data.resolved.length === 0

  return (
    <TimeZoneProvider timeZone={safeTimeZone(user.timezone)}>
      <IncidentFilters params={params} monitors={data.monitors} />
      {empty ? (
        <EmptyState
          icon={ShieldCheckIcon}
          title={params.before ? "No older incidents" : "No incidents here"}
          description={
            data.monitors.length === 0
              ? "Add a monitor and PingBoard will record every outage here."
              : "Nothing went down for this filter. An incident starts after 2 failed checks in a row."
          }
        />
      ) : (
        <div className="space-y-6">
          {data.ongoing.length > 0 && (
            <IncidentSection title="Ongoing" items={data.ongoing} />
          )}
          {(data.resolved.length > 0 || params.state === "resolved") && (
            <IncidentSection
              title="Resolved"
              items={data.resolved}
              footer={<Pager params={params} olderCursor={data.olderCursor} />}
            />
          )}
        </div>
      )}
    </TimeZoneProvider>
  )
}

function IncidentSection({
  title,
  items,
  footer,
}: {
  title: string
  items: IncidentListItem[]
  footer?: React.ReactNode
}) {
  const id = `incidents-${title.toLowerCase()}`
  return (
    <section aria-labelledby={id} className="rounded-xl border bg-card">
      <h2 id={id} className="border-b p-4 text-lg font-semibold sm:px-5">
        {title}{" "}
        <span className="font-mono text-sm font-normal text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No resolved incidents in this period.
        </p>
      ) : (
        <>
          <IncidentTable items={items} />
          <IncidentCards items={items} />
        </>
      )}
      {footer}
    </section>
  )
}

function Pager({
  params,
  olderCursor,
}: {
  params: IncidentListParams
  olderCursor: string | null
}) {
  if (!olderCursor && !params.before) return null
  const href = (before?: string) => {
    const query = new URLSearchParams()
    if (params.monitor) query.set("monitor", params.monitor)
    if (params.period !== "30d") query.set("period", params.period)
    if (params.state !== "all") query.set("state", params.state)
    if (before) query.set("before", before)
    const qs = query.toString()
    return qs ? `/app/incidents?${qs}` : "/app/incidents"
  }
  return (
    <nav
      aria-label="Incident pages"
      className="flex items-center justify-between gap-2 border-t p-3 sm:px-5"
    >
      {params.before ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={href()} prefetch={false} scroll={false}>
            Latest
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {olderCursor ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(olderCursor)} prefetch={false} scroll={false}>
            Older
            <ChevronRightIcon aria-hidden="true" />
            <LinkPending />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Older
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      )}
    </nav>
  )
}
