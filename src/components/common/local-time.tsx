"use client"

import { cn } from "cn"

import { formatDate, type DateStyle } from "./date-format"
import { useHydrated, useTimeZone } from "./time-zone"

/** A timestamp in the user's time zone and the viewer's locale, client-only. */
export function LocalTime({
  iso,
  format = "datetime",
  className,
}: {
  iso: string
  format?: DateStyle
  className?: string
}) {
  const hydrated = useHydrated()
  const timeZone = useTimeZone()

  return (
    <time dateTime={iso} className={cn("font-mono tabular-nums", className)}>
      {hydrated ? formatDate(iso, format, timeZone) : "…"}
    </time>
  )
}
