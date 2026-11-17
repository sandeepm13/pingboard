import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { GlobeIcon } from "lucide-react"

import { planLimits } from "@shared/plans"
import { BackLink } from "@/components/common/back-link"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { FormSkeleton } from "@/components/common/skeletons"
import { StatusPageForm } from "@/components/status-pages/status-page-form"
import { Button } from "@/components/ui/button"
import { requireUser } from "@/lib/auth/require-user"
import { getEnv } from "@/lib/env"
import { listMonitors } from "@/lib/monitors"
import { countStatusPages, newStatusPageDefaults } from "@/lib/status-pages"

export const metadata: Metadata = { title: "New status page" }

export default function Page() {
  return (
    <>
      <BackLink href="/app/status-pages" label="Status pages" />
      <PageHeader
        title="New status page"
        description="Nothing is public until you turn on Public and save."
      />
      <Suspense fallback={<FormSkeleton />}>
        <NewStatusPage />
      </Suspense>
    </>
  )
}

async function NewStatusPage() {
  const user = await requireUser()
  const [count, monitors] = await Promise.all([
    countStatusPages(user.id),
    listMonitors(user.id),
  ])
  const { maxStatusPages, label } = planLimits(user.plan)

  if (count >= maxStatusPages) {
    return (
      <EmptyState
        icon={GlobeIcon}
        title="Status page limit reached"
        description={`The ${label} plan includes ${maxStatusPages} status ${maxStatusPages === 1 ? "page" : "pages"}. Delete one to create another.`}
        action={
          <Button asChild variant="outline">
            <Link href="/app/status-pages">Back to status pages</Link>
          </Button>
        }
      />
    )
  }

  return (
    <StatusPageForm
      mode={{ kind: "create" }}
      defaultValues={newStatusPageDefaults(monitors)}
      monitors={monitors.map((monitor) => ({
        id: monitor.id,
        name: monitor.name,
        status: monitor.status,
      }))}
      host={new URL(getEnv().APP_URL).host}
    />
  )
}
