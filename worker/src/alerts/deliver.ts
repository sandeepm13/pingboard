import { UnrecoverableError, type Job } from "bullmq"

import { deliverAlert } from "@shared/alerts/deliver"
import { DeliveryError } from "@shared/alerts/errors"
import { resolveChannel } from "@shared/alerts/resolve-channel"
import type { AlertDeliverJob, AlertMessage } from "@shared/alerts/types"
import type { EmailConfig } from "@shared/email/config"
import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { decryptSecret } from "@shared/security/secrets"

import type { Logger } from "../logger"

// One alert to one channel. The AlertLog row records every attempt; BullMQ
// retries transient failures (3 retries, exponential backoff) and stops at
// once on permanent ones (deleted webhook, bad token, rejected address).

export type DeliverDeps = {
  logger: Logger
  encryptionKey: Buffer
  email: EmailConfig
  production: boolean
}

export async function processDelivery(
  job: Job<AlertDeliverJob>,
  deps: DeliverDeps
): Promise<string> {
  const entry = await AlertLog.findById(job.data.alertLogId).lean()
  // Already sent (duplicate job) or given up: never send twice.
  if (
    !entry ||
    entry.status === "sent" ||
    entry.status === "failed" ||
    entry.status === "skipped"
  ) {
    return "skipped"
  }
  const log = deps.logger.child({
    alertLogId: job.data.alertLogId,
    channel: entry.channelType,
  })
  const finish = (set: Record<string, unknown>) =>
    AlertLog.updateOne({ _id: entry._id }, { $set: set, $inc: { attempts: 1 } })

  const channel = await AlertChannel.findOne({
    _id: entry.channelId,
    userId: entry.userId,
  }).lean()
  if (!channel || !channel.enabled) {
    await finish({
      status: "skipped",
      error: "The channel was deleted or turned off",
    })
    return "skipped"
  }
  const resolved = resolveChannel(channel, (payload) =>
    decryptSecret(payload, deps.encryptionKey)
  )
  if (!resolved) {
    log.error("couldn't read the channel's settings (ENCRYPTION_KEY?)")
    await finish({
      status: "failed",
      error: "The channel's settings couldn't be read",
    })
    return "failed"
  }

  const message: AlertMessage = {
    ...entry.message,
    fields: entry.message.fields.map(({ label, value }) => ({ label, value })),
  }
  try {
    await deliverAlert(resolved, message, {
      email: deps.email,
      production: deps.production,
      now: new Date(),
      log: (line) => log.info(line),
    })
  } catch (error) {
    if (!(error instanceof DeliveryError)) throw error
    const attempts = job.opts.attempts ?? 1
    const final = error.permanent || job.attemptsMade + 1 >= attempts
    await finish({
      status: final ? "failed" : "retrying",
      error: error.message,
    })
    log.warn(
      { err: error.message, permanent: error.permanent, final },
      "alert delivery failed"
    )
    // UnrecoverableError: BullMQ skips the remaining retries.
    throw error.permanent ? new UnrecoverableError(error.message) : error
  }

  await finish({ status: "sent", sentAt: new Date(), error: null })
  log.info({ kind: entry.kind }, "alert sent")
  return "sent"
}
