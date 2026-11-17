"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

/** After "Delete account" (redirect to /?deleted=1): confirm, then tidy the URL. */
export function AccountDeletedNotice() {
  const deleted = useSearchParams().get("deleted") === "1"
  const router = useRouter()

  useEffect(() => {
    if (!deleted) return
    toast.success("Your account and all its data were deleted.")
    router.replace("/", { scroll: false })
  }, [deleted, router])

  return null
}
