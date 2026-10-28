import { cn } from "cn"

import type { TestCheckResult } from "@/actions/monitors"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusCodeText } from "@/components/status/status-code-text"

export type TestState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; url?: string; result: TestCheckResult }
  | { kind: "error"; message: string }

/** Always mounted so screen readers hear the result when it arrives. */
export function TestResult({ state }: { state: TestState }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {state.kind === "running" && (
        <p className="rounded-lg border px-3 py-2.5 text-sm text-muted-foreground">
          Running a check from PingBoard&apos;s server…
        </p>
      )}
      {state.kind === "error" && (
        <p className="rounded-lg border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
          {state.message}
        </p>
      )}
      {state.kind === "done" && (
        <div
          className={cn(
            "space-y-2 rounded-lg border px-3 py-2.5 text-sm",
            state.result.isUp ? "border-up/30" : "border-down/30"
          )}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="sr-only">Test result:</span>
            <StatusBadge status={state.result.status} />
            <span>
              <span className="text-muted-foreground">Status </span>
              <StatusCodeText code={state.result.statusCode} />
            </span>
            <span>
              <span className="text-muted-foreground">Response </span>
              <ResponseTimeText ms={state.result.responseTimeMs} />
            </span>
          </div>
          {state.result.errorMessage && (
            <p className="text-down">{state.result.errorMessage}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">
            {state.url ? (
              <>
                Tested <span className="font-mono">{state.url}</span>.{" "}
              </>
            ) : (
              "Checked with the saved settings. "
            )}
            Nothing was saved.
          </p>
        </div>
      )}
    </div>
  )
}
