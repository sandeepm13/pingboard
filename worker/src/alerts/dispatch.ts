import type { Types } from "mongoose"

import { alertEventKey, deliveryKey } from "@shared/alerts/events"
import {
  degradedMessage,
  downMessage,
  recoveredMessage,
  reminderMessage,
  sslMessage,
  type AlertContext,
  type AlertIncident,
  type AlertMonitor,
} from "@shared/alerts/format"
import type { AlertEvent, AlertMessage } from "@shared/alerts/types"
import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { User } from "@shared/models/user"
import { planLimits } from "@shared/plans"
import { safeTimeZone } from "@shared/time"
import type { AlertChannelType } from "@shared/types"

import type { Logger } from "../logger"
import { enqueueDelivery, type AlertsQueue } from "./queue"

// Fan-out of one event: build the message once, then one AlertLog + one
// deliver job per channel. Idempotent: re-running it (retry, duplicate event)
// only re-queues deliveries that haven't finished.

export type DispatchDeps = {
  queue: AlertsQueue
  logger: Logger
  appUrl: string
  slowThresholdMs: number
  now?: () => Date
}

type Built = {
  message: AlertMessage
  userId: Types.ObjectId
  /** Channel types the owner's plan delivers to. */
  channelTypes: readonly AlertChannelType[]
  monitor: {
    _id: Types.ObjectId
    alertAllChannels?: boolean | null
    alertChannelIds: Types.ObjectId[]
  }
  incidentId: Types.ObjectId | null
}

async function buildMessage(
  event: AlertEvent,
  deps: DispatchDeps
): Promise<Built | null> {
  const now = deps.now?.() ?? new Date()
  const incident =
    "incidentId" in event
      ? await Incident.findById(event.incidentId).lean()
      : null
  if ("incidentId" in event && !incident) return null
  // Reminders only while the outage is still open and nobody acknowledged it.
  if (event.kind === "reminder" && (!incident?.open || incident.acknowledgedAt))
    return null

  const monitorId =
    incident?.monitorId ?? ("monitorId" in event ? event.monitorId : null)
  const monitor = monitorId
    ? await Monitor.findById(monitorId).select("-headers -body").lean()
    : null
  if (!monitor) return null
  if (
    (event.kind === "ssl" || event.kind === "degraded") &&
    monitor.status === "paused"
  )
    return null

  const user = await User.findById(monitor.userId)
    .select("timezone plan")
    .lean()
  const ctx: AlertContext = {
    appUrl: deps.appUrl,
    timeZone: safeTimeZone(user?.timezone),
    now,
  }
  const target: AlertMonitor = {
    id: monitor._id.toString(),
    name: monitor.name,
    url: monitor.url,
  }
  const info: AlertIncident | null = incident && {
    id: incident._id.toString(),
    startedAt: incident.startedAt,
    resolvedAt: incident.resolvedAt ?? null,
    durationSeconds: incident.durationSeconds ?? null,
    cause: {
      statusCode: incident.cause.statusCode ?? null,
      errorMessage: incident.cause.errorMessage ?? null,
    },
    checksFailed: incident.checksFailed,
  }

  let message: AlertMessage
  switch (event.kind) {
    case "down":
      message = downMessage(target, info!, ctx)
      break
    case "reminder":
      message = reminderMessage(target, info!, ctx)
      break
    case "recovered":
      message = recoveredMessage(target, info!, ctx)
      break
    case "ssl":
      message = sslMessage(target, new Date(event.expiresAt), ctx)
      break
    case "degraded":
      message = degradedMessage(
        target,
        {
          responseTimeMs: event.responseTimeMs,
          thresholdMs: deps.slowThresholdMs,
        },
        ctx
      )
      break
  }
  return {
    message,
    userId: monitor.userId,
    channelTypes: planLimits(user?.plan ?? "free").alertChannelTypes,
    monitor,
    incidentId: incident?._id ?? null,
  }
}

export async function dispatchAlert(
  event: AlertEvent,
  deps: DispatchDeps
): Promise<number> {
  const log = deps.logger.child({ alert: event.kind })
  const built = await buildMessage(event, deps)
  if (!built) {
    log.info("alert no longer relevant; nothing sent")
    return 0
  }

  const { monitor } = built
  const channels = await AlertChannel.find({
    userId: built.userId,
    enabled: true,
    type: { $in: built.channelTypes },
    // lean() skips defaults: a monitor saved before Stage 6 alerts every channel.
    ...(monitor.alertAllChannels === false && {
      _id: { $in: monitor.alertChannelIds },
    }),
  })
    .select("type name")
    .lean()

  const eventKey = alertEventKey(event)
  let queued = 0
  for (const channel of channels) {
    const dedupeKey = deliveryKey(eventKey, channel._id.toString())
    const entry = await AlertLog.findOneAndUpdate(
      { dedupeKey },
      {
        $setOnInsert: {
          userId: built.userId,
          monitorId: monitor._id,
          incidentId: built.incidentId,
          channelId: channel._id,
          channelType: channel.type,
          channelName: channel.name,
          kind: event.kind,
          status: "queued",
          message: built.message,
        },
      },
      { upsert: true, returnDocument: "after" }
    )
      .select("status")
      .lean()
      .catch((error: { code?: number }) => {
        // Two dispatches raced on the unique key; the other one owns it.
        if (error.code === 11000)
          return AlertLog.findOne({ dedupeKey }).select("status").lean()
        throw error
      })
    // Re-queue only unfinished deliveries; BullMQ ignores a job id it still has.
    if (entry?.status === "queued") {
      await enqueueDelivery(deps.queue, entry._id.toString(), dedupeKey)
      queued++
    }
  }
  log.info({ channels: channels.length, queued }, "alert dispatched")
  return queued
}
