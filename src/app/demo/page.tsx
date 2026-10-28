import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { connection } from "next/server"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { PublicStatusView } from "@/components/status-page/public-status-view"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { buildDemoStatusView } from "@/lib/demo-status"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Live demo",
  description:
    "See a PingBoard status page: live status, 90-day uptime bars, response times, incidents and announcements, with sample data.",
  path: "/demo",
})

// Exactly what visitors of a PingBoard status page see, with sample services
// (lib/demo-status.ts), built per request so the bars end today.
export default function DemoPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-sm"
            aria-label="Back to PingBoard"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            <Logo />
          </Link>
          <p className="text-sm text-muted-foreground">
            Demo status page · sample data
          </p>
          <Button asChild size="sm" className="ml-auto">
            <Link href="/signup">
              Create yours free
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <main id="main" className="flex flex-1 flex-col">
        <Suspense fallback={<DemoSkeleton />}>
          <DemoView />
        </Suspense>
      </main>
    </div>
  )
}

async function DemoView() {
  await connection()
  return (
    <PublicStatusView
      view={buildDemoStatusView(new Date())}
      className="flex-1"
    />
  )
}

function DemoSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}
