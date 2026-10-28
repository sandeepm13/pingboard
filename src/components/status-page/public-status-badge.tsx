import { cn } from "cn"

import { PUBLIC_STATUS_LABELS } from "@shared/status-page"
import type { MonitorStatus } from "@shared/types"
import { StatusDot } from "@/components/status/status-dot"
import { STATUS_META } from "@/components/status/status-meta"

/** A service's status in visitor wording ("Operational", "Outage"), dot + text. */
export function PublicStatusBadge({
  status,
  className,
}: {
  status: MonitorStatus
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-sm font-medium",
        STATUS_META[status].text,
        className
      )}
    >
      <StatusDot status={status} size="sm" />
      {PUBLIC_STATUS_LABELS[status]}
    </span>
  )
}
