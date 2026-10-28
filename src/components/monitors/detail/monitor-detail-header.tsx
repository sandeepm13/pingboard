import { StatusBadge } from "@/components/status/status-badge"
import type { MonitorRecord } from "@/lib/monitors"

import { formatInterval } from "../format"
import { MonitorDetailActions } from "./monitor-detail-actions"

export function MonitorDetailHeader({ monitor }: { monitor: MonitorRecord }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="min-w-0 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {monitor.name}
          </h1>
          <StatusBadge status={monitor.status} />
        </div>
        <p className="truncate font-mono text-sm text-muted-foreground">
          {monitor.method !== "GET" && `${monitor.method} `}
          {monitor.url}
        </p>
        <p className="text-xs text-muted-foreground">
          Checked every {formatInterval(monitor.intervalMinutes)}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <MonitorDetailActions
          id={monitor._id.toString()}
          name={monitor.name}
          paused={monitor.status === "paused"}
        />
      </div>
    </div>
  )
}
