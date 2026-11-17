"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

const LABELS: Record<string, string> = { google: "Google", github: "GitHub" }

/** Result of a "Connect" round-trip (?linked= / ?link=), then a clean URL. */
export function LinkResultNotice() {
  const params = useSearchParams()
  const router = useRouter()
  const linked = params.get("linked")
  const failure = params.get("link")
  const provider =
    LABELS[params.get("provider") ?? linked ?? ""] ?? "That login"

  useEffect(() => {
    if (!linked && !failure) return
    if (failure === "in_use") {
      toast.error(
        `${provider} is already connected to another PingBoard account.`
      )
    } else if (failure === "exists") {
      toast.error(
        `Another ${provider} account is already connected. Disconnect it first.`
      )
    } else if (linked) {
      toast.success(`${provider} connected. You can log in with it now.`)
    }
    router.replace("/app/settings", { scroll: false })
  }, [linked, failure, provider, router])

  return null
}
