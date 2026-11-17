import { Suspense } from "react"
import type { Metadata } from "next"

import { planLimits } from "@shared/plans"
import { PageHeader } from "@/components/common/page-header"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { DashboardLive } from "@/components/dashboard/dashboard-live"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { DraftMonitorNotice } from "@/components/monitors/draft-monitor-notice"
import { requireUser } from "@/lib/auth/require-user"
import { getDashboard } from "@/lib/dashboard"

export const metadata: Metadata = { title: "Dashboard" }

export default function Page() {
  return (
    <>
      <PageHeader
        title="Monitors"
        description="Live status of everything you're watching."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </>
  )
}

async function Dashboard() {
  const user = await requireUser()
  const data = await getDashboard(user)
  const limits = planLimits(user.plan)

  return (
    <TimeZoneProvider timeZone={data.timeZone}>
      {user.draftMonitor && <DraftMonitorNotice draft={user.draftMonitor} />}
      <DashboardLive initialData={data} />
      {data.monitors.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">
            {data.monitors.length} / {limits.maxMonitors}
          </span>{" "}
          monitors on the {limits.label} plan · times in {data.timeZone}
        </p>
      )}
    </TimeZoneProvider>
  )
}
