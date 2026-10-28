import type { Types } from "mongoose"

import { nextReminderAt, sslAlertThreshold } from "@shared/alerts/events"
import type {
  CurrentFailure,
  MonitorTransition,
} from "@shared/checks/monitor-state"
import { DEGRADED_ALERT_STREAK } from "@shared/constants"
import { closeOpenIncident } from "@shared/incidents"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { User } from "@shared/models/user"
import { daysUntil } from "@shared/time"
import type { CheckStatus } from "@shared/types"

import { enqueueAlert, type AlertsQueue } from "./alerts/queue"
import type { Logger } from "./logger"

// Incidents follow the monitor's stored status, not the in-process event:
// every down check opens-or-extends the open incident, the first good check
// after an outage closes it, and a periodic reconcile closes any incident
// whose monitor is no longer down. A lost step heals on the next check.

export type IncidentDeps = { alerts: AlertsQueue; logger: Logger }

export type SavedCheck = {
  monitor: {
    _id: Types.ObjectId
    userId: Types.ObjectId
    alertOnDegraded?: boolean | null
  }
  transition: MonitorTransition
  failure: CurrentFailure | null
  slowStreak: number
  result: {
    status: CheckStatus
    statusCode: number | null
    responseTimeMs: number | null
    errorMessage: string | null
    checkedAt: Date
  }
}

async function openIncident(check: SavedCheck, deps: IncidentDeps) {
  const { monitor, result, failure, transition } = check
  // The monitor may have been paused/edited since the check was saved.
  if (!(await Monitor.exists({ _id: monitor._id, status: "down" }))) return

  const user = await User.findById(monitor.userId)
    .select("alertReminderMinutes")
    .lean()
  try {
    const incident = await Incident.create({
      monitorId: monitor._id,
      userId: monitor.userId,
      startedAt: failure?.startedAt ?? result.checkedAt,
      confirmedAt: result.checkedAt,
      cause: {
        statusCode: failure ? failure.statusCode : result.statusCode,
        errorMessage: failure ? failure.errorMessage : result.errorMessage,
      },
      checksFailed: Math.max(1, transition.consecutiveFailures),
      lastFailureAt: result.checkedAt,
      nextReminderAt: nextReminderAt(
        result.checkedAt,
        user?.alertReminderMinutes ?? 0
      ),
    })
    deps.logger.info(
      { monitorId: monitor._id.toString(), incidentId: incident.id },
      "incident opened"
    )
    await enqueueAlert(deps.alerts, { kind: "down", incidentId: incident.id })
  } catch (error) {
    // Unique index: another check opened it first. Count this failure there.
    if ((error as { code?: number }).code !== 11000) throw error
    await Incident.updateOne(
      { monitorId: monitor._id, open: true },
      { $inc: { checksFailed: 1 }, $set: { lastFailureAt: result.checkedAt } }
    )
  }
}

/** Called after a check's result and the monitor's new state were saved. */
export async function updateIncidentAfterCheck(
  check: SavedCheck,
  deps: IncidentDeps
) {
  const { monitor, transition, result } = check

  if (transition.status === "down") {
    const extended = await Incident.updateOne(
      { monitorId: monitor._id, open: true },
      { $inc: { checksFailed: 1 }, $set: { lastFailureAt: result.checkedAt } }
    )
    if (extended.matchedCount === 0) await openIncident(check, deps)
  } else if (
    transition.changed &&
    (transition.status === "up" || transition.status === "degraded")
  ) {
    const closed = await closeOpenIncident(
      monitor._id,
      "recovered",
      result.checkedAt
    )
    if (closed) {
      deps.logger.info(
        {
          monitorId: monitor._id.toString(),
          incidentId: closed._id.toString(),
          seconds: closed.durationSeconds,
        },
        "incident resolved"
      )
      await enqueueAlert(deps.alerts, {
        kind: "recovered",
        incidentId: closed._id.toString(),
      })
    }
  }

  // Fires once per slow streak: exactly when it reaches the threshold.
  if (
    monitor.alertOnDegraded === true &&
    check.slowStreak === DEGRADED_ALERT_STREAK &&
    result.responseTimeMs !== null
  ) {
    await enqueueAlert(deps.alerts, {
      kind: "degraded",
      monitorId: monitor._id.toString(),
      checkedAt: result.checkedAt.toISOString(),
      responseTimeMs: result.responseTimeMs,
    })
  }
}

/** After a successful certificate read: warn at ≤ 14 and ≤ 3 days (once each per certificate). */
export async function queueSslAlertIfDue(
  monitorId: Types.ObjectId,
  expiresAt: Date | null,
  alerts: AlertsQueue,
  now: Date = new Date()
) {
  if (!expiresAt) return
  const threshold = sslAlertThreshold(daysUntil(expiresAt, now.getTime()))
  if (threshold === null) return
  await enqueueAlert(alerts, {
    kind: "ssl",
    monitorId: monitorId.toString(),
    expiresAt: expiresAt.toISOString(),
    thresholdDays: threshold,
  })
}

/**
 * Safety net (on boot and every 10 minutes): closes open incidents whose
 * monitor isn't down any more, e.g. if the worker died between saving a
 * recovery and closing the incident.
 */
export async function reconcileIncidents(deps: IncidentDeps): Promise<number> {
  const open = await Incident.find({ open: true }).select("monitorId").lean()
  if (open.length === 0) return 0
  const monitors = await Monitor.find({
    _id: { $in: open.map((i) => i.monitorId) },
  })
    .select("status lastCheckedAt")
    .lean()
  const byId = new Map(monitors.map((m) => [m._id.toString(), m]))

  let fixed = 0
  for (const incident of open) {
    const monitor = byId.get(incident.monitorId.toString())
    if (!monitor) {
      // The monitor was deleted but its incident wasn't (crash mid-delete).
      await Incident.deleteOne({ _id: incident._id, open: true })
      fixed++
      continue
    }
    if (monitor.status === "down") continue
    const recovered = monitor.status === "up" || monitor.status === "degraded"
    const closed = await closeOpenIncident(
      monitor._id,
      recovered
        ? "recovered"
        : monitor.status === "paused"
          ? "paused"
          : "changed",
      (recovered && monitor.lastCheckedAt) || new Date()
    )
    if (closed && recovered) {
      await enqueueAlert(deps.alerts, {
        kind: "recovered",
        incidentId: closed._id.toString(),
      })
    }
    if (closed) fixed++
  }
  if (fixed > 0) deps.logger.warn({ fixed }, "incidents reconciled")
  return fixed
}
