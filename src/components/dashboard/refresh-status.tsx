"use client"

import { RefreshCwOffIcon } from "lucide-react"

import { DASHBOARD_REFRESH_MS } from "@shared/constants"
import { RelativeTime } from "@/components/monitors/relative-time"

export function RefreshStatus({
  generatedAt,
  stale,
}: {
  generatedAt: string
  stale: boolean
}) {
  return (
    <div className="text-xs text-muted-foreground">
      {/* Only the failure is announced; "Updated 10s ago" ticking would be noise. */}
      <p className="sr-only" role="status">
        {stale ? "Couldn't refresh the dashboard. Retrying." : ""}
      </p>
      {stale ? (
        <p className="inline-flex items-center gap-1 text-degraded">
          <RefreshCwOffIcon className="size-3.5" aria-hidden="true" />
          Couldn&apos;t refresh. Showing data from&nbsp;
          <RelativeTime iso={generatedAt} />, retrying.
        </p>
      ) : (
        <p>
          Updated <RelativeTime iso={generatedAt} /> · refreshes every{" "}
          {DASHBOARD_REFRESH_MS / 1000} s
        </p>
      )}
    </div>
  )
}
