import { CircleCheckIcon, CircleMinusIcon, SirenIcon } from "lucide-react"
import { cn } from "cn"

import type { IncidentResolution } from "@shared/types"
import { Badge } from "@/components/ui/badge"

/** Ongoing / Resolved / Closed, with an icon so it never relies on colour. */
export function IncidentStateBadge({
  open,
  resolution,
  className,
}: {
  open: boolean
  resolution: IncidentResolution | null
  className?: string
}) {
  if (open) {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 border-down/25 bg-down/10 text-down", className)}
      >
        <SirenIcon aria-hidden="true" />
        Ongoing
      </Badge>
    )
  }
  if (resolution === "recovered") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 border-up/25 bg-up/10 text-up", className)}
      >
        <CircleCheckIcon aria-hidden="true" />
        Resolved
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-border bg-muted/50 text-muted-foreground",
        className
      )}
      title={
        resolution === "paused"
          ? "Closed when the monitor was paused"
          : "Closed when the monitor's URL changed"
      }
    >
      <CircleMinusIcon aria-hidden="true" />
      Closed
    </Badge>
  )
}
