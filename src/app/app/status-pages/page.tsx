import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { GlobeIcon, PlusIcon } from "lucide-react"

import { planLimits } from "@shared/plans"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth/require-user"
import { listStatusPages, type StatusPageListItem } from "@/lib/status-pages"

export const metadata: Metadata = { title: "Status pages" }

export default function Page() {
  return (
    <>
      <PageHeader
        title="Status pages"
        description="Public pages that show your uptime to customers, without exposing your URLs."
      />
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <StatusPages />
      </Suspense>
    </>
  )
}

async function StatusPages() {
  const user = await requireUser()
  const pages = await listStatusPages(user.id)
  const { maxStatusPages, label } = planLimits(user.plan)
  const atLimit = pages.length >= maxStatusPages

  const newButton = (
    <Button asChild>
      <Link href="/app/status-pages/new">
        <PlusIcon aria-hidden="true" />
        New status page
      </Link>
    </Button>
  )

  if (pages.length === 0) {
    return (
      <EmptyState
        icon={GlobeIcon}
        title="No status pages yet"
        description="Pick the monitors your customers should see, give them public names, and share one link."
        action={newButton}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">
            {pages.length} / {maxStatusPages}
          </span>{" "}
          on the {label} plan
        </p>
        {!atLimit && newButton}
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {pages.map((page) => (
          <StatusPageRow key={page.id} page={page} />
        ))}
      </ul>
    </div>
  )
}

function StatusPageRow({ page }: { page: StatusPageListItem }) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/app/status-pages/${page.id}`}
            className="truncate font-medium hover:underline"
          >
            {page.title}
          </Link>
          {page.isPublic ? (
            <Badge variant="outline" className="border-up/25 bg-up/10 text-up">
              Public
            </Badge>
          ) : (
            <Badge variant="outline">Not public</Badge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          <span className="font-mono">/status/{page.slug}</span> ·{" "}
          {page.monitorCount} {page.monitorCount === 1 ? "service" : "services"}
          {page.announcementCount > 0 &&
            ` · ${page.announcementCount} ${page.announcementCount === 1 ? "announcement" : "announcements"}`}
        </p>
      </div>
      <div className="flex gap-2">
        {page.isPublic && (
          <Button asChild variant="ghost" size="sm">
            <a href={`/status/${page.slug}`} target="_blank" rel="noopener">
              Open
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/app/status-pages/${page.id}`}>Edit</Link>
        </Button>
      </div>
    </li>
  )
}
