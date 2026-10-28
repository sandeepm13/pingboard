import type { AlertChannelType } from "../types"
import type { ResolvedChannel } from "./types"

export type StoredChannel = {
  type: AlertChannelType
  email?: string | null
  webhookUrl?: string | null
  botToken?: string | null
  chatId?: string | null
}

/**
 * Decrypts a stored channel for sending. null when something is missing or
 * can't be decrypted (wrong ENCRYPTION_KEY): never send half a configuration.
 */
export function resolveChannel(
  channel: StoredChannel,
  decrypt: (payload: string) => string
): ResolvedChannel | null {
  try {
    switch (channel.type) {
      case "email":
        return channel.email ? { type: "email", email: channel.email } : null
      case "discord":
      case "slack":
        return channel.webhookUrl
          ? { type: channel.type, webhookUrl: decrypt(channel.webhookUrl) }
          : null
      case "telegram":
        return channel.botToken && channel.chatId
          ? {
              type: "telegram",
              botToken: decrypt(channel.botToken),
              chatId: channel.chatId,
            }
          : null
    }
  } catch {
    return null
  }
}
