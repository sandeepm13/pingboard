"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { maskChannelTarget } from "@shared/alerts/channel-policy"
import { deliverAlert } from "@shared/alerts/deliver"
import { DeliveryError } from "@shared/alerts/errors"
import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { testMessage } from "@shared/alerts/format"
import { resolveChannel } from "@shared/alerts/resolve-channel"
import { ALERT_LIMITS } from "@shared/constants"
import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { User } from "@shared/models/user"
import { isChannelTypeAllowed, planLimits } from "@shared/plans"
import {
  alertSettingsSchema,
  createAlertChannelSchema,
  type AlertChannelInput,
} from "@shared/schemas/alert-channel"
import { objectIdSchema } from "@shared/schemas/common"
import { safeTimeZone } from "@shared/time"
import type { AlertChannelType } from "@shared/types"
import { findOwnedChannel } from "@/lib/alert-channels"
import { requireUser, type CurrentUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"
import { getEnv } from "@/lib/env"
import { rateLimitAll } from "@/lib/rate-limit"
import { decrypt, encrypt } from "@/lib/secrets"

// Every action: requireUser() → Zod → queries scoped by { _id, userId }.

export type ChannelActionResult =
  | { ok: true; id: string; message?: string }
  | { error: string; fieldErrors?: Record<string, string> }

const NOT_FOUND = { error: "Channel not found." } as const

/** null when the user's plan includes this channel type. */
function planBlocks(user: CurrentUser, type: AlertChannelType) {
  if (isChannelTypeAllowed(user.plan, type)) return null
  return {
    error: `${CHANNEL_TYPE_LABELS[type]} alerts are part of the Pro plan. The ${planLimits(user.plan).label} plan alerts by email.`,
  }
}

function invalid(error: z.ZodError): ChannelActionResult {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message
  }
  return { error: "Please fix the highlighted fields.", fieldErrors }
}

function revalidateAlerts() {
  revalidatePath("/app/alerts")
}

/** Stored form of the secret fields. `existing` supplies kept secrets on edit. */
function storedFields(
  input: AlertChannelInput,
  existing?: {
    webhookUrl?: string | null
    botToken?: string | null
    maskedTarget: string
  }
) {
  const isWebhook = input.type === "discord" || input.type === "slack"
  let maskedTarget: string
  if (input.type === "email") {
    maskedTarget = maskChannelTarget({
      type: "email",
      email: input.email ?? "",
    })
  } else if (input.type === "telegram") {
    maskedTarget = maskChannelTarget({
      type: "telegram",
      chatId: input.chatId ?? "",
    })
  } else if (input.webhookUrl) {
    maskedTarget = maskChannelTarget({
      type: input.type,
      webhookUrl: input.webhookUrl,
    })
  } else {
    // Webhook kept as is (edit with a blank field).
    maskedTarget = existing?.maskedTarget ?? ""
  }
  return {
    type: input.type,
    name: input.name,
    email: input.email,
    chatId: input.chatId,
    webhookUrl: isWebhook
      ? input.webhookUrl
        ? encrypt(input.webhookUrl)
        : (existing?.webhookUrl ?? null)
      : null,
    botToken:
      input.type === "telegram"
        ? input.botToken
          ? encrypt(input.botToken)
          : (existing?.botToken ?? null)
        : null,
    maskedTarget,
  }
}

export async function createAlertChannelAction(
  input: unknown
): Promise<ChannelActionResult> {
  const user = await requireUser()
  const parsed = createAlertChannelSchema().safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const blocked = planBlocks(user, parsed.data.type)
  if (blocked) return blocked

  await connectDb()
  const limitError = {
    error: `You can have at most ${ALERT_LIMITS.channelsMax} alert channels.`,
  }
  if (
    (await AlertChannel.countDocuments({ userId: user.id })) >=
    ALERT_LIMITS.channelsMax
  ) {
    return limitError
  }
  const channel = await AlertChannel.create({
    userId: user.id,
    enabled: true,
    ...storedFields(parsed.data),
  })
  // Two parallel creates can both pass the count check; undo the extra one.
  if (
    (await AlertChannel.countDocuments({ userId: user.id })) >
    ALERT_LIMITS.channelsMax
  ) {
    await AlertChannel.deleteOne({ _id: channel._id, userId: user.id })
    return limitError
  }
  revalidateAlerts()
  return { ok: true, id: channel._id.toString() }
}

export async function updateAlertChannelAction(
  id: unknown,
  input: unknown
): Promise<ChannelActionResult> {
  const user = await requireUser()
  const existing = await findOwnedChannel(user.id, id)
  if (!existing) return NOT_FOUND
  const parsed = createAlertChannelSchema({ editing: true }).safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const blocked = planBlocks(user, parsed.data.type)
  if (blocked) return blocked
  // Switching type means the stored secret belongs to another service.
  const sameType = parsed.data.type === existing.type
  if (!sameType) {
    const missing = createAlertChannelSchema().safeParse(input)
    if (!missing.success) return invalid(missing.error)
  }

  await connectDb()
  const update = await AlertChannel.updateOne(
    { _id: existing._id, userId: user.id },
    { $set: storedFields(parsed.data, sameType ? existing : undefined) }
  )
  if (update.matchedCount === 0) return NOT_FOUND
  revalidateAlerts()
  return { ok: true, id: existing._id.toString() }
}

