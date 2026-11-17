import { cn } from "cn"

import { OVERALL_STATUS_LABELS, type OverallStatus } from "@shared/status-page"
import { LocalTime } from "@/components/common/local-time"

import { OVERALL_META } from "./overall-meta"

/** The big line at the top: "All systems operational" / "Partial outage" / "Major outage". */
export function StatusBanner({
  overall,
  generatedAt,
}: {
  overall: OverallStatus
  generatedAt: string
}) {
  const meta = OVERALL_META[overall]
  const Icon = meta.icon

  return (
    <section
      aria-labelledby="overall-status"
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
        meta.banner
      )}
    >
      <div className="flex items-center gap-3">
        <Icon
          aria-hidden="true"
          className={cn("size-7 shrink-0", meta.iconClass)}
        />
        <h2
          id="overall-status"
          className="text-lg font-semibold tracking-tight sm:text-xl"
        >
          {OVERALL_STATUS_LABELS[overall]}
        </h2>
      </div>
      <p className="text-xs text-muted-foreground sm:text-right">
        Updated <LocalTime iso={generatedAt} format="time" />
      </p>
    </section>
  )
}
