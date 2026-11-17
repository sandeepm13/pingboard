import type {
  ALERT_CHANNEL_TYPES,
  ALERT_DELIVERY_STATUSES,
  ALERT_KINDS,
  ALERT_REMINDER_MINUTES,
  CHECK_INTERVALS_MINUTES,
  CHECK_STATUSES,
  HTTP_METHODS,
  INCIDENT_RESOLUTIONS,
  MONITOR_STATUSES,
  OAUTH_PROVIDERS,
  PLANS,
  STATUS_PAGE_THEMES,
} from "./constants"

export type StatusPageTheme = (typeof STATUS_PAGE_THEMES)[number]

export type MonitorStatus = (typeof MONITOR_STATUSES)[number]

export type AlertChannelType = (typeof ALERT_CHANNEL_TYPES)[number]

export type AlertKind = (typeof ALERT_KINDS)[number]

export type AlertDeliveryStatus = (typeof ALERT_DELIVERY_STATUSES)[number]

export type AlertReminderMinutes = (typeof ALERT_REMINDER_MINUTES)[number]

export type IncidentResolution = (typeof INCIDENT_RESOLUTIONS)[number]

export type CheckStatus = (typeof CHECK_STATUSES)[number]

export type Plan = (typeof PLANS)[number]

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

export type HttpMethod = (typeof HTTP_METHODS)[number]

export type CheckIntervalMinutes = (typeof CHECK_INTERVALS_MINUTES)[number]

/** Inclusive range of accepted HTTP status codes, e.g. 200–299. */
export type StatusCodeRange = { from: number; to: number }

export type RequestHeader = { name: string; value: string }

/** One slot of an uptime bar (e.g. one hour of a 24h bar). */
export type UptimeSlot = {
  /** ISO timestamp of the slot start (UTC). */
  start: string
  /** null when there are no checks in this slot. */
  status: MonitorStatus | null
  /** Uptime % within the slot, 0–100. */
  uptime: number | null
  /** Checks in the slot, when known. */
  checks?: number
}
