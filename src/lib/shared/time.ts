// Time-zone helpers for bucketing checks into the user's local hours.

export const HOUR_MS = 60 * 60 * 1000

/** "45s", "7m 12s", "2h 5m", "3d 4h" (two units at most). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const days = Math.floor(s / 86_400)
  const hours = Math.floor((s % 86_400) / 3_600)
  const minutes = Math.floor((s % 3_600) / 60)
  const seconds = s % 60
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes ? `${hours}h ${minutes}m` : `${hours}h`
  if (minutes > 0) return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`
  return `${seconds}s`
}

/** Whole days from `now` until `date`; negative once it has passed. */
export function daysUntil(date: Date, now: number = Date.now()): number {
  return Math.floor((date.getTime() - now) / (24 * HOUR_MS))
}

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value })
    return true
  } catch {
    return false
  }
}

// Node's Intl lists some zones under their old names ("Asia/Calcutta"), and
// Chrome reports those too. Pickers show the current names so people can find
// their city; both spellings are valid IANA ids, so stored values keep working.
const CURRENT_ZONE_NAMES: Record<string, string> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Louisville": "America/Kentucky/Louisville",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
}

/** The zone's current IANA name, when the runtime accepts it. */
export function currentZoneName(zone: string): string {
  const renamed = CURRENT_ZONE_NAMES[zone]
  return renamed && isValidTimeZone(renamed) ? renamed : zone
}

/** The stored zone if the runtime knows it, else UTC. */
export function safeTimeZone(value: string | null | undefined): string {
  return value && isValidTimeZone(value) ? value : "UTC"
}

/**
 * Start of the local hour that contains `now` in `timeZone`. Works for zones
 * with :30/:45 offsets (e.g. Asia/Kolkata), where local hours don't start on
 * UTC hours.
 */
export function startOfHourIn(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    minute: "numeric",
    second: "numeric",
  }).formatToParts(now)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0)
  return new Date(
    now.getTime() - (minute * 60 + second) * 1000 - now.getUTCMilliseconds()
  )
}
