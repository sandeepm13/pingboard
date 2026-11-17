"use client"

import { cn } from "cn"

/**
 * Native <select> of IANA zones grouped by region: searchable by typing,
 * works with every screen reader and mobile picker. The current value is
 * always offered, even if the server's list spells it differently (browsers
 * still report aliases like "Asia/Calcutta").
 */
export function TimeZoneSelect({
  zones,
  value,
  className,
  ...props
}: Omit<React.ComponentProps<"select">, "value" | "children"> & {
  zones: string[]
  value: string
}) {
  const all = zones.includes(value) ? zones : [value, ...zones]
  const groups = new Map<string, string[]>()
  for (const zone of all) {
    const region = zone.includes("/") ? zone.split("/")[0]! : "Other"
    groups.set(region, [...(groups.get(region) ?? []), zone])
  }

  return (
    <select
      value={value}
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 py-1 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30 [&_option]:bg-popover [&_option]:text-popover-foreground",
        className
      )}
      {...props}
    >
      {[...groups].map(([region, list]) => (
        <optgroup key={region} label={region}>
          {list.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
