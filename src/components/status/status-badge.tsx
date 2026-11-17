import { cn } from "cn"

import type { MonitorStatus } from "@shared/types"
import { Badge } from "@/components/ui/badge"

import { StatusDot } from "./status-dot"
import { STATUS_META } from "./status-meta"

export function StatusBadge({
  status,
  className,
}: {
  status: MonitorStatus
  className?: string
}) {
  const meta = STATUS_META[status]

  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.badge, className)}>
      <StatusDot status={status} size="sm" />
      {meta.label}
    </Badge>
  )
}
