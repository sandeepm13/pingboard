import Link from "next/link"
import { SearchXIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"

// notFound() from any /app page (a missing id, or one owned by someone else:
// both get the same answer).
export default function NotFound() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title="Not found"
      description="This monitor, incident or status page doesn't exist, or it was deleted."
      action={
        <Button asChild>
          <Link href="/app">Back to the dashboard</Link>
        </Button>
      }
    />
  )
}
