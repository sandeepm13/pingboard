import { cn } from "cn"

import type { MonitorStatus } from "@shared/types"

import { STATUS_META } from "./status-meta"

const SIZES = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
} as const

type StatusDotProps = {
  status: MonitorStatus
  size?: keyof typeof SIZES
  /** Soft pulse ring. Defaults to on for "up". */
  pulse?: boolean
  /** When set, the dot is announced to screen readers; otherwise it is decorative. */
  label?: string
  className?: string
}

export function StatusDot({
  status,
  size = "md",
  pulse = status === "up",
  label,
  className,
}: StatusDotProps) {
  const meta = STATUS_META[status]

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-flex shrink-0", SIZES[size], className)}
    >
      {pulse && (
        <span
          className={cn(
            "absolute inset-0 animate-pulse-ring rounded-full motion-reduce:hidden",
            meta.dot
          )}
        />
      )}
      <span className={cn("relative size-full rounded-full", meta.dot)} />
    </span>
  )
}
