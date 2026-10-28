import "server-only"

import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { User } from "@shared/models/user"
import { objectIdSchema } from "@shared/schemas/common"
import type {
  AlertChannelType,
  AlertDeliveryStatus,
  AlertKind,
  AlertReminderMinutes,
} from "@shared/types"
import { connectDb } from "@/lib/db"

// Ownership-scoped reads for /app/alerts and the monitor form. Secrets never
// leave the server: the browser only gets `maskedTarget`.

export type AlertChannelItem = {
  id: string
  type: AlertChannelType
  name: string
  enabled: boolean
  maskedTarget: string
  /** Editable non-secret fields (email address, Telegram chat id). */
  email: string | null
  chatId: string | null
}

export async function listAlertChannels(
  userId: string
): Promise<AlertChannelItem[]> {
  await connectDb()
  const channels = await AlertChannel.find({ userId })
    .select("type name enabled maskedTarget email chatId")
    .sort({ createdAt: 1 })
    .lean()
  return channels.map((channel) => ({
    id: channel._id.toString(),
    type: channel.type,
    name: channel.name,
    enabled: channel.enabled,
    maskedTarget: channel.maskedTarget,
    email: channel.email ?? null,
    chatId: channel.chatId ?? null,
  }))
}

/** Full document (with encrypted secrets) for server-side use only. */
export async function findOwnedChannel(userId: string, id: unknown) {
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return null
  await connectDb()
  return AlertChannel.findOne({ _id: parsed.data, userId }).lean()
}

export async function getReminderMinutes(
  userId: string
): Promise<AlertReminderMinutes> {
  await connectDb()
  const user = await User.findById(userId).select("alertReminderMinutes").lean()
  return (user?.alertReminderMinutes ?? 0) as AlertReminderMinutes
}

export type AlertLogItem = {
  id: string
  kind: AlertKind
  status: AlertDeliveryStatus
  channelType: AlertChannelType
  channelName: string
  title: string
  error: string | null
  attempts: number
  createdAt: string
  sentAt: string | null
  incidentId: string | null
}

export async function listRecentAlerts(
  userId: string,
  limit = 20
): Promise<AlertLogItem[]> {
  await connectDb()
  const rows = await AlertLog.find({ userId })
    .select(
      "kind status channelType channelName message.title error attempts createdAt sentAt incidentId"
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
  return rows.map((row) => ({
    id: row._id.toString(),
    kind: row.kind,
    status: row.status,
    channelType: row.channelType,
    channelName: row.channelName,
    title: row.message.title,
    error: row.error ?? null,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    incidentId: row.incidentId?.toString() ?? null,
  }))
}
