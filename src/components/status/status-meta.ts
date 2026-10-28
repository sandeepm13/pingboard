import type { MonitorStatus } from "@shared/types"

type StatusMeta = {
  label: string
  dot: string
  text: string
  badge: string
}

// Full class names (not built from strings) so Tailwind can see them.
export const STATUS_META: Record<MonitorStatus, StatusMeta> = {
  up: {
    label: "Up",
    dot: "bg-up",
    text: "text-up",
    badge: "border-up/25 bg-up/10 text-up",
  },
  down: {
    label: "Down",
    dot: "bg-down",
    text: "text-down",
    badge: "border-down/25 bg-down/10 text-down",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-degraded",
    text: "text-degraded",
    badge: "border-degraded/25 bg-degraded/10 text-degraded",
  },
  paused: {
    label: "Paused",
    dot: "bg-paused",
    text: "text-paused",
    badge: "border-paused/25 bg-paused/10 text-paused",
  },
  // Hollow dot: "not checked yet" reads differently from "paused" even in greyscale.
  pending: {
    label: "Pending",
    dot: "border-[1.5px] border-muted-foreground bg-transparent",
    text: "text-muted-foreground",
    badge: "border-border bg-muted/50 text-muted-foreground",
  },
}
