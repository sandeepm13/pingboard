"use server"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"

import { runHttpCheck, type HttpCheckResult } from "@shared/checks/http-check"
import { closeOpenIncident } from "@shared/incidents"
import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { CheckResult } from "@shared/models/check-result"
import { DailyStat } from "@shared/models/daily-stat"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { StatusPage } from "@shared/models/status-page"
import { User } from "@shared/models/user"
import { isIntervalAllowed, planLimits } from "@shared/plans"
import { objectIdSchema } from "@shared/schemas/common"
import {
  createMonitorInputSchema,
  createMonitorTestSchema,
  type MonitorInput,
} from "@shared/schemas/monitor"
import { resolvePublicTarget } from "@shared/security/ssrf"
import type { CheckStatus } from "@shared/types"
import { requireUser, type CurrentUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"
import { getEnv } from "@/lib/env"
import {
  findOwnedMonitor,
  resolveHeaders,
  toCheckRequest,
} from "@/lib/monitors"
import { statusPageTag } from "@/lib/public-status"
import { rateLimit } from "@/lib/rate-limit"
import { removeMonitorSchedule, syncMonitorSchedule } from "@/lib/scheduler"
import { encrypt } from "@/lib/secrets"

// Every action: requireUser() → Zod → queries scoped by { _id, userId }.
// A monitor owned by someone else gets the same answer as a missing one.

export type MonitorActionResult =
  | { ok: true; id: string }
  | { error: string; fieldErrors?: Record<string, string> }

export type TestCheckResult = {
  status: CheckStatus
  isUp: boolean
  statusCode: number | null
  responseTimeMs: number | null
  errorMessage: string | null
}

export type TestMonitorResult =
  | { ok: true; result: TestCheckResult }
  | { error: string; fieldErrors?: Record<string, string> }

const NOT_FOUND = { error: "Monitor not found." } as const

/** The dashboard and incidents, plus the monitor's own pages when it still exists. */
function revalidateMonitor(id?: string) {
  revalidatePath("/app")
  revalidatePath("/app/incidents")
  if (id) {
    revalidatePath(`/app/monitors/${id}`)
    revalidatePath(`/app/monitors/${id}/edit`)
  }
}

function invalid(error: z.ZodError) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message
  }
  return { error: "Please fix the highlighted fields.", fieldErrors }
}

function fieldError(field: string, message: string) {
  return { error: message, fieldErrors: { [field]: message } }
}

function schemaOptions() {
  return { allowPrivate: getEnv().SSRF_ALLOW_PRIVATE }
}

/** Shared create/update validation: Zod, plan interval, DNS-level SSRF check. */
async function validateMonitor(user: CurrentUser, input: unknown) {
  const parsed = createMonitorInputSchema(schemaOptions()).safeParse(input)
  if (!parsed.success)
    return { ok: false as const, result: invalid(parsed.error) }
  const data = parsed.data

  const limits = planLimits(user.plan)
  if (!isIntervalAllowed(user.plan, data.intervalMinutes)) {
    return {
      ok: false as const,
      result: fieldError(
        "intervalMinutes",
        `The ${limits.label} plan checks every ${limits.minIntervalMinutes} minutes at most.`
      ),
    }
  }

  const target = await resolvePublicTarget(data.url, schemaOptions())
  if (!target.ok) {
    return { ok: false as const, result: fieldError("url", target.reason) }
  }
  return { ok: true as const, data }
}

/** Alert settings to store; channel ids that aren't the user's are dropped. */
async function alertSettings(userId: string, data: MonitorInput) {
  await connectDb()
  const owned = data.alertChannelIds.length
    ? await AlertChannel.find({ _id: { $in: data.alertChannelIds }, userId })
        .select("_id")
        .lean()
    : []
  return {
    alertAllChannels: data.alertAllChannels,
    alertChannelIds: owned.map((channel) => channel._id),
    alertOnDegraded: data.alertOnDegraded,
  }
}

