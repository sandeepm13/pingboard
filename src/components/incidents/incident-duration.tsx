"use client"

import { useSyncExternalStore } from "react"
import { cn } from "cn"

import { formatDuration } from "@shared/time"

const TICK_MS = 10_000

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, TICK_MS)
  return () => clearInterval(id)
}

const getSnapshot = () => Math.floor(Date.now() / TICK_MS)
const getServerSnapshot = () => null

/**
 * Resolved: the stored duration. Ongoing: time since it started, ticking on
 * the client only (the server renders "…", so clocks can't mismatch).
 */
export function IncidentDuration({
  startedAt,
  durationSeconds,
  open,
  className,
}: {
  startedAt: string
  durationSeconds: number | null
  open: boolean
  className?: string
}) {
  const tick = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const classes = cn("font-mono tabular-nums", className)

  if (!open) {
    return (
      <span className={classes}>
        {durationSeconds === null ? "—" : formatDuration(durationSeconds)}
      </span>
    )
  }
  if (tick === null) return <span className={classes}>…</span>
  return (
    <span className={classes}>
      {formatDuration((tick * TICK_MS - Date.parse(startedAt)) / 1000)}
    </span>
  )
}
