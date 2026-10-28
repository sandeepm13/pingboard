"use client"

import { useState } from "react"

import type { DashboardMonitor } from "@/lib/dashboard"

function downIds(monitors: DashboardMonitor[]) {
  return monitors
    .filter((m) => m.status === "down")
    .map((m) => m.id)
    .sort()
    .join(",")
}

function describeChange(
  previous: string,
  monitors: DashboardMonitor[]
): string {
  const before = new Set(previous ? previous.split(",") : [])
  const nowDown = monitors.filter((m) => m.status === "down")
  const newlyDown = nowDown.filter((m) => !before.has(m.id))
  const recovered = monitors.filter(
    (m) => before.has(m.id) && m.status !== "down"
  )
  return [
    ...newlyDown.map((m) => `${m.name} is down.`),
    ...recovered.map((m) => `${m.name} is back up.`),
  ].join(" ")
}

/**
 * Screen-reader announcement when a refresh brings a monitor down or back up.
 * Silent on first render: the page itself already says what's down.
 */
export function DownAnnouncer({ monitors }: { monitors: DashboardMonitor[] }) {
  const ids = downIds(monitors)
  const [previous, setPrevious] = useState(ids)
  const [message, setMessage] = useState("")

  // Adjusting state during render (not in an effect) on a change of input.
  if (ids !== previous) {
    setPrevious(ids)
    setMessage(describeChange(previous, monitors))
  }

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </p>
  )
}
