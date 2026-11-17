import { ShieldAlertIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react"

import { SSL_WARN_DAYS } from "@shared/constants"
import { daysUntil } from "@shared/time"
import { LocalTime } from "@/components/common/local-time"
import { StatCard, formatUptime } from "@/components/common/stat-card"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusCodeText } from "@/components/status/status-code-text"
import type { MonitorRecord } from "@/lib/monitors"
import { getDailyHistory, getMonitorStats } from "@/lib/monitor-stats"

// Four per row: at seven per row the values truncate on a 1280 px screen.
export const STAT_GRID = "grid grid-cols-2 gap-3 sm:grid-cols-4"

export async function MonitorStatCards({
  monitor,
}: {
  monitor: MonitorRecord
}) {
  const id = monitor._id.toString()
  const history = await getDailyHistory(id, monitor.createdAt.getTime())
  const stats = await getMonitorStats(id, history)

  return (
    <div className={STAT_GRID}>
      <StatCard
        label="Uptime 24h"
        value={formatUptime(stats.uptime24h)}
        hint={`${stats.checks24h} ${stats.checks24h === 1 ? "check" : "checks"}`}
      />
      <StatCard label="Uptime 7d" value={formatUptime(stats.uptime7d)} />
      <StatCard
        label="Uptime 30d"
        value={formatUptime(stats.uptime30d)}
        hint="UTC days"
      />
      <StatCard
        label="Avg response"
        value={<ResponseTimeText ms={stats.avgResponseMs24h} />}
        hint="last 24 h"
      />
      <StatCard
        label="p95 response"
        value={<ResponseTimeText ms={stats.p95ResponseMs24h} />}
        hint="last 24 h"
      />
      <StatCard
        label="Last status"
        value={<StatusCodeText code={monitor.lastStatusCode} />}
        hint={
          monitor.lastCheckedAt ? (
            <LocalTime iso={monitor.lastCheckedAt.toISOString()} />
          ) : (
            "Waiting for first check…"
          )
        }
      />
      <SslCard monitor={monitor} />
    </div>
  )
}

function SslCard({ monitor }: { monitor: MonitorRecord }) {
  const className = "col-span-2"
  if (!monitor.url.startsWith("https:")) {
    return (
      <StatCard className={className} label="SSL" value="—" hint="Not HTTPS" />
    )
  }
  if (!monitor.sslExpiresAt) {
    return (
      <StatCard
        className={className}
        label="SSL expires in"
        value="—"
        hint="Not checked yet"
      />
    )
  }

  const days = daysUntil(monitor.sslExpiresAt)
  const expiry = (
    <LocalTime iso={monitor.sslExpiresAt.toISOString()} format="date" />
  )
  if (days < 0) {
    return (
      <StatCard
        className={className}
        label="SSL certificate"
        icon={<ShieldXIcon className="size-4 text-down" aria-hidden="true" />}
        value={<span className="text-down">Expired</span>}
        hint={<>on {expiry}</>}
      />
    )
  }
  const warn = days <= SSL_WARN_DAYS
  const Icon = warn ? ShieldAlertIcon : ShieldCheckIcon
  return (
    <StatCard
      className={className}
      label="SSL expires in"
      icon={
        <Icon
          className={warn ? "size-4 text-degraded" : "size-4 text-up"}
          aria-hidden="true"
        />
      }
      value={
        <span className={warn ? "text-degraded" : undefined}>
          {days} {days === 1 ? "day" : "days"}
        </span>
      }
      hint={warn ? <>Expiring soon · {expiry}</> : <>on {expiry}</>}
    />
  )
}
