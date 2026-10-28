import Link from "next/link"
import { BellOffIcon, ChevronRightIcon } from "lucide-react"

import { LocalTime } from "@/components/common/local-time"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { IncidentListItem } from "@/lib/incidents"

import { IncidentDuration } from "./incident-duration"
import { IncidentStateBadge } from "./incident-state-badge"

function Acknowledged({ item }: { item: IncidentListItem }) {
  if (!item.open || !item.acknowledged) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <BellOffIcon className="size-3" aria-hidden="true" />
      Acknowledged
    </span>
  )
}

/** md and up: a table. Below md: one card per incident (IncidentCards). */
export function IncidentTable({
  items,
  showMonitor = true,
}: {
  items: IncidentListItem[]
  showMonitor?: boolean
}) {
  return (
    <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">State</TableHead>
            {showMonitor && <TableHead>Monitor</TableHead>}
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Cause</TableHead>
            <TableHead className="text-right">Failed checks</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Open</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className={item.open ? "bg-down/5" : undefined}
            >
              <TableCell className="pl-5">
                <div className="flex flex-col items-start gap-1">
                  <IncidentStateBadge
                    open={item.open}
                    resolution={item.resolution}
                  />
                  <Acknowledged item={item} />
                </div>
              </TableCell>
              {showMonitor && (
                <TableCell className="max-w-48 truncate font-medium">
                  {item.monitorName}
                </TableCell>
              )}
              <TableCell>
                <LocalTime iso={item.startedAt} />
              </TableCell>
              <TableCell>
                <IncidentDuration
                  startedAt={item.startedAt}
                  durationSeconds={item.durationSeconds}
                  open={item.open}
                />
              </TableCell>
              <TableCell
                className="max-w-64 truncate text-muted-foreground"
                title={item.cause}
              >
                {item.cause}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {item.checksFailed}
              </TableCell>
              <TableCell className="pr-5">
                <Link
                  href={`/app/incidents/${item.id}`}
                  prefetch={false}
                  className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted"
                  aria-label={`Open incident on ${item.monitorName}`}
                >
                  <ChevronRightIcon className="size-4" aria-hidden="true" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function IncidentCards({
  items,
  showMonitor = true,
}: {
  items: IncidentListItem[]
  showMonitor?: boolean
}) {
  return (
    <ul className="divide-y md:hidden">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/app/incidents/${item.id}`}
            prefetch={false}
            className="block space-y-1.5 px-4 py-3 text-sm hover:bg-muted/40"
          >
            <div className="flex items-center justify-between gap-2">
              <IncidentStateBadge
                open={item.open}
                resolution={item.resolution}
              />
              <IncidentDuration
                startedAt={item.startedAt}
                durationSeconds={item.durationSeconds}
                open={item.open}
                className="text-xs"
              />
            </div>
            {showMonitor && (
              <p className="truncate font-medium">{item.monitorName}</p>
            )}
            <p className="text-xs break-words text-muted-foreground">
              {item.cause}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <LocalTime iso={item.startedAt} />
              <span>
                <span className="font-mono tabular-nums">
                  {item.checksFailed}
                </span>{" "}
                failed checks
              </span>
              <Acknowledged item={item} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
