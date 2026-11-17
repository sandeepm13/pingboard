"use client"

import { useEffect } from "react"
import { TriangleAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <EmptyState
      icon={TriangleAlertIcon}
      title="Couldn't load this page"
      description="Something went wrong on our side. Your monitors are safe; try again in a moment."
      action={<Button onClick={() => retry()}>Try again</Button>}
    />
  )
}
