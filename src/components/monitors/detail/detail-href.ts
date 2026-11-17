import type { MonitorDetailParams } from "@/lib/monitor-stats"

/** URL of the monitor page with some search params changed; defaults are left out. */
export function detailHref(
  monitorId: string,
  current: MonitorDetailParams,
  patch: Partial<MonitorDetailParams>
): string {
  const next = { ...current, ...patch }
  const query = new URLSearchParams()
  if (next.range !== "24h") query.set("range", next.range)
  if (next.failures) query.set("failures", "1")
  if (next.before) query.set("before", next.before)
  else if (next.after) query.set("after", next.after)
  const search = query.toString()
  return `/app/monitors/${monitorId}${search ? `?${search}` : ""}`
}
