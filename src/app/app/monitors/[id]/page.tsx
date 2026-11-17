import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { safeTimeZone } from "@shared/time"
import { BackLink } from "@/components/common/back-link"
import {
  ChartSkeleton,
  PageHeaderSkeleton,
  StatCardSkeleton,
} from "@/components/common/skeletons"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { IncidentsCard } from "@/components/monitors/detail/incidents-card"
import { MonitorDetailHeader } from "@/components/monitors/detail/monitor-detail-header"
import {
  MonitorStatCards,
  STAT_GRID,
} from "@/components/monitors/detail/monitor-stat-cards"
import { RecentChecksCard } from "@/components/monitors/detail/recent-checks-card"
import { ResponseChartCard } from "@/components/monitors/detail/response-chart-card"
import { UptimeHistoryCard } from "@/components/monitors/detail/uptime-history-card"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth/require-user"
import { monitorDetailParamsSchema } from "@/lib/monitor-stats"
import { findOwnedMonitor } from "@/lib/monitors"

export const metadata: Metadata = { title: "Monitor" }

export default function Page({
  params,
  searchParams,
}: PageProps<"/app/monitors/[id]">) {
  return (
    <>
      <BackLink href="/app" label="Monitors" />
      <Suspense fallback={<DetailSkeleton />}>
        {params.then(({ id }) => (
          <MonitorDetail id={id} searchParams={searchParams} />
        ))}
      </Suspense>
    </>
  )
}

async function MonitorDetail({
  id,
  searchParams,
}: {
  id: string
  searchParams: PageProps<"/app/monitors/[id]">["searchParams"]
}) {
  const user = await requireUser()
  // Scoped by userId: someone else's monitor is a plain 404. Every section
  // below only receives this owned record.
  const monitor = await findOwnedMonitor(user.id, id)
  if (!monitor) notFound()
  const query = monitorDetailParamsSchema.parse(await searchParams)

  return (
    <TimeZoneProvider timeZone={safeTimeZone(user.timezone)}>
      <MonitorDetailHeader monitor={monitor} />
      <div className="space-y-6">
        <Suspense fallback={<StatsSkeleton />}>
          <MonitorStatCards monitor={monitor} />
        </Suspense>
        <Suspense fallback={<ChartSkeleton className="h-[22rem]" />}>
          <ResponseChartCard monitor={monitor} params={query} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-36 w-full rounded-xl" />}>
          <UptimeHistoryCard monitor={monitor} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <RecentChecksCard monitor={monitor} params={query} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
          <IncidentsCard user={user} monitor={monitor} />
        </Suspense>
        <p className="text-xs text-muted-foreground">
          Times in {safeTimeZone(user.timezone)}. Daily figures (7d, 30d, 90
          days) use UTC days.
        </p>
      </div>
    </TimeZoneProvider>
  )
}

function StatsSkeleton() {
  return (
    <div className={STAT_GRID}>
      {Array.from({ length: 7 }, (_, i) => (
        <StatCardSkeleton
          key={i}
          className={i === 6 ? "col-span-2" : undefined}
        />
      ))}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <StatsSkeleton />
      <ChartSkeleton className="h-[22rem]" />
    </div>
  )
}
