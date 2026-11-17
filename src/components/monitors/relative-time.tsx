"use client"

import { useSyncExternalStore } from "react"

import { formatDate } from "@/components/common/date-format"
import { useTimeZone } from "@/components/common/time-zone"

import { formatRelative } from "./format"

const TICK_MS = 10_000

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS)
  return () => clearInterval(id)
}

// Bucketed so the snapshot is stable between renders.
const getSnapshot = () => Math.floor(Date.now() / TICK_MS)
const getServerSnapshot = () => null

/**
 * "40s ago" / "3 min ago", rendered only on the client (the server snapshot is null) so
 * server and browser clocks/locales can't cause a hydration mismatch.
 */
export function RelativeTime({
  iso,
  fallback = "Never",
}: {
  iso: string | null
  fallback?: string
}) {
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const timeZone = useTimeZone()

  if (!iso) return <span className="text-muted-foreground">{fallback}</span>
  if (tick === null) return <span aria-hidden="true">…</span>

  return (
    <time
      dateTime={iso}
      title={formatDate(iso, "datetime-seconds", timeZone)}
      className="font-mono tabular-nums"
    >
      {formatRelative(iso, tick * TICK_MS)}
    </time>
  )
}
