import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

import { LinkPending } from "@/components/common/link-pending"
import { Button } from "@/components/ui/button"
import type { MonitorRecord } from "@/lib/monitors"
import { getRecentChecks, type MonitorDetailParams } from "@/lib/monitor-stats"

import { CheckList, CheckTable } from "./check-rows"
import { detailHref } from "./detail-href"

export async function RecentChecksCard({
  monitor,
  params,
}: {
  monitor: MonitorRecord
  params: MonitorDetailParams
}) {
  const id = monitor._id.toString()
  const page = await getRecentChecks(id, params)
  const firstPage = !params.before && !params.after
  const reset = { before: undefined, after: undefined }

  return (
    <section
      aria-labelledby="recent-checks-heading"
      className="rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
        <h2 id="recent-checks-heading" className="text-lg font-semibold">
          Recent checks
        </h2>
        <nav
          aria-label="Filter checks"
          className="flex rounded-lg border p-0.5 text-xs"
        >
          {[
            { label: "All", failures: false },
            { label: "Failures only", failures: true },
          ].map((option) => (
            <Link
              key={option.label}
              href={detailHref(id, params, {
                ...reset,
                failures: option.failures,
              })}
              prefetch={false}
              scroll={false}
              replace
              aria-current={
                params.failures === option.failures ? "true" : undefined
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-colors",
                params.failures === option.failures
                  ? "bg-secondary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
              <LinkPending />
            </Link>
          ))}
        </nav>
      </div>

      {page.rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {!monitor.lastCheckedAt
            ? "Waiting for first check…"
            : params.failures && firstPage
              ? "No failed checks in the last 30 days."
              : "No checks here."}
        </p>
      ) : (
        <>
          <CheckTable rows={page.rows} />
          <CheckList rows={page.rows} />
        </>
      )}

      {(page.newerCursor || page.olderCursor || !firstPage) && (
        <nav
          aria-label="Recent checks pages"
          className="flex items-center justify-between gap-2 border-t p-3 sm:px-5"
        >
          <PageLink
            href={
              page.newerCursor &&
              detailHref(id, params, {
                before: undefined,
                after: page.newerCursor,
              })
            }
            direction="newer"
          />
          {!firstPage && (
            <Button asChild variant="ghost" size="sm">
              <Link
                href={detailHref(id, params, reset)}
                prefetch={false}
                scroll={false}
              >
                Latest
              </Link>
            </Button>
          )}
          <PageLink
            href={
              page.olderCursor &&
              detailHref(id, params, {
                after: undefined,
                before: page.olderCursor,
              })
            }
            direction="older"
          />
        </nav>
      )}
    </section>
  )
}

function PageLink({
  href,
  direction,
}: {
  href: string | null
  direction: "newer" | "older"
}) {
  const content =
    direction === "newer" ? (
      <>
        <ChevronLeftIcon aria-hidden="true" />
        Newer
      </>
    ) : (
      <>
        Older
        <ChevronRightIcon aria-hidden="true" />
      </>
    )
  if (!href) {
    return (
      <Button variant="outline" size="sm" disabled>
        {content}
      </Button>
    )
  }
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href} prefetch={false} scroll={false}>
        {content}
        <LinkPending />
      </Link>
    </Button>
  )
}
