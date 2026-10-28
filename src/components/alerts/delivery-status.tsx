import {
  CircleCheckIcon,
  CircleSlashIcon,
  CircleXIcon,
  ClockIcon,
  RotateCwIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import type { AlertDeliveryStatus } from "@shared/types"

const META: Record<
  AlertDeliveryStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  sent: { label: "Sent", icon: CircleCheckIcon, className: "text-up" },
  failed: { label: "Failed", icon: CircleXIcon, className: "text-down" },
  retrying: {
    label: "Retrying",
    icon: RotateCwIcon,
    className: "text-degraded",
  },
  queued: {
    label: "Queued",
    icon: ClockIcon,
    className: "text-muted-foreground",
  },
  skipped: {
    label: "Skipped",
    icon: CircleSlashIcon,
    className: "text-muted-foreground",
  },
}

/** Icon + word, so the status never depends on colour alone. */
export function DeliveryStatus({ status }: { status: AlertDeliveryStatus }) {
  const meta = META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        meta.className
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}
