import { STATUS_CODES } from "node:http"

import { DEGRADED_ALERT_STREAK } from "../constants"
import { formatDuration } from "../time"
import type { AlertMessage } from "./types"

// Plain-text building blocks and the per-event messages. Pure (time and
// zone are passed in), so the exact wording is unit-tested.

export type AlertContext = {
  /** APP_URL, without a trailing slash. */
  appUrl: string
  /** The user's IANA zone (User.timezone). */
  timeZone: string
  now: Date
}

export type AlertMonitor = { id: string; name: string; url: string }

export type AlertIncident = {
  id: string
  startedAt: Date
  resolvedAt: Date | null
  durationSeconds: number | null
  cause: { statusCode: number | null; errorMessage: string | null }
  checksFailed: number
}

/** "142 ms" / "2.4 s". */
export function formatMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}

export function statusLine(code: number): string {
  const text = STATUS_CODES[code]
  return text ? `${code} ${text}` : String(code)
}

/** "503 Service Unavailable", "Timeout after 10s", "Keyword not found (200 OK)". */
export function describeCause(cause: AlertIncident["cause"]): string {
  const { statusCode, errorMessage } = cause
  if (statusCode !== null) {
    // "Unexpected status 503" says nothing the status line doesn't.
    if (!errorMessage || /^Unexpected status \d+$/.test(errorMessage)) {
      return statusLine(statusCode)
    }
    return `${errorMessage} (${statusLine(statusCode)})`
  }
  return errorMessage ?? "Unknown error"
}

const ZONE_LOCALES = ["en-US", "en-GB", "en-IN", "en-AU"]

/** "IST", "EDT", "CET"… or "GMT+5:45" when no English locale has a short name. */
export function zoneAbbreviation(date: Date, timeZone: string): string {
  let fallback = timeZone
  for (const locale of ZONE_LOCALES) {
    const name = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value
    if (!name) continue
    if (!/^GMT[+-]/.test(name)) return name
    if (fallback === timeZone) fallback = name
  }
  return fallback
}

/** "10:42 IST", or "Oct 25, 10:42 IST" when it isn't within the last 20 hours. */
export function formatAlertTime(
  date: Date,
  timeZone: string,
  now: Date
): string {
  const recent = now.getTime() - date.getTime() < 20 * 60 * 60 * 1000
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(!recent && { month: "short", day: "numeric" }),
  }).format(date)
  return `${time} ${zoneAbbreviation(date, timeZone)}`
}

/** "Nov 8, 2026". */
function formatDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const incidentUrl = (ctx: AlertContext, incident: AlertIncident) =>
  `${ctx.appUrl}/app/incidents/${incident.id}`
const monitorUrl = (ctx: AlertContext, monitor: AlertMonitor) =>
  `${ctx.appUrl}/app/monitors/${monitor.id}`

export function downMessage(
  monitor: AlertMonitor,
  incident: AlertIncident,
  ctx: AlertContext
): AlertMessage {
  const cause = describeCause(incident.cause)
  const since = formatAlertTime(incident.startedAt, ctx.timeZone, ctx.now)
  return {
    title: `🔴 ${monitor.name} is DOWN`,
    text: `🔴 ${monitor.name} is DOWN — ${cause} — ${monitor.url} — since ${since}`,
    fields: [
      { label: "Cause", value: cause },
      { label: "URL", value: monitor.url },
      { label: "Down since", value: since },
    ],
    url: incidentUrl(ctx, incident),
    linkLabel: "View incident",
    tone: "down",
  }
}

export function reminderMessage(
  monitor: AlertMonitor,
  incident: AlertIncident,
  ctx: AlertContext
): AlertMessage {
  const cause = describeCause(incident.cause)
  const elapsed = formatDuration(
    (ctx.now.getTime() - incident.startedAt.getTime()) / 1000
  )
  const since = formatAlertTime(incident.startedAt, ctx.timeZone, ctx.now)
  return {
    title: `🔴 ${monitor.name} is still DOWN (${elapsed})`,
    text: `🔴 ${monitor.name} is still DOWN after ${elapsed} — ${cause} — ${monitor.url} — since ${since}`,
    fields: [
      { label: "Down for", value: elapsed },
      { label: "Cause", value: cause },
      { label: "Failed checks", value: String(incident.checksFailed) },
    ],
    url: incidentUrl(ctx, incident),
    linkLabel: "View incident",
    tone: "down",
  }
}

export function recoveredMessage(
  monitor: AlertMonitor,
  incident: AlertIncident,
  ctx: AlertContext
): AlertMessage {
  const end = incident.resolvedAt ?? ctx.now
  const seconds =
    incident.durationSeconds ??
    (end.getTime() - incident.startedAt.getTime()) / 1000
  const duration = formatDuration(seconds)
  return {
    title: `🟢 ${monitor.name} is back UP`,
    text: `🟢 ${monitor.name} is back UP after ${duration}`,
    fields: [
      { label: "Downtime", value: duration },
      { label: "Cause", value: describeCause(incident.cause) },
      {
        label: "Recovered at",
        value: formatAlertTime(end, ctx.timeZone, ctx.now),
      },
    ],
    url: incidentUrl(ctx, incident),
    linkLabel: "View incident",
    tone: "up",
  }
}

export function sslMessage(
  monitor: AlertMonitor,
  expiresAt: Date,
  ctx: AlertContext
): AlertMessage {
  const days = Math.floor(
    (expiresAt.getTime() - ctx.now.getTime()) / (24 * 60 * 60 * 1000)
  )
  const when =
    days < 0
      ? "has expired"
      : days === 0
        ? "expires today"
        : `expires in ${days} day${days === 1 ? "" : "s"}`
  const host = new URL(monitor.url).hostname
  return {
    title: `⚠️ SSL certificate for ${monitor.name} ${when}`,
    text: `⚠️ The SSL certificate of ${host} (${monitor.name}) ${when} — on ${formatDay(expiresAt, ctx.timeZone)}. Renew it before visitors see a security warning.`,
    fields: [
      { label: "Host", value: host },
      { label: "Expires", value: formatDay(expiresAt, ctx.timeZone) },
    ],
    url: monitorUrl(ctx, monitor),
    linkLabel: "View monitor",
    tone: "warning",
  }
}

export function degradedMessage(
  monitor: AlertMonitor,
  slow: { responseTimeMs: number; thresholdMs: number },
  ctx: AlertContext
): AlertMessage {
  return {
    title: `🟡 ${monitor.name} is slow`,
    text: `🟡 ${monitor.name} is slow — ${DEGRADED_ALERT_STREAK} checks in a row over ${formatMs(slow.thresholdMs)} (last: ${formatMs(slow.responseTimeMs)}) — ${monitor.url}`,
    fields: [
      { label: "Last response", value: formatMs(slow.responseTimeMs) },
      { label: "Slow threshold", value: formatMs(slow.thresholdMs) },
      { label: "URL", value: monitor.url },
    ],
    url: monitorUrl(ctx, monitor),
    linkLabel: "View monitor",
    tone: "warning",
  }
}

export function testMessage(
  channelName: string,
  ctx: AlertContext
): AlertMessage {
  return {
    title: "✅ Test alert from PingBoard",
    text: `✅ Test alert from PingBoard — "${channelName}" is set up correctly. Down and recovery alerts will arrive here.`,
    fields: [
      { label: "Channel", value: channelName },
      {
        label: "Sent at",
        value: formatAlertTime(ctx.now, ctx.timeZone, ctx.now),
      },
    ],
    url: `${ctx.appUrl}/app/alerts`,
    linkLabel: "Open alert settings",
    tone: "info",
  }
}
