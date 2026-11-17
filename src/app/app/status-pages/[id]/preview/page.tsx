import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { EyeIcon } from "lucide-react"

import { BackLink } from "@/components/common/back-link"
import { PublicStatusView } from "@/components/status-page/public-status-view"
import { Skeleton } from "@/components/ui/skeleton"
import { requireUser } from "@/lib/auth/require-user"
import { getStatusPagePreview } from "@/lib/public-status"

export const metadata: Metadata = { title: "Status page preview" }

export default function Page({
  params,
}: PageProps<"/app/status-pages/[id]/preview">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] w-full rounded-xl" />}>
      {params.then(({ id }) => (
        <Preview id={id} />
      ))}
    </Suspense>
  )
}

async function Preview({ id }: { id: string }) {
  const user = await requireUser()
  // Owner-scoped and uncached: shows unpublished pages and unsaved-to-cache edits.
  const view = await getStatusPagePreview(user.id, id)
  if (!view) notFound()

  return (
    <>
      <BackLink href={`/app/status-pages/${id}`} label="Edit status page" />
      <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
        <EyeIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Preview of what visitors see at{" "}
        <span className="font-mono text-foreground">/status/{view.slug}</span>,
        in the page&apos;s own theme.
      </p>
      <div className="overflow-hidden rounded-xl border">
        <PublicStatusView view={view} />
      </div>
    </>
  )
}
