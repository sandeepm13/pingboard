import { UPTIME_HISTORY_DAYS } from "@shared/constants"
import { dailySlots, sumCounts, uptimePercent } from "@shared/stats"
import { formatUptime } from "@/components/common/stat-card"
import { UptimeBar } from "@/components/status/uptime-bar"
import type { MonitorRecord } from "@/lib/monitors"
import { getDailyHistory } from "@/lib/monitor-stats"

/** One bar per UTC day for the last 90 days (DailyStat + today from raw checks). */
export async function UptimeHistoryCard({
  monitor,
}: {
  monitor: MonitorRecord
}) {
  const history = await getDailyHistory(
    monitor._id.toString(),
    monitor.createdAt.getTime()
  )
  const total = sumCounts(history)

  return (
    <section
      aria-labelledby="uptime-history-heading"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="uptime-history-heading" className="text-lg font-semibold">
          Uptime, last {UPTIME_HISTORY_DAYS} days
        </h2>
        <p className="font-mono text-sm text-muted-foreground tabular-nums">
          {formatUptime(uptimePercent(total.up, total.total))}
        </p>
      </div>
      <UptimeBar
        label={`Uptime, last ${UPTIME_HISTORY_DAYS} days`}
        slots={dailySlots(history, UPTIME_HISTORY_DAYS, new Date())}
        slotMinutes={24 * 60}
        className="h-10"
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{UPTIME_HISTORY_DAYS} days ago</span>
        <span>Today (UTC)</span>
      </div>
    </section>
  )
}
