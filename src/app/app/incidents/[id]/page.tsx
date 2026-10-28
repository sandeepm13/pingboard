import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BellOffIcon } from "lucide-react"

import { DEFAULT_FAILURE_THRESHOLD } from "@shared/constants"
import { safeTimeZone } from "@shared/time"
import { BackLink } from "@/components/common/back-link"
import { LocalTime } from "@/components/common/local-time"
import {
  PageHeaderSkeleton,
  StatCardSkeleton,
} from "@/components/common/skeletons"
import { StatCard } from "@/components/common/stat-card"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { AcknowledgeButton } from "@/components/incidents/acknowledge-button"
import { IncidentDuration } from "@/components/incidents/incident-duration"
import { IncidentNotes } from "@/components/incidents/incident-notes"
import { IncidentStateBadge } from "@/components/incidents/incident-state-badge"
import { IncidentTimeline } from "@/components/incidents/incident-timeline"
import { CheckList, CheckTable } from "@/components/monitors/detail/check-rows"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth/require-user"
import { buildTimeline } from "@/lib/incident-timeline"
import {
  INCIDENT_CHECKS_LIMIT,
  getIncidentDetail,
  type IncidentDetail,
} from "@/lib/incidents"

export const metadata: Metadata = { title: "Incident" }

export default function Page({ params }: PageProps<"/app/incidents/[id]">) {
  return (
    <>
      <BackLink href="/app/incidents" label="Incidents" />
      <Suspense fallback={<DetailSkeleton />}>
        {params.then(({ id }) => (
          <Incident id={id} />
        ))}
      </Suspense>
    </>
  )
}

async function Incident({ id }: { id: string }) {
  const user = await requireUser()
  // Scoped by userId: someone else's incident is a plain 404.
  const detail = await getIncidentDetail(user.id, id, new Date())
  if (!detail) notFound()
  const { incident, monitor } = detail

  return (
    <TimeZoneProvider timeZone={safeTimeZone(user.timezone)}>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {incident.monitorName || "Deleted monitor"} outage
            </h1>
            <IncidentStateBadge
              open={incident.open}
              resolution={incident.resolution}
            />
          </div>
          {monitor && (
            <p className="truncate font-mono text-sm text-muted-foreground">
              <Link
                href={`/app/monitors/${monitor.id}`}
                className="hover:text-foreground hover:underline"
              >
                {monitor.url}
              </Link>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {incident.open && !incident.acknowledgedAt && (
            <AcknowledgeButton id={incident.id} />
          )}
          {incident.open && incident.acknowledgedAt && (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <BellOffIcon className="size-4" aria-hidden="true" />
              Acknowledged <LocalTime iso={incident.acknowledgedAt} />
            </p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Started"
            value={<LocalTime iso={incident.startedAt} format="time" />}
            hint={
              <>
                <LocalTime iso={incident.startedAt} format="date" /> · first
                failed check
              </>
            }
          />
          <StatCard
            label={incident.open ? "Down for" : "Duration"}
            value={
              <IncidentDuration
                startedAt={incident.startedAt}
                durationSeconds={incident.durationSeconds}
                open={incident.open}
              />
            }
            hint={
              incident.resolvedAt ? (
                <>
                  Ended <LocalTime iso={incident.resolvedAt} />
                </>
              ) : (
                "Still down"
              )
            }
          />
          <StatCard
            label="Cause"
            value={
              <span className="text-base sm:text-lg" title={incident.cause}>
                {incident.cause}
              </span>
            }
            hint="First failed check"
          />
          <StatCard
            label="Failed checks"
            value={incident.checksFailed}
            hint={
              incident.remindersSent
                ? `${incident.remindersSent} reminder${incident.remindersSent === 1 ? "" : "s"} sent`
                : undefined
            }
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <IncidentTimeline
            events={buildTimeline({
              ...incident,
              checksAtConfirm: DEFAULT_FAILURE_THRESHOLD,
              alerts: detail.alerts,
            })}
          />
          <IncidentNotes id={incident.id} initial={incident.notes} />
        </div>

        <FailedChecks detail={detail} />
      </div>
    </TimeZoneProvider>
  )
}

function FailedChecks({ detail }: { detail: IncidentDetail }) {
  const { checks, incident } = detail
  return (
    <section
      aria-labelledby="failed-checks-heading"
      className="rounded-xl border bg-card"
    >
      <div className="border-b p-4 sm:px-5">
        <h2 id="failed-checks-heading" className="text-lg font-semibold">
          Failed checks
        </h2>
        <p className="text-sm text-muted-foreground">
          {incident.checksFailed > checks.length &&
          checks.length === INCIDENT_CHECKS_LIMIT
            ? `The latest ${INCIDENT_CHECKS_LIMIT} of ${incident.checksFailed}.`
            : "Newest first."}{" "}
          Raw checks are kept for 30 days.
        </p>
      </div>
      {checks.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          These checks are older than 30 days and were removed.
        </p>
      ) : (
        <>
          <CheckTable rows={checks} />
          <CheckList rows={checks} />
        </>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
