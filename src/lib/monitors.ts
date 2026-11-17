import "server-only"

import type { z } from "zod"

import type { HttpCheckRequest } from "@shared/checks/http-check"
import {
  CHECK_TIMEOUT_MS,
  DEFAULT_CHECK_INTERVAL_MINUTES,
  DEFAULT_EXPECTED_STATUS_CODES,
} from "@shared/constants"
import { Monitor, type MonitorDoc } from "@shared/models/monitor"
import { planLimits } from "@shared/plans"
import { objectIdSchema } from "@shared/schemas/common"
import type {
  MonitorFormValues,
  monitorHeaderSchema,
} from "@shared/schemas/monitor"
import { formatStatusCodes } from "@shared/status-codes"
import type {
  CheckIntervalMinutes,
  HttpMethod,
  MonitorStatus,
  Plan,
  RequestHeader,
} from "@shared/types"
import { connectDb } from "@/lib/db"
import { decrypt } from "@/lib/secrets"

// Ownership-scoped reads. Every query includes userId, so a monitor that
// belongs to someone else is indistinguishable from one that doesn't exist.

export type MonitorListItem = {
  id: string
  name: string
  url: string
  method: HttpMethod
  intervalMinutes: number
  status: MonitorStatus
  lastCheckedAt: string | null
  lastStatusCode: number | null
  lastResponseTimeMs: number | null
  tags: string[]
}

export type MonitorRecord = MonitorDoc & { _id: { toString(): string } }

export async function listMonitors(userId: string): Promise<MonitorListItem[]> {
  await connectDb()
  const monitors = await Monitor.find({ userId })
    .select("-headers -body")
    .sort({ createdAt: -1 })
    .lean<MonitorRecord[]>()
  return monitors.map((monitor) => ({
    id: monitor._id.toString(),
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    intervalMinutes: monitor.intervalMinutes,
    status: monitor.status,
    lastCheckedAt: monitor.lastCheckedAt?.toISOString() ?? null,
    lastStatusCode: monitor.lastStatusCode ?? null,
    lastResponseTimeMs: monitor.lastResponseTimeMs ?? null,
    tags: monitor.tags,
  }))
}

export async function countMonitors(userId: string): Promise<number> {
  await connectDb()
  return Monitor.countDocuments({ userId })
}

/** null for malformed ids, missing monitors and monitors owned by someone else. */
export async function findOwnedMonitor(
  userId: string,
  id: unknown
): Promise<MonitorRecord | null> {
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return null
  await connectDb()
  return Monitor.findOne({ _id: parsed.data, userId }).lean<MonitorRecord>()
}

function safeDecrypt(value: string, what: string): string | null {
  try {
    return decrypt(value)
  } catch {
    // Wrong/rotated ENCRYPTION_KEY or corrupted data. Never log the value.
    console.error(`[monitors] couldn't decrypt ${what}`)
    return null
  }
}

/**
 * The stored request with secrets decrypted, for a one-off check. null when
 * they can't be decrypted: never send the request without its headers.
 */
export function toCheckRequest(
  monitor: MonitorRecord
): HttpCheckRequest | null {
  const headers: RequestHeader[] = []
  for (const header of monitor.headers) {
    const value = safeDecrypt(header.value, "header")
    if (value === null) return null
    headers.push({ name: header.name, value })
  }
  let body: string | null = null
  if (monitor.method === "POST" && monitor.body) {
    body = safeDecrypt(monitor.body, "body")
    if (body === null) return null
  }
  return {
    url: monitor.url,
    method: monitor.method,
    headers,
    body,
    timeoutMs: monitor.timeoutMs,
    expectedStatusCodes: monitor.expectedStatusCodes,
    keyword: monitor.keyword ?? null,
    followRedirects: monitor.followRedirects,
  }
}

/**
 * Edit-form defaults. Header values are NOT sent to the browser: rows come
 * back empty with keepExisting, and the server re-uses the stored value.
 * The body is shown to its owner so it can be edited.
 */
export function toFormValues(monitor: MonitorRecord): MonitorFormValues {
  return {
    name: monitor.name,
    url: monitor.url,
    intervalMinutes: monitor.intervalMinutes as CheckIntervalMinutes,
    tags: monitor.tags.join(", "),
    method: monitor.method,
    timeoutMs: monitor.timeoutMs,
    expectedStatusCodes: formatStatusCodes(monitor.expectedStatusCodes),
    headers: monitor.headers.map((header) => ({
      name: header.name,
      value: "",
      keepExisting: true,
    })),
    body: monitor.body ? (safeDecrypt(monitor.body, "body") ?? "") : "",
    keyword: monitor.keyword ?? "",
    followRedirects: monitor.followRedirects,
    // lean() skips defaults: monitors saved before Stage 6 alert every channel.
    alertAllChannels: monitor.alertAllChannels !== false,
    alertChannelIds: (monitor.alertChannelIds ?? []).map((id) => id.toString()),
    alertOnDegraded: monitor.alertOnDegraded === true,
  }
}

export function newMonitorDefaults(
  plan: Plan,
  draft: { url: string; name: string | null } | null
): MonitorFormValues {
  return {
    name: draft?.name ?? "",
    url: draft?.url ?? "",
    intervalMinutes: Math.max(
      DEFAULT_CHECK_INTERVAL_MINUTES,
      planLimits(plan).minIntervalMinutes
    ) as CheckIntervalMinutes,
    tags: "",
    method: "GET",
    timeoutMs: CHECK_TIMEOUT_MS.default,
    expectedStatusCodes: DEFAULT_EXPECTED_STATUS_CODES,
    headers: [],
    body: "",
    keyword: "",
    followRedirects: true,
    alertAllChannels: true,
    alertChannelIds: [],
    alertOnDegraded: false,
  }
}

/** Open "Advanced" on the edit form when anything in it differs from the defaults. */
export function usesAdvancedOptions(values: MonitorFormValues): boolean {
  return (
    values.method !== "GET" ||
    values.headers.length > 0 ||
    Boolean(values.keyword) ||
    values.expectedStatusCodes !== DEFAULT_EXPECTED_STATUS_CODES ||
    values.timeoutMs !== CHECK_TIMEOUT_MS.default ||
    !values.followRedirects
  )
}

type HeaderInput = z.output<typeof monitorHeaderSchema>

export type ResolvedHeaders =
  | { ok: true; headers: RequestHeader[] }
  | { ok: false; fieldErrors: Record<string, string> }

/**
 * Plain-text header values for a request or for re-encryption. Empty values
 * marked keepExisting take the stored value of the same header; there is no
 * other way to obtain a stored value.
 */
export function resolveHeaders(
  input: HeaderInput[],
  stored: { name: string; value: string }[]
): ResolvedHeaders {
  const fieldErrors: Record<string, string> = {}
  const headers: RequestHeader[] = []

  input.forEach((header, index) => {
    if (header.value) {
      headers.push({ name: header.name, value: header.value })
      return
    }
    const existing = header.keepExisting
      ? stored.find((s) => s.name.toLowerCase() === header.name.toLowerCase())
      : undefined
    const value = existing ? safeDecrypt(existing.value, "header") : null
    if (value === null) {
      fieldErrors[`headers.${index}.value`] = "Enter a value"
      return
    }
    headers.push({ name: header.name, value })
  })

  return Object.keys(fieldErrors).length
    ? { ok: false, fieldErrors }
    : { ok: true, headers }
}
