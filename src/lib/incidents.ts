import "server-only"

import { z } from "zod"

import { describeCause } from "@shared/alerts/format"
import { AlertLog } from "@shared/models/alert-log"
import { CheckResult } from "@shared/models/check-result"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { objectIdSchema } from "@shared/schemas/common"
import type {
  AlertChannelType,
  AlertDeliveryStatus,
  AlertKind,
  CheckStatus,
  IncidentResolution,
} from "@shared/types"
import { connectDb } from "@/lib/db"

// Read models for /app/incidents, the incident page and the monitor page's
// incidents card. Every query is scoped by userId.

export const INCIDENT_PERIODS = ["24h", "7d", "30d", "90d", "all"] as const
export type IncidentPeriod = (typeof INCIDENT_PERIODS)[number]
const PERIOD_MS: Record<IncidentPeriod, number | null> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  all: null,
}
export const INCIDENT_STATES = ["all", "ongoing", "resolved"] as const

export const INCIDENTS_PAGE_SIZE = 25

const firstValue = (value: unknown) => (Array.isArray(value) ? value[0] : value)

/** Search params of /app/incidents; anything malformed falls back to the default. */
export const incidentListParamsSchema = z.object({
  monitor: z.preprocess(firstValue, objectIdSchema.optional().catch(undefined)),
  period: z.preprocess(firstValue, z.enum(INCIDENT_PERIODS).catch("30d")),
  state: z.preprocess(firstValue, z.enum(INCIDENT_STATES).catch("all")),
  before: z.preprocess(
    firstValue,
    z.iso.datetime().optional().catch(undefined)
  ),
})
export type IncidentListParams = z.output<typeof incidentListParamsSchema>

export type IncidentListItem = {
  id: string
  monitorId: string
  monitorName: string
  open: boolean
  startedAt: string
  resolvedAt: string | null
  durationSeconds: number | null
  resolution: IncidentResolution | null
  cause: string
  checksFailed: number
  acknowledged: boolean
}

type IncidentRow = Awaited<ReturnType<typeof findRows>>[number]

function findRows(filter: Record<string, unknown>, limit: number) {
  return Incident.find(filter)
    .select("-notes")
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean()
}

function toItem(
  row: IncidentRow,
  names: Map<string, string>
): IncidentListItem {
  return {
    id: row._id.toString(),
    monitorId: row.monitorId.toString(),
    monitorName: names.get(row.monitorId.toString()) ?? "Deleted monitor",
    open: row.open,
    startedAt: row.startedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    durationSeconds: row.durationSeconds ?? null,
    resolution: row.resolution ?? null,
    cause: describeCause({
      statusCode: row.cause.statusCode ?? null,
      errorMessage: row.cause.errorMessage ?? null,
    }),
    checksFailed: row.checksFailed,
    acknowledged: Boolean(row.acknowledgedAt),
  }
}

export type MonitorOption = { id: string; name: string }

async function monitorNames(userId: string): Promise<MonitorOption[]> {
  const monitors = await Monitor.find({ userId })
    .select("name")
    .sort({ name: 1 })
    .lean()
  return monitors.map((m) => ({ id: m._id.toString(), name: m.name }))
}

export type IncidentList = {
  ongoing: IncidentListItem[]
  resolved: IncidentListItem[]
  /** Cursor for the next (older) page of resolved incidents. */
  olderCursor: string | null
  monitors: MonitorOption[]
}

/**
 * Ongoing incidents (at most one per monitor, so always all of them, on the
 * first page only) followed by resolved ones in the period, newest first,
 * keyset-paginated on startedAt.
 */
