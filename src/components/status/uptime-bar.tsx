"use client"

import { cn } from "cn"

import type { UptimeSlot } from "@shared/types"
import { formatDate, formatUtcDay } from "@/components/common/date-format"
import { formatUptime } from "@/components/common/stat-card"
import { useTimeZone } from "@/components/common/time-zone"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { STATUS_META } from "./status-meta"

type UptimeBarProps = {
  slots: UptimeSlot[]
  /** Length of one slot, used for the tooltip time range. */
  slotMinutes: number
  /** Accessible name, e.g. "Last 24 hours". */
  label: string
  className?: string
}

function summarise(slots: UptimeSlot[]) {
  const withData = slots.filter((slot) => slot.uptime != null)
  if (withData.length === 0) return "no data"
  // Weighted by checks, so a slot with 1 check doesn't count like one with 60.
  const checks = withData.reduce((sum, slot) => sum + (slot.checks ?? 0), 0)
  const avg = checks
    ? withData.reduce(
        (sum, slot) => sum + (slot.uptime ?? 0) * (slot.checks ?? 0),
        0
      ) / checks
    : null
  const incidents = slots.filter(
    (slot) => slot.status === "down" || slot.status === "degraded"
  ).length
  return `${formatUptime(avg)} uptime, ${incidents} of ${slots.length} periods with issues`
}

export function UptimeBar({
  slots,
  slotMinutes,
  label,
  className,
}: UptimeBarProps) {
  return (
    <div
      role="img"
      aria-label={`${label}: ${summarise(slots)}`}
      className={cn("flex h-8 items-stretch gap-px sm:gap-0.5", className)}
    >
      {slots.map((slot) => (
        <Tooltip key={slot.start}>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "min-w-0 flex-1 rounded-[2px] transition-opacity hover:opacity-75",
                slot.status ? STATUS_META[slot.status].dot : "bg-nodata"
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="flex-col items-start gap-0.5">
            <SlotDetails slot={slot} slotMinutes={slotMinutes} />
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

const DAY_MINUTES = 24 * 60

function describeSlot(slot: UptimeSlot): string {
  if (!slot.status) return "No data"
  const parts = [STATUS_META[slot.status].label]
  if (slot.uptime != null) parts.push(formatUptime(slot.uptime))
  if (slot.checks != null) {
    parts.push(`${slot.checks} ${slot.checks === 1 ? "check" : "checks"}`)
  }
  return parts.join(" · ")
}

// Rendered only when a tooltip opens (client-side), so formatting in the
// viewer's locale can't cause a hydration mismatch. Times use the user's
// zone (TimeZoneProvider); daily slots are UTC days and say so.
function SlotDetails({
  slot,
  slotMinutes,
}: {
  slot: UptimeSlot
  slotMinutes: number
}) {
  const timeZone = useTimeZone()
  const start = new Date(slot.start)
  const end = new Date(start.getTime() + slotMinutes * 60_000)

  return (
    <>
      <span className="font-medium">
        {slotMinutes >= DAY_MINUTES
          ? `${formatUtcDay(start)} (UTC day)`
          : `${formatDate(start, "datetime", timeZone)} – ${formatDate(end, "time", timeZone)}`}
      </span>
      <span className="font-mono tabular-nums opacity-80">
        {describeSlot(slot)}
      </span>
    </>
  )
}