export async function setAlertChannelEnabledAction(
  id: unknown,
  enabled: unknown
): Promise<ChannelActionResult> {
  const user = await requireUser()
  const parsedId = objectIdSchema.safeParse(id)
  const parsedEnabled = z.boolean().safeParse(enabled)
  if (!parsedId.success || !parsedEnabled.success) return NOT_FOUND
  if (parsedEnabled.data) {
    const channel = await findOwnedChannel(user.id, parsedId.data)
    if (!channel) return NOT_FOUND
    const blocked = planBlocks(user, channel.type)
    if (blocked) return blocked
  }
  await connectDb()
  const update = await AlertChannel.updateOne(
    { _id: parsedId.data, userId: user.id },
    { $set: { enabled: parsedEnabled.data } }
  )
  if (update.matchedCount === 0) return NOT_FOUND
  revalidateAlerts()
  return { ok: true, id: parsedId.data }
}

export async function deleteAlertChannelAction(
  id: unknown
): Promise<ChannelActionResult> {
  const user = await requireUser()
  const parsedId = objectIdSchema.safeParse(id)
  if (!parsedId.success) return NOT_FOUND
  await connectDb()
  const deleted = await AlertChannel.deleteOne({
    _id: parsedId.data,
    userId: user.id,
  })
  if (deleted.deletedCount === 0) return NOT_FOUND
  // Monitors that picked this channel stop referencing it (the log keeps its name).
  await Monitor.updateMany(
    { userId: user.id, alertChannelIds: parsedId.data },
    { $pull: { alertChannelIds: parsedId.data } }
  )
  revalidateAlerts()
  revalidatePath("/app")
  return { ok: true, id: parsedId.data }
}

/** Sends a test message right now and reports the result (logged as kind "test"). */
export async function sendTestAlertAction(
  id: unknown
): Promise<ChannelActionResult> {
  const user = await requireUser()
  const limit = await rateLimitAll([
    ["testAlertByUser", user.id],
    ["testAlertByUserDaily", user.id],
  ])
  if (!limit.ok) {
    return {
      error: `That's a lot of test alerts. Try again in ${limit.retryAfterSec} s.`,
    }
  }
  const channel = await findOwnedChannel(user.id, id)
  if (!channel) return NOT_FOUND
  const blocked = planBlocks(user, channel.type)
  if (blocked) return blocked

  const resolved = resolveChannel(channel, decrypt)
  if (!resolved)
    return {
      error:
        "This channel's saved settings couldn't be read. Edit it and save again.",
    }

  const env = getEnv()
  const now = new Date()
  const message = testMessage(channel.name, {
    appUrl: env.APP_URL,
    timeZone: safeTimeZone(user.timezone),
    now,
  })
  const entry = await AlertLog.create({
    userId: user.id,
    channelId: channel._id,
    channelType: channel.type,
    channelName: channel.name,
    kind: "test",
    dedupeKey: `test-${randomUUID()}`,
    status: "queued",
    message,
  })

  try {
    await deliverAlert(resolved, message, {
      email: env.email,
      production: env.NODE_ENV === "production",
      now,
    })
  } catch (error) {
    const reason =
      error instanceof DeliveryError
        ? error.message
        : "Something went wrong while sending."
    if (!(error instanceof DeliveryError)) {
      console.error(
        "[alerts] test alert failed:",
        error instanceof Error ? error.message : error
      )
    }
    await AlertLog.updateOne(
      { _id: entry._id },
      { $set: { status: "failed", error: reason }, $inc: { attempts: 1 } }
    )
    revalidateAlerts()
    return { error: reason }
  }
  await AlertLog.updateOne(
    { _id: entry._id },
    { $set: { status: "sent", sentAt: new Date() }, $inc: { attempts: 1 } }
  )
  revalidateAlerts()
  return {
    ok: true,
    id: channel._id.toString(),
    message:
      env.email.provider === "console" && channel.type === "email"
        ? "Test email printed to the server log (EMAIL_PROVIDER isn't set)."
        : `Test alert sent to ${channel.name}.`,
  }
}

export async function updateAlertSettingsAction(
  input: unknown
): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser()
  const parsed = alertSettingsSchema.safeParse(input)
  if (!parsed.success) return { error: "Pick a reminder interval." }
  const minutes = parsed.data.reminderMinutes
  await connectDb()
  await User.updateOne(
    { _id: user.id },
    { $set: { alertReminderMinutes: minutes } }
  )
  // Apply to outages that are already open (not to acknowledged ones).
  await Incident.updateMany(
    { userId: user.id, open: true, acknowledgedAt: null },
    {
      $set: {
        nextReminderAt:
          minutes > 0 ? new Date(Date.now() + minutes * 60_000) : null,
      },
    }
  )
  revalidateAlerts()
  return { ok: true }
}
