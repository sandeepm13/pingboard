export function formatInterval(minutes: number): string {
  if (minutes === 60) return "1 hour"
  return minutes === 1 ? "1 minute" : `${minutes} minutes`
}

/** Compact form for dense rows: "5m", "1h". */
export function formatIntervalShort(minutes: number): string {
  return minutes === 60 ? "1h" : `${minutes}m`
}

export function formatTimeout(ms: number): string {
  return `${ms / 1000} s`
}

export function formatRelative(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${Math.floor(seconds / 10) * 10}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}
