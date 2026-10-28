"use client"

import { useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2Icon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  IncidentListParams,
  IncidentPeriod,
  MonitorOption,
} from "@/lib/incidents"

const PERIODS: { value: IncidentPeriod; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

const STATES = [
  { value: "all", label: "Ongoing + resolved" },
  { value: "ongoing", label: "Ongoing only" },
  { value: "resolved", label: "Resolved only" },
] as const

/** Filters live in the URL, so the list is shareable and survives reloads. */
export function IncidentFilters({
  params,
  monitors,
}: {
  params: IncidentListParams
  monitors: MonitorOption[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function set(
    key: "monitor" | "period" | "state",
    value: string,
    fallback: string
  ) {
    const next = new URLSearchParams(searchParams)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    next.delete("before") // new filter → first page
    const query = next.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      })
    })
  }

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={params.monitor ?? "all"}
        onValueChange={(v) => set("monitor", v, "all")}
      >
        <SelectTrigger
          className="w-full sm:w-56"
          aria-label="Filter by monitor"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All monitors</SelectItem>
          {monitors.map((monitor) => (
            <SelectItem key={monitor.id} value={monitor.id}>
              {monitor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select
          value={params.period}
          onValueChange={(v) => set("period", v, "30d")}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={params.state}
          onValueChange={(v) => set("state", v, "all")}
        >
          <SelectTrigger
            className="w-full sm:w-48"
            aria-label="Filter by state"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATES.map((state) => (
              <SelectItem key={state.value} value={state.value}>
                {state.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {pending && (
        <Loader2Icon
          className="size-4 animate-spin text-muted-foreground"
          role="status"
          aria-label="Loading"
        />
      )}
    </div>
  )
}
