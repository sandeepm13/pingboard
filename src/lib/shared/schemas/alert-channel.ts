import { z } from "zod"

import {
  ALERT_CHANNEL_TYPES,
  ALERT_LIMITS,
  ALERT_REMINDER_MINUTES,
} from "../constants"
import {
  TELEGRAM_CHAT_ID,
  TELEGRAM_TOKEN,
  checkDiscordWebhook,
  checkSlackWebhook,
} from "../alerts/channel-policy"

// Shared by the "Add channel" dialog (client) and the channel server actions.
// One flat object (easy for react-hook-form); fields that don't belong to the
// chosen type are ignored and come out as null.

export const alertChannelTypeSchema = z.enum(ALERT_CHANNEL_TYPES)

const formFields = {
  type: alertChannelTypeSchema,
  name: z
    .string()
    .trim()
    .min(1, "Give the channel a name")
    .max(ALERT_LIMITS.channelNameMax, "Name is too long"),
  email: z.string().trim().max(254, "Email is too long"),
  webhookUrl: z.string().trim().max(500, "URL is too long"),
  botToken: z.string().trim().max(100, "Token is too long"),
  chatId: z.string().trim().max(40, "Chat id is too long"),
}

/**
 * `editing`: blank webhook URL / bot token = keep the stored (encrypted) one,
 * which is never sent to the browser.
 */
export function createAlertChannelSchema(options: { editing?: boolean } = {}) {
  const keep = options.editing === true
  return z
    .object(formFields)
    .superRefine((data, ctx) => {
      const issue = (path: string, message: string) =>
        ctx.addIssue({ code: "custom", path: [path], message })

      switch (data.type) {
        case "email":
          if (!z.email().safeParse(data.email).success) {
            issue("email", "Enter a valid email address")
          }
          break
        case "discord":
        case "slack": {
          if (keep && !data.webhookUrl) break
          if (!data.webhookUrl) {
            issue("webhookUrl", "Paste the webhook URL")
            break
          }
          const check =
            data.type === "discord" ? checkDiscordWebhook : checkSlackWebhook
          const result = check(data.webhookUrl)
          if (!result.ok) issue("webhookUrl", result.reason)
          break
        }
        case "telegram":
          if (
            !(keep && !data.botToken) &&
            !TELEGRAM_TOKEN.test(data.botToken)
          ) {
            issue(
              "botToken",
              data.botToken
                ? "That doesn't look like a bot token (123456:ABC…)"
                : "Paste the bot token from @BotFather"
            )
          }
          if (!TELEGRAM_CHAT_ID.test(data.chatId)) {
            issue(
              "chatId",
              data.chatId
                ? "Use the numeric chat id (e.g. 123456789 or -100…) or @channelname"
                : "Enter the chat id"
            )
          }
          break
      }
    })
    .transform((data) => ({
      type: data.type,
      name: data.name,
      email: data.type === "email" ? data.email.toLowerCase() : null,
      webhookUrl:
        (data.type === "discord" || data.type === "slack") && data.webhookUrl
          ? data.webhookUrl
          : null,
      botToken:
        data.type === "telegram" && data.botToken ? data.botToken : null,
      chatId: data.type === "telegram" ? data.chatId : null,
    }))
}

export const alertChannelInputSchema = createAlertChannelSchema()

export type AlertChannelFormValues = z.input<typeof alertChannelInputSchema>
export type AlertChannelInput = z.output<typeof alertChannelInputSchema>

export const alertSettingsSchema = z.object({
  reminderMinutes: z.literal(ALERT_REMINDER_MINUTES, {
    error: "Pick a reminder interval",
  }),
})

export const incidentNotesSchema = z
  .string()
  .max(
    ALERT_LIMITS.incidentNotesMax,
    `Notes can be at most ${ALERT_LIMITS.incidentNotesMax.toLocaleString("en-US")} characters`
  )
  .transform((value) => value.trim())
