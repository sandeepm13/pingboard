import { MONITOR_STATUSES, STATUS_PAGE_THEMES } from "@shared/constants"
import type { OverallStatus } from "@shared/status-page"
import { ThemeScope } from "@/components/common/theme-scope"
import { PublicStatusBadge } from "@/components/status-page/public-status-badge"
import { StatusBanner } from "@/components/status-page/status-banner"

// Fixed timestamp: nothing here may depend on the clock (static prerender).
const AT = "2026-10-26T05:12:00.000Z"

const OVERALL: OverallStatus[] = [
  "operational",
  "degraded",
  "partial",
  "major",
  "unknown",
]

export function StatusPageDemos() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {OVERALL.map((overall) => (
          <StatusBanner key={overall} overall={overall} generatedAt={AT} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {MONITOR_STATUSES.map((status) => (
          <PublicStatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {STATUS_PAGE_THEMES.map((theme) => (
          <ThemeScope
            key={theme}
            theme={theme}
            className="space-y-2 rounded-xl border p-4"
          >
            <p className="font-mono text-xs text-muted-foreground">
              data-theme-scope=&quot;{theme}&quot;
            </p>
            <PublicStatusBadge status="up" />
            <PublicStatusBadge status="down" />
          </ThemeScope>
        ))}
      </div>
    </div>
  )
}