export async function createMonitorAction(
  input: unknown,
  options: { fromDraft?: boolean } = {}
): Promise<MonitorActionResult> {
  const user = await requireUser()
  const validated = await validateMonitor(user, input)
  if (!validated.ok) return validated.result
  const { data } = validated

  const headers = resolveHeaders(data.headers, [])
  if (!headers.ok)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: headers.fieldErrors,
    }

  await connectDb()
  const { maxMonitors, label } = planLimits(user.plan)
  const limitError = {
    error: `You've reached the ${label} plan limit of ${maxMonitors} monitors.`,
  }
  if ((await Monitor.countDocuments({ userId: user.id })) >= maxMonitors) {
    return limitError
  }

  const monitor = await Monitor.create({
    userId: user.id,
    name: data.name,
    url: data.url,
    method: data.method,
    intervalMinutes: data.intervalMinutes,
    timeoutMs: data.timeoutMs,
    expectedStatusCodes: data.expectedStatusCodes,
    headers: headers.headers.map((h) => ({
      name: h.name,
      value: encrypt(h.value),
    })),
    body: data.body === null ? null : encrypt(data.body),
    keyword: data.keyword,
    followRedirects: data.followRedirects,
    tags: data.tags,
    ...(await alertSettings(user.id, data)),
    status: "pending",
  })

  // Two parallel creates can both pass the count check; undo the extra one.
  if ((await Monitor.countDocuments({ userId: user.id })) > maxMonitors) {
    await Monitor.deleteOne({ _id: monitor._id, userId: user.id })
    return limitError
  }

  if (options.fromDraft === true) {
    await User.updateOne({ _id: user.id }, { $set: { draftMonitor: null } })
  }
  const monitorId = monitor._id.toString()
  await syncMonitorSchedule({
    id: monitorId,
    status: monitor.status,
    intervalMinutes: monitor.intervalMinutes,
  })
  revalidateMonitor()
  return { ok: true, id: monitorId }
}

export async function updateMonitorAction(
  id: unknown,
  input: unknown
): Promise<MonitorActionResult> {
  const user = await requireUser()
  const existing = await findOwnedMonitor(user.id, id)
  if (!existing) return NOT_FOUND

  const validated = await validateMonitor(user, input)
  if (!validated.ok) return validated.result
  const { data } = validated

  const headers = resolveHeaders(data.headers, existing.headers)
  if (!headers.ok)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: headers.fieldErrors,
    }

  // A new URL is a different target: forget the old results until it's checked.
  const urlChanged = existing.url !== data.url
  const resetState = urlChanged
    ? {
        ...(existing.status !== "paused" && { status: "pending" }),
        consecutiveFailures: 0,
        currentFailure: null,
        consecutiveSlow: 0,
        lastCheckedAt: null,
        lastStatusCode: null,
        lastResponseTimeMs: null,
        sslExpiresAt: null,
        sslCheckedAt: null,
      }
    : {}

  const update = await Monitor.updateOne(
    { _id: existing._id, userId: user.id },
    {
      $set: {
        name: data.name,
        url: data.url,
        method: data.method,
        intervalMinutes: data.intervalMinutes,
        timeoutMs: data.timeoutMs,
        expectedStatusCodes: data.expectedStatusCodes,
        headers: headers.headers.map((h) => ({
          name: h.name,
          value: encrypt(h.value),
        })),
        body: data.body === null ? null : encrypt(data.body),
        keyword: data.keyword,
        followRedirects: data.followRedirects,
        tags: data.tags,
        ...(await alertSettings(user.id, data)),
        ...resetState,
      },
    }
  )
  if (update.matchedCount === 0) return NOT_FOUND
  // The old URL's outage isn't this target's: end it without a recovery alert.
  const monitorId = existing._id.toString()
  if (urlChanged) await closeOpenIncident(monitorId, "changed", new Date())

  // A new URL gets checked right away instead of at the next tick.
  await syncMonitorSchedule(
    {
      id: monitorId,
      status: existing.status,
      intervalMinutes: data.intervalMinutes,
    },
    { restart: urlChanged }
  )
  revalidateMonitor(monitorId)
  return { ok: true, id: monitorId }
}

export async function setMonitorPausedAction(
  id: unknown,
  paused: unknown
): Promise<MonitorActionResult> {
  const user = await requireUser()
  const parsedId = objectIdSchema.safeParse(id)
  const parsedPaused = z.boolean().safeParse(paused)
  if (!parsedId.success || !parsedPaused.success) return NOT_FOUND

  await connectDb()
  const filter = { _id: parsedId.data, userId: user.id }
  // Resume only touches paused monitors, so a double click can't wipe a live status.
  if (parsedPaused.data) {
    await Monitor.updateOne(filter, { $set: { status: "paused" } })
  } else {
    await Monitor.updateOne(
      { ...filter, status: "paused" },
      {
        $set: {
          status: "pending",
          consecutiveFailures: 0,
          currentFailure: null,
          consecutiveSlow: 0,
        },
      }
    )
  }
  const monitor = await Monitor.findOne(filter)
    .select("status intervalMinutes")
    .lean()
  if (!monitor) return NOT_FOUND
  // Pausing ends an ongoing outage (no recovery alert: we stop knowing).
  if (monitor.status === "paused") {
    await closeOpenIncident(monitor._id, "paused", new Date())
  }
  // Sync from what's stored, so a repeated click still converges.
  await syncMonitorSchedule({
    id: parsedId.data,
    status: monitor.status,
    intervalMinutes: monitor.intervalMinutes,
  })

  revalidateMonitor(parsedId.data)
  return { ok: true, id: parsedId.data }
}

