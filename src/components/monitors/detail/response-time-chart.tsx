"use client"

import { useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts"

import { DAY_MS } from "@shared/stats"
import { formatDate, formatUtcDay } from "@/components/common/date-format"
import { useHydrated, useTimeZone } from "@/components/common/time-zone"
import { formatResponseTime } from "@/components/status/response-time-text"
import { Skeleton } from "@/components/ui/skeleton"
import type { ChartPoint, ResponseSeries } from "@/lib/monitor-stats"

import { ChartLegend } from "./chart-legend"

const HEIGHT = 240

type PlotPoint = ChartPoint & { x: number }
type FailedArea = { x1: number; x2: number; opacity: number }

/** Consecutive buckets with failed checks merge into one shaded band. */
function failedAreas(series: ResponseSeries, daily: boolean): FailedArea[] {
  const areas: FailedArea[] = []
  for (const point of series.points) {
    if (point.failed === 0) continue
    const end = point.t + series.bucketMs
    // A whole day shaded for one failed check would overstate it: scale by share.
    const opacity = daily ? 0.06 + 0.3 * (point.failed / point.checks) : 0.16
    const last = areas.at(-1)
    if (!daily && last && last.x2 === point.t) last.x2 = end
    else areas.push({ x1: point.t, x2: end, opacity })
  }
  return areas
}

function describe(series: ResponseSeries, areas: number): string {
  const values = series.points
    .map((p) => p.avgMs)
    .filter((v): v is number => v != null)
  if (values.length === 0) return "No response times in this range."
  const min = formatResponseTime(Math.min(...values))
  const max = formatResponseTime(Math.max(...values))
  return `Average response time, ${series.range}: between ${min} and ${max}. ${areas} ${areas === 1 ? "period" : "periods"} with failed checks, shaded red.`
}

export function ResponseTimeChart({ series }: { series: ResponseSeries }) {
  const hydrated = useHydrated()
  const timeZone = useTimeZone()
  const daily = series.bucketMs >= DAY_MS
  const areas = useMemo(() => failedAreas(series, daily), [series, daily])
  // Each point sits in the middle of its bucket; bands cover the whole bucket.
  const data = useMemo<PlotPoint[]>(
    () => series.points.map((p) => ({ ...p, x: p.t + series.bucketMs / 2 })),
    [series]
  )

  const formatTick = (value: number) =>
    daily ? formatUtcDay(value) : formatDate(value, "time", timeZone)

  return (
    <figure className="space-y-3">
      <ChartLegend daily={daily} />
      <figcaption className="sr-only">
        {describe(series, areas.length)}
      </figcaption>
      {/* Recharts measures the DOM, and ticks use the viewer's locale: client only. */}
      {!hydrated ? (
        <Skeleton style={{ height: HEIGHT }} className="w-full" />
      ) : (
        <LineChart
          responsive
          data={data}
          style={{ width: "100%", height: HEIGHT }}
          margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          {areas.map((area) => (
            <ReferenceArea
              key={area.x1}
              x1={area.x1}
              x2={area.x2}
              ifOverflow="hidden"
              fill="var(--color-down)"
              fillOpacity={area.opacity}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="x"
            type="number"
            scale="time"
            domain={[series.from, series.to]}
            tickFormatter={formatTick}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            // Wide enough that "1.18 s" / "400 ms" never wrap.
            width={64}
            tickFormatter={(ms: number) => formatResponseTime(ms)}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-muted-foreground)", strokeWidth: 1 }}
            content={(props) => (
              <ChartTooltip
                {...props}
                bucketMs={series.bucketMs}
                timeZone={timeZone}
              />
            )}
          />
          {daily && (
            <Line
              dataKey="p95Ms"
              name="p95"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          <Line
            dataKey="avgMs"
            name="Average"
            stroke="var(--color-chart-1)"
            strokeWidth={2}
            dot={
              daily
                ? { r: 4, strokeWidth: 2, fill: "var(--color-card)" }
                : false
            }
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--color-card)" }}
            isAnimationActive={false}
          />
        </LineChart>
      )}
    </figure>
  )
}

function ChartTooltip({
  active,
  payload,
  bucketMs,
  timeZone,
}: TooltipContentProps<TooltipValueType, string | number> & {
  bucketMs: number
  timeZone: string | undefined
}) {
  const point = payload?.[0]?.payload as PlotPoint | undefined
  if (!active || !point) return null

  const label =
    bucketMs >= DAY_MS
      ? `${formatUtcDay(point.t)} (UTC day)`
      : `${formatDate(point.t, "datetime", timeZone)} – ${formatDate(point.t + bucketMs, "time", timeZone)}`

  return (
    <div className="space-y-1 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
      <p className="font-medium">{label}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 font-mono tabular-nums">
        <dt className="text-muted-foreground">Average</dt>
        <dd>{point.avgMs == null ? "—" : formatResponseTime(point.avgMs)}</dd>
        {bucketMs >= DAY_MS && (
          <>
            <dt className="text-muted-foreground">p95</dt>
            <dd>
              {point.p95Ms == null ? "—" : formatResponseTime(point.p95Ms)}
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Checks</dt>
        <dd>{point.checks}</dd>
        {point.failed > 0 && (
          <>
            <dt className="text-down">Failed</dt>
            <dd className="text-down">{point.failed}</dd>
          </>
        )}
      </dl>
    </div>
  )
}
