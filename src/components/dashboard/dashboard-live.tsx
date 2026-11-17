"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ActivityIcon, PlusIcon, SearchXIcon } from "lucide-react"

import { EmptyState } from "@/components/common/empty-state"
import {
  EMPTY_FILTERS,
  MonitorFilters,
  type MonitorFilterState,
} from "@/components/monitors/monitor-filters"
import { Button } from "@/components/ui/button"
import type { DashboardData, DashboardMonitor } from "@/lib/dashboard"

import { DashboardMonitorList } from "./dashboard-monitor-list"
import { DownAnnouncer } from "./down-announcer"
import { RefreshStatus } from "./refresh-status"
import { SummaryCards } from "./summary-cards"
import { useDashboardData } from "./use-dashboard-data"
import { useDownTitle } from "./use-down-title"

function matches(monitor: DashboardMonitor, filters: MonitorFilterState) {
  const query = filters.query.trim().toLowerCase()
  if (
    query &&
    !monitor.name.toLowerCase().includes(query) &&
    !monitor.url.toLowerCase().includes(query)
  ) {
    return false
  }
  if (filters.status !== "all" && monitor.status !== filters.status) {
    return false
  }
  return filters.tag === "all" || monitor.tags.includes(filters.tag)
}

/** Plans cap monitors at 50, so filtering happens in the browser. */
export function DashboardLive({ initialData }: { initialData: DashboardData }) {
  const { data, stale } = useDashboardData(initialData)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  useDownTitle(data.summary.down, data.generatedAt)

  const { monitors } = data
  const tags = useMemo(
    () => [...new Set(monitors.flatMap((m) => m.tags))].sort(),
    [monitors]
  )
  const visible = monitors.filter((monitor) => matches(monitor, filters))
  const filtered = visible.length !== monitors.length

  if (monitors.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="Add your first monitor"
        description="Point PingBoard at a website or API and we'll check it on a schedule, then tell you the moment it goes down."
        action={
          <Button asChild>
            <Link href="/app/monitors/new">
              <PlusIcon aria-hidden="true" />
              Add your first monitor
            </Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        summary={data.summary}
        activeStatus={filters.status}
        onSelectStatus={(status) => setFilters({ ...filters, status })}
      />

      <section aria-labelledby="monitor-list-heading" className="space-y-3">
        <h2 id="monitor-list-heading" className="sr-only">
          Monitors
        </h2>
        <MonitorFilters value={filters} onChange={setFilters} tags={tags} />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered
              ? `Showing ${visible.length} of ${monitors.length} monitors`
              : `${monitors.length} ${monitors.length === 1 ? "monitor" : "monitors"}`}
          </p>
          <RefreshStatus generatedAt={data.generatedAt} stale={stale} />
        </div>
        {visible.length === 0 ? (
          <EmptyState
            icon={SearchXIcon}
            title="No monitors match"
            description="Try a different search, status or tag."
            action={
              <Button
                variant="outline"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <DashboardMonitorList monitors={visible} />
        )}
      </section>

      <DownAnnouncer monitors={monitors} />
    </div>
  )
}
