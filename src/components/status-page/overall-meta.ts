import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  type LucideIcon,
} from "lucide-react"

import type { OverallStatus } from "@shared/status-page"

type OverallMeta = {
  icon: LucideIcon
  /** Banner surface and border. */
  banner: string
  iconClass: string
}

// Full class names so Tailwind can see them. Every state has its own icon
// as well as its colour, so it never relies on colour alone.
export const OVERALL_META: Record<OverallStatus, OverallMeta> = {
  operational: {
    icon: CircleCheckIcon,
    banner: "border-up/30 bg-up/10",
    iconClass: "text-up",
  },
  degraded: {
    icon: CircleAlertIcon,
    banner: "border-degraded/30 bg-degraded/10",
    iconClass: "text-degraded",
  },
  partial: {
    icon: CircleAlertIcon,
    banner: "border-degraded/30 bg-degraded/10",
    iconClass: "text-degraded",
  },
  major: {
    icon: CircleXIcon,
    banner: "border-down/30 bg-down/10",
    iconClass: "text-down",
  },
  unknown: {
    icon: CircleDashedIcon,
    banner: "border-border bg-muted/50",
    iconClass: "text-muted-foreground",
  },
}
