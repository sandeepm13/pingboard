import Link from "next/link"
import { GlobeIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <EmptyState
        icon={GlobeIcon}
        title="Status page not found"
        description="This status page doesn't exist, or it isn't public."
        action={
          <Button asChild variant="outline">
            <Link href="/">Go to PingBoard</Link>
          </Button>
        }
        className="w-full"
      />
    </main>
  )
}
