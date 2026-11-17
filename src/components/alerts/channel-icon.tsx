import {
  HashIcon,
  MailIcon,
  MessagesSquareIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import type { AlertChannelType } from "@shared/types"

const ICONS: Record<AlertChannelType, LucideIcon> = {
  email: MailIcon,
  discord: MessagesSquareIcon,
  slack: HashIcon,
  telegram: SendIcon,
}

/** Decorative: the channel type is always also written out next to it. */
export function ChannelIcon({
  type,
  className,
}: {
  type: AlertChannelType
  className?: string
}) {
  const Icon = ICONS[type]
  return (
    <Icon
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-muted-foreground", className)}
    />
  )
}
