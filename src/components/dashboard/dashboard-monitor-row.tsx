import Link from "next/link"
import { cn } from "cn"

import { formatUptime } from "@/components/common/stat-card"
import { MonitorActionsMenu } from "@/components/monitors/monitor-actions-menu"
import { RelativeTime } from "@/components/monitors/relative-time"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusCodeText } from "@/components/status/status-code-text"
import { UptimeBar } from "@/components/status/uptime-bar"
import type { DashboardMonitor } from "@/lib/dashboard"

// One grid, two layouts: a card below lg, a table-like row from lg up. The
// meta cells sit in a wrapper that is a flex line on small screens and
// `display: contents` on large ones, so each becomes its own column.

export const ROW_GRID =
  "grid gap-x-3 gap-y-2 [grid-template-areas:'name_status_menu'_'meta_meta_meta'_'bar_bar_bar'] grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-4 lg:[grid-template-areas:'name_status_code_rt_bar_uptime_ago_menu'] lg:grid-cols-[minmax(0,1fr)_5.75rem_3rem_4.5rem_8rem_4rem_4.75rem_2.25rem] xl:grid-cols-[minmax(0,1fr)_5.75rem_3.5rem_5rem_12rem_4.5rem_5.5rem_2.25rem]"

export function DashboardMonitorRow({
  monitor,
}: {
  monitor: DashboardMonitor
}) {
  const down = monitor.status === "down"
  const waiting = monitor.lastCheckedAt === null && monitor.checks24h === 0

  return (
    <li
      className={cn(
        ROW_GRID,
        "px-4 py-3",
        down && "bg-down/5 shadow-[inset_3px_0_0_var(--color-down)]"
      )}
    >
      <div className="min-w-0 [grid-area:name]">
        <Link
          href={`/app/monitors/${monitor.id}`}
          className="block truncate rounded-sm font-medium hover:underline"
        >
          {monitor.name}
        </Link>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {monitor.method !== "GET" && `${monitor.method} `}
          {monitor.url}
        </p>
      </div>

      <StatusBadge
        status={monitor.status}
        className="self-start [grid-area:status] lg:self-center"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs [grid-area:meta] lg:contents lg:text-sm">
        <span className="lg:[grid-area:code]">
          <span className="text-muted-foreground lg:sr-only">Code </span>
          <StatusCodeText code={monitor.lastStatusCode} />
        </span>
        <span className="lg:[grid-area:rt]">
          <span className="sr-only">Response time </span>
          <ResponseTimeText ms={monitor.lastResponseTimeMs} />
        </span>
        <span className="lg:[grid-area:uptime]">
          <span className="font-mono tabular-nums">
            {formatUptime(monitor.uptime24h)}
          </span>
          <span className="text-muted-foreground lg:sr-only"> 24h</span>
        </span>
        <span className="text-muted-foreground lg:[grid-area:ago]">
          <span className="lg:sr-only">Checked </span>
          <RelativeTime iso={monitor.lastCheckedAt} fallback="never" />
        </span>
      </div>

      <div className="[grid-area:bar]">
        {waiting ? (
          <p className="text-xs text-muted-foreground">
            {monitor.status === "paused"
              ? "Paused before its first check"
              : "Waiting for first check…"}
          </p>
        ) : (
          <UptimeBar
            label={`${monitor.name}, last 24 hours`}
            slots={monitor.slots}
            slotMinutes={60}
            className="h-6 lg:h-7"
          />
        )}
      </div>

      <div className="self-start [grid-area:menu] lg:self-center">
        <MonitorActionsMenu
          id={monitor.id}
          name={monitor.name}
          paused={monitor.status === "paused"}
        />
      </div>
    </li>
  )
}
