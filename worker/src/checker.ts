import { isValidObjectId } from "mongoose"

import {
  runHttpCheck,
  type HttpCheckRequest,
  type HttpCheckResult,
} from "@shared/checks/http-check"
import {
  nextCurrentFailure,
  nextMonitorState,
  nextSlowStreak,
} from "@shared/checks/monitor-state"
import { CheckResult } from "@shared/models/check-result"
import { Monitor } from "@shared/models/monitor"
import { unscheduleMonitor, type ChecksQueue } from "@shared/scheduler"
import { decryptSecret } from "@shared/security/secrets"

import type { AlertsQueue } from "./alerts/queue"
import type { WorkerEnv } from "./env"
import { queueSslAlertIfDue, updateIncidentAfterCheck } from "./incidents"
import type { Logger } from "./logger"
import { refreshSslExpiryIfDue } from "./ssl"

// One scheduled check: load the monitor fresh (edits apply on the next run),
// run the HTTP check, then save the result and the new monitor state.

export type CheckerDeps = {
  env: WorkerEnv
  logger: Logger
  queue: ChecksQueue
  alerts: AlertsQueue
  encryptionKey: Buffer
}

export type CheckOutcome =
  | { kind: "skipped"; reason: "missing" | "paused" | "changed" }
  | { kind: "checked"; result: HttpCheckResult }

type MonitorRecord = NonNullable<Awaited<ReturnType<typeof loadMonitor>>>

function loadMonitor(monitorId: string) {
  return Monitor.findById(monitorId).lean()
}

/** Decrypted request, or null when the stored secrets can't be decrypted. */
function buildRequest(
  monitor: MonitorRecord,
  key: Buffer
): HttpCheckRequest | null {
  try {
    return {
      url: monitor.url,
      method: monitor.method,
      headers: monitor.headers.map((header) => ({
        name: header.name,
        value: decryptSecret(header.value, key),
      })),
      body:
        monitor.method === "POST" && monitor.body
          ? decryptSecret(monitor.body, key)
          : null,
      timeoutMs: monitor.timeoutMs,
      expectedStatusCodes: monitor.expectedStatusCodes,
      keyword: monitor.keyword ?? null,
      followRedirects: monitor.followRedirects,
    }
  } catch {
    return null
  }
}

export async function processCheck(
  monitorId: string,
  deps: CheckerDeps
): Promise<CheckOutcome> {
  const { env, logger, queue } = deps
  const log = logger.child({ monitorId })

  const monitor = isValidObjectId(monitorId)
    ? await loadMonitor(monitorId)
    : null
  if (!monitor || monitor.status === "paused") {
    // The app normally removes these schedulers; this covers a missed removal.
    await unscheduleMonitor(queue, monitorId)
    log.info({ reason: monitor ? "paused" : "missing" }, "scheduler removed")
    return { kind: "skipped", reason: monitor ? "paused" : "missing" }
  }

  const request = buildRequest(monitor, deps.encryptionKey)
  let result: HttpCheckResult
  if (request) {
    result = await runHttpCheck(request, {
      allowPrivate: env.SSRF_ALLOW_PRIVATE,
      userAgent: env.CHECK_USER_AGENT,
      slowThresholdMs: env.SLOW_THRESHOLD_MS,
    })
  } else {
    // Wrong/rotated ENCRYPTION_KEY. Fail loudly instead of sending without headers.
    log.error("couldn't decrypt the monitor's headers/body (ENCRYPTION_KEY?)")
    result = {
      status: "down",
      isUp: false,
      statusCode: null,
      responseTimeMs: null,
      errorMessage: "Saved request settings couldn't be read",
      checkedAt: new Date(),
    }
  }

  const transition = nextMonitorState(monitor, result.status)
  const failure = nextCurrentFailure(monitor, result)
  const slowStreak = nextSlowStreak(monitor.consecutiveSlow ?? 0, result.status)
  // Optimistic write: if the monitor was edited, paused or checked by someone
  // else since we loaded it, updatedAt moved and this (stale) result is dropped.
  const update = await Monitor.updateOne(
    { _id: monitor._id, updatedAt: monitor.updatedAt, status: monitor.status },
    {
      $set: {
        status: transition.status,
        consecutiveFailures: transition.consecutiveFailures,
        currentFailure: failure,
        consecutiveSlow: slowStreak,
        lastCheckedAt: result.checkedAt,
        lastStatusCode: result.statusCode,
        lastResponseTimeMs: result.responseTimeMs,
      },
    }
  )
  if (update.matchedCount === 0) {
    log.info("monitor changed during the check; result discarded")
    return { kind: "skipped", reason: "changed" }
  }

  await CheckResult.create({
    monitorId: monitor._id,
    userId: monitor.userId,
    checkedAt: result.checkedAt,
    status: result.status,
    isUp: result.isUp,
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    errorMessage: result.errorMessage,
  })

  log.debug(
    {
      host: new URL(monitor.url).host,
      check: result.status,
      statusCode: result.statusCode,
      ms: result.responseTimeMs,
      error: result.errorMessage,
      failures: transition.consecutiveFailures,
    },
    "check done"
  )

  if (transition.changed) {
    log.info(
      { from: transition.previousStatus, to: transition.status },
      "status changed"
    )
  }

  // Incidents + alerts derive from the saved state, so a failure here (job
  // fails, logged) is repaired by the next check or the reconcile.
  await updateIncidentAfterCheck(
    { monitor, transition, failure, slowStreak, result },
    { alerts: deps.alerts, logger: log }
  )

  await refreshSslExpiryIfDue(monitor, {
    env,
    log,
    onRead: (expiresAt) =>
      queueSslAlertIfDue(monitor._id, expiresAt, deps.alerts),
  })
  return { kind: "checked", result }
}
