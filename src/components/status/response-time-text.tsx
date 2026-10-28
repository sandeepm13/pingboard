import { cn } from "cn"

import { RESPONSE_TIME_MS } from "@shared/constants"

export function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function responseTimeTone(ms: number): "fast" | "slow" | "very-slow" {
  if (ms < RESPONSE_TIME_MS.fast) return "fast"
  if (ms < RESPONSE_TIME_MS.slow) return "slow"
  return "very-slow"
}

const TONE_CLASS = {
  fast: "text-up",
  slow: "text-degraded",
  "very-slow": "text-down",
} as const

export function ResponseTimeText({
  ms,
  className,
}: {
  ms: number | null | undefined
  className?: string
}) {
  if (ms == null) {
    return (
      <span className={cn("font-mono text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No data</span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        "font-mono tabular-nums",
        TONE_CLASS[responseTimeTone(ms)],
        className
      )}
    >
      {formatResponseTime(ms)}
    </span>
  )
}
