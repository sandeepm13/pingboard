import { UPTIME_HISTORY_DAYS } from "@shared/constants"
import type { PublicService } from "@shared/status-page"
import { formatUptime } from "@/components/common/stat-card"
import { ResponseTimeChart } from "@/components/monitors/detail/response-time-chart"
import { UptimeBar } from "@/components/status/uptime-bar"
import type { ResponseSeries } from "@/lib/monitor-stats"

import { PublicStatusBadge } from "./public-status-badge"

/** One service: name, status, 90 daily bars, 90-day uptime, optional chart. */
export function PublicServiceRow({
  service,
}: {
  service: PublicService<ResponseSeries>
}) {
  const headingId = `service-${service.key}`
  return (
    <li aria-labelledby={headingId} className="space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h3 id={headingId} className="truncate font-medium">
            {service.name}
          </h3>
          {service.url && (
            <p className="truncate font-mono text-xs text-muted-foreground">
              {service.url}
            </p>
          )}
        </div>
        <PublicStatusBadge status={service.status} />
      </div>
      <UptimeBar
        label={`${service.name}, uptime per day, last ${UPTIME_HISTORY_DAYS} days`}
        slots={service.slots}
        slotMinutes={24 * 60}
        className="h-8"
      />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{UPTIME_HISTORY_DAYS} days ago</span>
        <span className="font-mono tabular-nums">
          {formatUptime(service.uptime90d)} uptime
        </span>
        <span>Today</span>
      </div>
      {service.responseSeries && (
        <details className="group rounded-lg border">
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm text-muted-foreground select-none hover:text-foreground">
            Response time, last 24 hours
          </summary>
          <div className="border-t p-3">
            <ResponseTimeChart series={service.responseSeries} />
          </div>
        </details>
      )}
    </li>
  )
}