export async function listIncidents(
  userId: string,
  params: IncidentListParams,
  now: Date
): Promise<IncidentList> {
  await connectDb()
  const monitors = await monitorNames(userId)
  const names = new Map(monitors.map((m) => [m.id, m.name]))
  const scope = {
    userId,
    ...(params.monitor && { monitorId: params.monitor }),
  }

  const periodMs = PERIOD_MS[params.period]
  const startedAt: Record<string, Date> = {}
  if (periodMs !== null) startedAt.$gte = new Date(now.getTime() - periodMs)
  if (params.before) startedAt.$lt = new Date(params.before)

  const [ongoing, resolved] = await Promise.all([
    params.state !== "resolved" && !params.before
      ? findRows({ ...scope, open: true }, 100)
      : [],
    params.state !== "ongoing"
      ? findRows(
          {
            ...scope,
            open: false,
            ...(Object.keys(startedAt).length && { startedAt }),
          },
          INCIDENTS_PAGE_SIZE + 1
        )
      : [],
  ])
  const page = resolved.slice(0, INCIDENTS_PAGE_SIZE)
  return {
    ongoing: ongoing.map((row) => toItem(row, names)),
    resolved: page.map((row) => toItem(row, names)),
    olderCursor:
      resolved.length > INCIDENTS_PAGE_SIZE
        ? (page.at(-1)?.startedAt.toISOString() ?? null)
        : null,
    monitors,
  }
}

/** The latest incidents of one monitor (ongoing first) for its page. */
export async function listMonitorIncidents(
  userId: string,
  monitorId: string,
  monitorName: string,
  limit = 5
): Promise<IncidentListItem[]> {
  await connectDb()
  const rows = await Incident.find({ userId, monitorId })
    .select("-notes")
    .sort({ open: -1, startedAt: -1 })
    .limit(limit)
    .lean()
  const names = new Map([[monitorId, monitorName]])
  return rows.map((row) => toItem(row, names))
}

export type IncidentAlert = {
  id: string
  kind: AlertKind
  status: AlertDeliveryStatus
  channelType: AlertChannelType
  channelName: string
  error: string | null
  attempts: number
  createdAt: string
  sentAt: string | null
}

export type FailedCheck = {
  id: string
  checkedAt: string
  status: CheckStatus
  statusCode: number | null
  responseTimeMs: number | null
  errorMessage: string | null
}

export const INCIDENT_CHECKS_LIMIT = 50

export async function getIncidentDetail(
  userId: string,
  id: unknown,
  now: Date
) {
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return null
  await connectDb()
  const incident = await Incident.findOne({ _id: parsed.data, userId }).lean()
  if (!incident) return null

  const until = incident.resolvedAt ?? now
  const [monitor, alerts, checks] = await Promise.all([
    Monitor.findOne({ _id: incident.monitorId, userId })
      .select("name url status intervalMinutes")
      .lean(),
    AlertLog.find({ incidentId: incident._id, userId })
      .select("-message")
      .sort({ createdAt: 1 })
      .limit(200)
      .lean(),
    CheckResult.find({
      monitorId: incident.monitorId,
      checkedAt: { $gte: incident.startedAt, $lte: until },
      isUp: false,
    })
      .sort({ checkedAt: -1 })
      .limit(INCIDENT_CHECKS_LIMIT)
      .lean(),
  ])

  return {
    incident: {
      ...toItem(
        incident,
        new Map([[incident.monitorId.toString(), monitor?.name ?? ""]])
      ),
      confirmedAt: incident.confirmedAt.toISOString(),
      acknowledgedAt: incident.acknowledgedAt?.toISOString() ?? null,
      notes: incident.notes ?? "",
      remindersSent: incident.remindersSent ?? 0,
    },
    monitor: monitor && {
      id: monitor._id.toString(),
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
    },
    alerts: alerts.map((a): IncidentAlert => ({
      id: a._id.toString(),
      kind: a.kind,
      status: a.status,
      channelType: a.channelType,
      channelName: a.channelName,
      error: a.error ?? null,
      attempts: a.attempts,
      createdAt: a.createdAt.toISOString(),
      sentAt: a.sentAt?.toISOString() ?? null,
    })),
    checks: checks.map((c): FailedCheck => ({
      id: c._id.toString(),
      checkedAt: c.checkedAt.toISOString(),
      status: c.status,
      statusCode: c.statusCode ?? null,
      responseTimeMs: c.responseTimeMs ?? null,
      errorMessage: c.errorMessage ?? null,
    })),
  }
}

export type IncidentDetail = NonNullable<
  Awaited<ReturnType<typeof getIncidentDetail>>
>
