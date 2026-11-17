import { cn } from "cn"

type StatCardProps = {
  label: string
  value: React.ReactNode
  /** Small line under the value, e.g. "last 24 h" or "of 1,240 checks". */
  hint?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

/** Label + big monospace value. Values should already be formatted. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1.5 truncate font-mono text-xl font-semibold tabular-nums sm:text-2xl">
        {value}
      </div>
      {hint && (
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  )
}

export function formatUptime(value: number | null): string {
  if (value == null) return "—"
  if (value === 100) return "100%"
  // Floor, so 99.996 % never shows as "100.00%".
  return `${(Math.floor(value * 100) / 100).toFixed(2)}%`
}
