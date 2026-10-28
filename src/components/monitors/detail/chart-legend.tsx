// HTML legend so every series is named in text, not only by colour/dash.
export function ChartLegend({ daily }: { daily: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-0.5 w-4 rounded-full bg-chart-1"
        />
        Average{daily && " (per UTC day)"}
      </li>
      {daily && (
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-4 border-t-[1.5px] border-dashed border-muted-foreground"
          />
          p95
        </li>
      )}
      <li className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-3 rounded-[2px] bg-down/25" />
        Failed checks
      </li>
    </ul>
  )
}
