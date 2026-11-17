// Viewer-locale formatting. Call only on the client (after hydration) or in
// UI that renders only on interaction, such as tooltips.

export type DateStyle = "datetime" | "datetime-seconds" | "time" | "date"

const OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  datetime: {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  "datetime-seconds": {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
  time: { hour: "2-digit", minute: "2-digit" },
  date: { month: "short", day: "numeric" },
}

export function formatDate(
  value: string | number | Date,
  style: DateStyle,
  timeZone?: string
): string {
  return new Date(value).toLocaleString(undefined, {
    ...OPTIONS[style],
    timeZone,
  })
}

/** Daily stats are UTC days, so their dates are formatted in UTC. */
export function formatUtcDay(value: string | number | Date): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}
