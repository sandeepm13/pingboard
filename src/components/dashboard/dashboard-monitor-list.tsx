import { cn } from "cn"

import type { DashboardMonitor } from "@/lib/dashboard"

import { DashboardMonitorRow, ROW_GRID } from "./dashboard-monitor-row"

const COLUMNS = [
  ["name", "Monitor"],
  ["status", "Status"],
  ["code", "Code"],
  ["rt", "Response"],
  ["bar", "Last 24 hours"],
  ["uptime", "Uptime"],
  ["ago", "Checked"],
] as const

// Grid-area classes spelled out so Tailwind can see them.
const AREA_CLASS: Record<(typeof COLUMNS)[number][0], string> = {
  name: "[grid-area:name]",
  status: "[grid-area:status]",
  code: "[grid-area:code]",
  rt: "[grid-area:rt]",
  bar: "[grid-area:bar]",
  uptime: "[grid-area:uptime]",
  ago: "[grid-area:ago]",
}

export function DashboardMonitorList({
  monitors,
}: {
  monitors: DashboardMonitor[]
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {/* Visual column headings; each cell also carries its own sr-only label. */}
      <div
        aria-hidden="true"
        className={cn(
          ROW_GRID,
          "hidden border-b px-4 py-2 text-xs font-medium text-muted-foreground lg:grid"
        )}
      >
        {COLUMNS.map(([area, title]) => (
          <span key={area} className={AREA_CLASS[area]}>
            {title}
          </span>
        ))}
      </div>
      <ul className="divide-y">
        {monitors.map((monitor) => (
          <DashboardMonitorRow key={monitor.id} monitor={monitor} />
        ))}
      </ul>
    </div>
  )
}
