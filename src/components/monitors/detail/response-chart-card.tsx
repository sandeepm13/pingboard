import Link from "next/link"
import { cn } from "cn"

import { LinkPending } from "@/components/common/link-pending"
import type { MonitorRecord } from "@/lib/monitors"
import {
  CHART_RANGES,
  getDailyHistory,
  getResponseSeries,
  type MonitorDetailParams,
} from "@/lib/monitor-stats"

import { detailHref } from "./detail-href"
import { ResponseTimeChart } from "./response-time-chart"

const RANGE_LABELS = { "1h": "1h", "24h": "24h", "7d": "7d", "30d": "30d" }

export async function ResponseChartCard({
  monitor,
  params,
}: {
  monitor: MonitorRecord
  params: MonitorDetailParams
}) {
  const id = monitor._id.toString()
  const history = await getDailyHistory(id, monitor.createdAt.getTime())
  const series = await getResponseSeries(id, params.range, history)

  return (
    <section
      aria-labelledby="response-chart-heading"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="response-chart-heading" className="text-lg font-semibold">
          Response time
        </h2>
        <nav aria-label="Chart range" className="flex rounded-lg border p-0.5">
          {CHART_RANGES.map((range) => {
            const active = range === params.range
            return (
              <Link
                key={range}
                href={detailHref(id, params, { range })}
                prefetch={false}
                scroll={false}
                replace
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex min-w-11 items-center justify-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs tabular-nums transition-colors",
                  active
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {RANGE_LABELS[range]}
                <LinkPending />
              </Link>
            )
          })}
        </nav>
      </div>
      {series.points.length > 0 ? (
        <ResponseTimeChart series={series} />
      ) : (
        <p className="flex h-60 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {monitor.lastCheckedAt
            ? "No checks in this range yet."
            : "Waiting for first check…"}
        </p>
      )}
    </section>
  )
}
