import { LocalTime } from "@/components/common/local-time"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusCodeText } from "@/components/status/status-code-text"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CheckRow } from "@/lib/monitor-stats"

/** sm and up: a real table. */
export function CheckTable({ rows }: { rows: CheckRow[] }) {
  return (
    <div className="hidden sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5">Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Response</TableHead>
            <TableHead className="pr-5">Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-5">
                <LocalTime iso={row.checkedAt} format="datetime-seconds" />
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell>
                <StatusCodeText code={row.statusCode} />
              </TableCell>
              <TableCell>
                <ResponseTimeText ms={row.responseTimeMs} />
              </TableCell>
              <TableCell
                className="max-w-72 truncate pr-5 text-muted-foreground"
                title={row.errorMessage ?? undefined}
              >
                {row.errorMessage ?? ""}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/** Below sm: one card per check. */
export function CheckList({ rows }: { rows: CheckRow[] }) {
  return (
    <ul className="divide-y sm:hidden">
      {rows.map((row) => (
        <li key={row.id} className="space-y-1 px-4 py-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <LocalTime
              iso={row.checkedAt}
              format="datetime-seconds"
              className="text-xs text-muted-foreground"
            />
            <StatusBadge status={row.status} />
          </div>
          <div className="flex gap-4 text-xs">
            <span>
              <span className="text-muted-foreground">Code </span>
              <StatusCodeText code={row.statusCode} />
            </span>
            <span>
              <span className="text-muted-foreground">Response </span>
              <ResponseTimeText ms={row.responseTimeMs} />
            </span>
          </div>
          {row.errorMessage && (
            <p className="text-xs break-words text-down">{row.errorMessage}</p>
          )}
        </li>
      ))}
    </ul>
  )
}
