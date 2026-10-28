"use client"

import { useLinkStatus } from "next/link"
import { Loader2Icon } from "lucide-react"

/** Spinner shown inside a <Link> while its navigation is pending. */
export function LinkPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <Loader2Icon
      aria-hidden="true"
      className="size-3.5 animate-spin motion-reduce:animate-none"
    />
  )
}
