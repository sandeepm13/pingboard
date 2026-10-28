"use client"

import { SearchIcon } from "lucide-react"

import { MONITOR_STATUSES } from "@shared/constants"
import type { MonitorStatus } from "@shared/types"
import { STATUS_META } from "@/components/status/status-meta"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type MonitorFilterState = {
  query: string
  status: MonitorStatus | "all"
  tag: string
}

export const EMPTY_FILTERS: MonitorFilterState = {
  query: "",
  status: "all",
  tag: "all",
}

export function MonitorFilters({
  value,
  onChange,
  tags,
}: {
  value: MonitorFilterState
  onChange: (value: MonitorFilterState) => void
  tags: string[]
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Search monitors by name or URL"
          placeholder="Search name or URL"
          className="pl-8"
          value={value.query}
          onChange={(event) =>
            onChange({ ...value, query: event.target.value })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Select
          value={value.status}
          onValueChange={(status) =>
            onChange({
              ...value,
              status: status as MonitorFilterState["status"],
            })
          }
        >
          <SelectTrigger
            className="w-full sm:w-40"
            aria-label="Filter by status"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {MONITOR_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_META[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={value.tag}
          onValueChange={(tag) => onChange({ ...value, tag })}
          disabled={tags.length === 0}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by tag">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {tags.length === 0 ? "No tags" : "All tags"}
            </SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
