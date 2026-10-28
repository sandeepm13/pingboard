import { StatCard, formatUptime } from "@/components/common/stat-card"
import { ResponseTimeChart } from "@/components/monitors/detail/response-time-chart"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusCodeText } from "@/components/status/status-code-text"

import { fakeSeries } from "../_data"
import { DemoLabel } from "./section"

const CODES = [200, 204, 301, 302, 404, 429, 500, 503, null]

export function MetricDemos() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Uptime 24h"
          value={formatUptime(99.931)}
          hint="1,439 checks"
        />
        <StatCard
          label="Uptime 30d"
          value={formatUptime(100)}
          hint="UTC days"
        />
        <StatCard
          label="p95 response"
          value={<ResponseTimeText ms={612} />}
          hint="last 24 h"
        />
        <StatCard label="Last status" value={<StatusCodeText code={503} />} />
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DemoLabel>
          StatusCodeText · 2xx green · 3xx blue · 4xx amber · 5xx red
        </DemoLabel>
        <ul className="flex flex-wrap gap-4 text-sm">
          {CODES.map((code, i) => (
            <li key={i}>
              <StatusCodeText code={code} />
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DemoLabel>ResponseTimeChart · 24h · 15 min buckets</DemoLabel>
        <ResponseTimeChart series={fakeSeries()} />
      </div>
    </div>
  )
}
