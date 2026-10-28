"use client"

import { useTransition } from "react"
import Link from "next/link"
import { FileClockIcon } from "lucide-react"

import { dismissDraftMonitorAction } from "@/actions/monitors"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"

/** The URL captured during onboarding, waiting to become a real monitor. */
export function DraftMonitorNotice({
  draft,
}: {
  draft: { url: string; name: string | null }
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      <FileClockIcon
        className="hidden size-4 shrink-0 text-muted-foreground sm:block"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          Finish setting up {draft.name || "your first monitor"}
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {draft.url}
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href="/app/monitors/new">Set it up</Link>
        </Button>
        <LoadingButton
          size="sm"
          variant="ghost"
          loading={pending}
          onClick={() => startTransition(() => dismissDraftMonitorAction())}
        >
          Dismiss
        </LoadingButton>
      </div>
    </div>
  )
}
