import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BackLink } from "@/components/common/back-link"
import { PageHeader } from "@/components/common/page-header"
import { FormSkeleton, PageHeaderSkeleton } from "@/components/common/skeletons"
import { MonitorForm } from "@/components/monitors/form/monitor-form"
import { MonitorEditActions } from "@/components/monitors/monitor-edit-actions"
import { StatusBadge } from "@/components/status/status-badge"
import { listAlertChannels } from "@/lib/alert-channels"
import { requireUser } from "@/lib/auth/require-user"
import { getEnv } from "@/lib/env"
import {
  findOwnedMonitor,
  toFormValues,
  usesAdvancedOptions,
} from "@/lib/monitors"

export const metadata: Metadata = { title: "Edit monitor" }

export default function Page({ params }: PageProps<"/app/monitors/[id]/edit">) {
  return (
    <div className="mx-auto max-w-3xl">
      <Suspense
        fallback={
          <>
            <PageHeaderSkeleton />
            <FormSkeleton />
          </>
        }
      >
        {params.then(({ id }) => (
          <EditMonitor id={id} />
        ))}
      </Suspense>
    </div>
  )
}

async function EditMonitor({ id }: { id: string }) {
  const user = await requireUser()
  // Scoped by userId: someone else's monitor is a plain 404.
  const monitor = await findOwnedMonitor(user.id, id)
  if (!monitor) notFound()

  const monitorId = monitor._id.toString()
  const values = toFormValues(monitor)
  const channels = await listAlertChannels(user.id)

  return (
    <>
      {/* After the ownership check, so the id in the href is a real monitor's. */}
      <BackLink href={`/app/monitors/${monitorId}`} label={monitor.name} />
      <PageHeader
        title={monitor.name}
        description={monitor.url}
        actions={
          <>
            <StatusBadge status={monitor.status} />
            <MonitorEditActions
              id={monitorId}
              name={monitor.name}
              paused={monitor.status === "paused"}
            />
          </>
        }
      />
      <MonitorForm
        // Remount after a save/pause so the form picks up fresh server values.
        key={`${monitorId}:${monitor.updatedAt?.toISOString() ?? ""}`}
        mode={{ kind: "edit", monitorId }}
        defaultValues={values}
        plan={user.plan}
        allowPrivate={getEnv().SSRF_ALLOW_PRIVATE}
        channels={channels}
        advancedOpenByDefault={usesAdvancedOptions(values)}
      />
    </>
  )
}