export async function deleteMonitorAction(
  id: unknown
): Promise<MonitorActionResult> {
  const user = await requireUser()
  const parsedId = objectIdSchema.safeParse(id)
  if (!parsedId.success) return NOT_FOUND

  await connectDb()
  const deleted = await Monitor.deleteOne({
    _id: parsedId.data,
    userId: user.id,
  })
  if (deleted.deletedCount === 0) return NOT_FOUND
  await removeMonitorSchedule(parsedId.data)
  const owned = { monitorId: parsedId.data, userId: user.id }
  const onPages = { userId: user.id, "monitors.monitorId": parsedId.data }
  const pages = await StatusPage.find(onPages).select("slug").lean()
  await Promise.all([
    CheckResult.deleteMany(owned),
    DailyStat.deleteMany(owned),
    Incident.deleteMany(owned),
    AlertLog.deleteMany(owned),
    StatusPage.updateMany(onPages, {
      $pull: { monitors: { monitorId: parsedId.data } },
    }),
  ])
  for (const page of pages) updateTag(statusPageTag(page.slug))

  revalidateMonitor()
  if (pages.length) revalidatePath("/app/status-pages")
  return { ok: true, id: parsedId.data }
}

/**
 * One check right now, from our server, without saving anything. On the edit
 * form `monitorId` lets blank header values fall back to the stored ones.
 */
export async function testMonitorAction(
  input: unknown,
  monitorId?: unknown
): Promise<TestMonitorResult> {
  const user = await requireUser()

  const limit = await rateLimit("monitorTestByUser", user.id)
  if (!limit.ok) {
    return {
      error: `That's a lot of tests. Try again in ${limit.retryAfterSec} s.`,
    }
  }

  const parsed = createMonitorTestSchema(schemaOptions()).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  let stored: { name: string; value: string }[] = []
  if (monitorId !== undefined) {
    const monitor = await findOwnedMonitor(user.id, monitorId)
    if (!monitor) return NOT_FOUND
    stored = monitor.headers
  }
  const headers = resolveHeaders(parsed.data.headers, stored)
  if (!headers.ok)
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: headers.fieldErrors,
    }

  const check = await runHttpCheck(
    { ...parsed.data, headers: headers.headers },
    schemaOptions()
  )
  return { ok: true, result: toTestResult(check) }
}

function toTestResult(check: HttpCheckResult): TestCheckResult {
  return {
    status: check.status,
    isUp: check.isUp,
    statusCode: check.statusCode,
    responseTimeMs: check.responseTimeMs,
    errorMessage: check.errorMessage,
  }
}

/**
 * "Test now" on the monitor page: one check of the saved settings, from our
 * server, not saved (the worker's schedule and the 2-failure rule are
 * untouched). Same rate limit and SSRF guard as the form's test.
 */
export async function testSavedMonitorAction(
  monitorId: unknown
): Promise<TestMonitorResult> {
  const user = await requireUser()

  const limit = await rateLimit("monitorTestByUser", user.id)
  if (!limit.ok) {
    return {
      error: `That's a lot of tests. Try again in ${limit.retryAfterSec} s.`,
    }
  }

  const monitor = await findOwnedMonitor(user.id, monitorId)
  if (!monitor) return NOT_FOUND
  const request = toCheckRequest(monitor)
  if (!request) {
    return { error: "This monitor's saved settings couldn't be read." }
  }
  const check = await runHttpCheck(request, schemaOptions())
  return { ok: true, result: toTestResult(check) }
}

export async function dismissDraftMonitorAction(): Promise<void> {
  const user = await requireUser()
  await connectDb()
  await User.updateOne({ _id: user.id }, { $set: { draftMonitor: null } })
  revalidateMonitor()
}
