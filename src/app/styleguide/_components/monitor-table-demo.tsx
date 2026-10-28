import { cn } from "cn"

import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { UptimeBar } from "@/components/status/uptime-bar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { FAKE_MONITORS } from "../_data"

function statusCodeClass(code: number | null) {
  if (code == null) return "text-muted-foreground"
  if (code >= 500) return "text-down"
  if (code >= 400) return "text-degraded"
  return "text-foreground"
}

export function MonitorTableDemo() {
  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Monitor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Code</TableHead>
            <TableHead className="text-right">Response</TableHead>
            <TableHead className="min-w-48">Last 24h</TableHead>
            <TableHead className="pr-4 text-right">Uptime</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {FAKE_MONITORS.map((monitor) => (
            <TableRow key={monitor.id}>
              <TableCell className="pl-4">
                <p className="font-medium">{monitor.name}</p>
                <p className="max-w-56 truncate font-mono text-xs text-muted-foreground">
                  {monitor.method} {monitor.url}
                </p>
              </TableCell>
              <TableCell>
                <StatusBadge status={monitor.status} />
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono tabular-nums",
                  statusCodeClass(monitor.statusCode)
                )}
              >
                {monitor.statusCode ?? "—"}
              </TableCell>
              <TableCell className="text-right">
                <ResponseTimeText ms={monitor.responseTimeMs} />
              </TableCell>
              <TableCell>
                <UptimeBar
                  label={`${monitor.name}, last 24 hours`}
                  slotMinutes={60}
                  slots={monitor.slots}
                  className="h-6"
                />
              </TableCell>
              <TableCell className="pr-4 text-right font-mono tabular-nums">
                {monitor.uptime24h == null
                  ? "—"
                  : `${monitor.uptime24h.toFixed(2)}%`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
