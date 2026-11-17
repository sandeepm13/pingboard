import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { safeTimeZone } from "@shared/time"
import { BackLink } from "@/components/common/back-link"
import { PageHeader } from "@/components/common/page-header"
import { FormSkeleton, PageHeaderSkeleton } from "@/components/common/skeletons"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { AnnouncementsCard } from "@/components/status-pages/announcements-card"
import { DeleteStatusPageCard } from "@/components/status-pages/delete-status-page-card"
import { LogoCard } from "@/components/status-pages/logo-card"
import { ShareCard } from "@/components/status-pages/share-card"
import { StatusPageForm } from "@/components/status-pages/status-page-form"
import { requireUser } from "@/lib/auth/require-user"
import { getEnv } from "@/lib/env"
import { listMonitors } from "@/lib/monitors"
import {
  findOwnedStatusPage,
  toAnnouncementItems,
  toStatusPageFormValues,
} from "@/lib/status-pages"

export const metadata: Metadata = { title: "Edit status page" }

export default function Page({ params }: PageProps<"/app/status-pages/[id]">) {
  return (
    <>
      <BackLink href="/app/status-pages" label="Status pages" />
      <Suspense
        fallback={
          <>
            <PageHeaderSkeleton />
            <FormSkeleton />
          </>
        }
      >
        {params.then(({ id }) => (
          <StatusPageEditor id={id} />
        ))}
      </Suspense>
    </>
  )
}

async function StatusPageEditor({ id }: { id: string }) {
  const user = await requireUser()
  // Scoped by userId: someone else's page is a plain 404.
  const page = await findOwnedStatusPage(user.id, id)
  if (!page) notFound()
  const monitors = await listMonitors(user.id)
  const owned = new Set(monitors.map((monitor) => monitor.id))
  const values = toStatusPageFormValues(page)
  const appUrl = getEnv().APP_URL
  const pageId = page._id.toString()

  return (
    <TimeZoneProvider timeZone={safeTimeZone(user.timezone)}>
      <PageHeader title={page.title} description={`/status/${page.slug}`} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <StatusPageForm
          mode={{ kind: "edit", id: pageId }}
          defaultValues={{
            ...values,
            monitors: values.monitors.filter((entry) =>
              owned.has(entry.monitorId)
            ),
          }}
          monitors={monitors.map((monitor) => ({
            id: monitor.id,
            name: monitor.name,
            status: monitor.status,
          }))}
          host={new URL(appUrl).host}
        />
        <aside className="space-y-6">
          <ShareCard
            id={pageId}
            slug={page.slug}
            title={page.title}
            isPublic={page.isPublic}
            appUrl={appUrl}
          />
          <LogoCard id={pageId} logoUrl={page.logoUrl ?? null} />
          <AnnouncementsCard
            id={pageId}
            announcements={toAnnouncementItems(page)}
          />
          <DeleteStatusPageCard
            id={pageId}
            title={page.title}
            slug={page.slug}
          />
        </aside>
      </div>
    </TimeZoneProvider>
  )
}
