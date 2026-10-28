import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { GaugeIcon } from "lucide-react"

import { planLimits } from "@shared/plans"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { FormSkeleton } from "@/components/common/skeletons"
import { MonitorForm } from "@/components/monitors/form/monitor-form"
import { Button } from "@/components/ui/button"
import { listAlertChannels } from "@/lib/alert-channels"
import { requireUser } from "@/lib/auth/require-user"
import { getEnv } from "@/lib/env"
import { countMonitors, newMonitorDefaults } from "@/lib/monitors"

export const metadata: Metadata = { title: "New monitor" }

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New monitor"
        description="Tell PingBoard what to check and how often. Use Test now to try it before saving."
      />
      <Suspense fallback={<FormSkeleton />}>
        <NewMonitor />
      </Suspense>
    </div>
  )
}

async function NewMonitor() {
  const user = await requireUser()
  const limits = planLimits(user.plan)

  if ((await countMonitors(user.id)) >= limits.maxMonitors) {
    return (
      <EmptyState
        icon={GaugeIcon}
        title={`You've used all ${limits.maxMonitors} monitors`}
        description={`That's the limit on the ${limits.label} plan. Delete a monitor you no longer need to add a new one.`}
        action={
          <Button asChild variant="outline">
            <Link href="/app">Back to monitors</Link>
          </Button>
        }
      />
    )
  }

  const channels = await listAlertChannels(user.id)

  return (
    <>
      {user.draftMonitor && (
        <p className="mb-4 text-sm text-muted-foreground">
          Filled in from the URL you added during sign-up.
        </p>
      )}
      <MonitorForm
        mode={{ kind: "create", fromDraft: Boolean(user.draftMonitor) }}
        defaultValues={newMonitorDefaults(user.plan, user.draftMonitor)}
        plan={user.plan}
        allowPrivate={getEnv().SSRF_ALLOW_PRIVATE}
        channels={channels}
      />
    </>
  )
}
