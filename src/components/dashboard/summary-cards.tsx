"use client"

import { cn } from "cn"

import type { MonitorStatus } from "@shared/types"
import { StatCard, formatUptime } from "@/components/common/stat-card"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusDot } from "@/components/status/status-dot"
import { STATUS_META } from "@/components/status/status-meta"
import type { DashboardSummary } from "@/lib/dashboard"

const STATUS_CARDS = ["up", "down", "degraded", "paused"] as const

type StatusFilter = MonitorStatus | "all"

/** Status counts double as filter toggles for the list below. */
export function SummaryCards({
  summary,
  activeStatus,
  onSelectStatus,
}: {
  summary: DashboardSummary
  activeStatus: StatusFilter
  onSelectStatus: (status: StatusFilter) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      <FilterCard
        label="Total"
        value={summary.total}
        hint={summary.pending ? `${summary.pending} pending` : "monitors"}
        pressed={activeStatus === "all"}
        onClick={() => onSelectStatus("all")}
        title="Show all monitors"
      />
      {STATUS_CARDS.map((status) => (
        <FilterCard
          key={status}
          label={STATUS_META[status].label}
          value={summary[status]}
          icon={<StatusDot status={status} size="sm" pulse={false} />}
          alert={status === "down" && summary.down > 0}
          pressed={activeStatus === status}
          onClick={() =>
            onSelectStatus(activeStatus === status ? "all" : status)
          }
          title={`Show only ${STATUS_META[status].label.toLowerCase()} monitors`}
        />
      ))}
      <StatCard
        label="Avg response"
        value={<ResponseTimeText ms={summary.avgResponseMs} />}
        hint="last 24 h"
      />
      <StatCard
        className="col-span-2 lg:col-span-1"
        label="Uptime"
        value={formatUptime(summary.uptime24h)}
        hint="last 24 h"
      />
    </div>
  )
}

function FilterCard({
  label,
  value,
  hint,
  icon,
  alert = false,
  pressed,
  onClick,
  title,
}: {
  label: string
  value: number
  hint?: string
  icon?: React.ReactNode
  /** Red emphasis, e.g. when something is down. */
  alert?: boolean
  pressed: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        alert && "border-down/40 bg-down/5",
        pressed && "ring-1 ring-ring"
      )}
    >
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "mt-1.5 block font-mono text-xl font-semibold tabular-nums sm:text-2xl",
          alert && "text-down"
        )}
      >
        {value}
      </span>
      {hint && (
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </button>
  )
}
