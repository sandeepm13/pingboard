import { MONITOR_STATUSES } from "@shared/constants"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusDot } from "@/components/status/status-dot"
import { UptimeBar } from "@/components/status/uptime-bar"

import { fakeSlots } from "../_data"
import { DemoLabel } from "./section"

const RESPONSE_SAMPLES = [88, 142, 499, 640, 1180, 1500, 2950, null]

export function StatusDemos() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-5">
        <DemoLabel>StatusDot · StatusBadge</DemoLabel>
        <ul className="space-y-3">
          {MONITOR_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-4">
              <StatusDot status={status} label={status} />
              <StatusBadge status={status} />
              <span className="font-mono text-xs text-muted-foreground">
                {status === "up"
                  ? "pulses (off with reduced motion)"
                  : "static"}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <DemoLabel>
          ResponseTimeText · &lt;500 green · &lt;1500 amber · else red
        </DemoLabel>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {RESPONSE_SAMPLES.map((ms, i) => (
            <li key={i}>
              <ResponseTimeText ms={ms} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function UptimeBarDemos() {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      <div>
        <DemoLabel>24h · 48 × 30 min slots · hover a bar</DemoLabel>
        <UptimeBar
          label="Last 24 hours"
          slotMinutes={30}
          slots={fakeSlots({
            count: 48,
            slotMinutes: 30,
            seed: 11,
            downRate: 0.04,
            degradedRate: 0.08,
          })}
        />
      </div>
      <div>
        <DemoLabel>
          90 days · 1 day slots, new monitor (no data first)
        </DemoLabel>
        <UptimeBar
          label="Last 90 days"
          slotMinutes={1440}
          className="h-10"
          slots={fakeSlots({
            count: 90,
            slotMinutes: 1440,
            seed: 12,
            noDataLeading: 20,
          })}
        />
        <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
          <span>90 days ago</span>
          <span>Today</span>
        </div>
      </div>
      <div>
        <DemoLabel>Paused monitor</DemoLabel>
        <UptimeBar
          label="Last 24 hours"
          slotMinutes={60}
          slots={fakeSlots({
            count: 24,
            slotMinutes: 60,
            seed: 13,
            paused: true,
          })}
        />
      </div>
    </div>
  )
}
