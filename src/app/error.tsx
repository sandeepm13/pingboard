"use client"

import { useEffect } from "react"
import Link from "next/link"
import { TriangleAlertIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { StandalonePage } from "@/components/common/standalone-page"
import { Button } from "@/components/ui/button"

// Public pages (landing, docs, auth, status pages). /app has its own boundary.
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
    <StandalonePage>
      <EmptyState
        icon={TriangleAlertIcon}
        title="Something went wrong"
        description="This page couldn't be loaded. It's on our side, not yours; try again in a moment."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go to the home page</Link>
            </Button>
          </div>
        }
      />
    </StandalonePage>
  )
}
