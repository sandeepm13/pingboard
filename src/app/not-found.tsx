import type { Metadata } from "next"
import Link from "next/link"
import { CompassIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { StandalonePage } from "@/components/common/standalone-page"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
}

export default function NotFound() {
  return (
    <StandalonePage>
      <EmptyState
        icon={CompassIcon}
        title="Page not found"
        description="This page doesn't exist or has moved. Check the address, or head back to somewhere familiar."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/">Go to the home page</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app">Open dashboard</Link>
            </Button>
          </div>
        }
      />
      <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
        404
      </p>
    </StandalonePage>
  )
}
