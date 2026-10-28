import type { EmailConfig } from "../email/config"
import { sendEmail, type EmailLogger } from "../email/send"
import { alertEmail } from "../email/templates"
import { WEBHOOK_HOSTS } from "./channel-policy"
import { DeliveryError, isPermanentHttpStatus } from "./errors"
import {
  postJson as defaultPostJson,
  type PostJson,
  type PostJsonResult,
} from "./http"
import { renderDiscord, renderSlack, renderTelegram } from "./render-chat"
import type { AlertMessage, ResolvedChannel } from "./types"

// Sends one AlertMessage to one channel. Used by the worker's "deliver" jobs
// and by the app's "Send test alert". Throws DeliveryError on failure.

export type DeliverDeps = {
  email: EmailConfig
  production: boolean
  now: Date
  log?: EmailLogger
  /** Injectable for tests. */
  postJson?: PostJson
}

function clip(value: string, max = 160) {
  const flat = value.replace(/\s+/g, " ").trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`
}

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text)
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function rejected(service: string, result: PostJsonResult, detail?: string) {
  const reason = detail ? `: ${clip(detail)}` : ""
  return new DeliveryError(
    `${service} rejected the alert (${result.status}${reason})`,
    {
      permanent: isPermanentHttpStatus(result.status),
    }
  )
}

async function sendDiscord(
  webhookUrl: string,
  message: AlertMessage,
  deps: DeliverDeps
) {
  const url = new URL(webhookUrl)
  // wait=true makes Discord report errors instead of answering 204 blindly.
  url.searchParams.set("wait", "true")
  const result = await (deps.postJson ?? defaultPostJson)(
    url.href,
    renderDiscord(message, deps.now),
    { allowedHosts: WEBHOOK_HOSTS.discord }
  )
  if (result.status >= 200 && result.status < 300) return
  if (result.status === 404 || result.status === 401) {
    throw new DeliveryError(
      "Discord says this webhook doesn't exist any more. Create a new one and update the channel.",
      { permanent: true }
    )
  }
  const body = parseJson(result.text)
  throw rejected(
    "Discord",
    result,
    typeof body?.message === "string" ? body.message : undefined
  )
}

async function sendSlack(
  webhookUrl: string,
  message: AlertMessage,
  deps: DeliverDeps
) {
  const result = await (deps.postJson ?? defaultPostJson)(
    webhookUrl,
    renderSlack(message),
    {
      allowedHosts: WEBHOOK_HOSTS.slack,
    }
  )
  if (result.status >= 200 && result.status < 300) return
  // Slack answers with short codes: no_service, invalid_token, channel_is_archived…
  if (["no_service", "no_team", "invalid_token"].includes(result.text.trim())) {
    throw new DeliveryError(
      "Slack says this webhook doesn't exist any more. Create a new one and update the channel.",
      { permanent: true }
    )
  }
  throw rejected("Slack", result, result.text)
}

async function sendTelegram(
  channel: Extract<ResolvedChannel, { type: "telegram" }>,
  message: AlertMessage,
  deps: DeliverDeps
) {
  const result = await (deps.postJson ?? defaultPostJson)(
    `https://api.telegram.org/bot${channel.botToken}/sendMessage`,
    {
      chat_id: channel.chatId,
      text: renderTelegram(message),
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    },
    { allowedHosts: WEBHOOK_HOSTS.telegram }
  )
  const body = parseJson(result.text)
  if (result.status === 200 && body?.ok === true) return
  if (result.status === 401 || result.status === 404) {
    throw new DeliveryError(
      "Telegram rejected the bot token. Check it in @BotFather.",
      {
        permanent: true,
      }
    )
  }
  // e.g. "Bad Request: chat not found", "Forbidden: bot was blocked by the user".
  throw rejected(
    "Telegram",
    result,
    typeof body?.description === "string" ? body.description : undefined
  )
}

export async function deliverAlert(
  channel: ResolvedChannel,
  message: AlertMessage,
  deps: DeliverDeps
): Promise<void> {
  switch (channel.type) {
    case "email":
      return sendEmail(deps.email, channel.email, alertEmail(message), {
        log: deps.log,
        production: deps.production,
      })
    case "discord":
      return sendDiscord(channel.webhookUrl, message, deps)
    case "slack":
      return sendSlack(channel.webhookUrl, message, deps)
    case "telegram":
      return sendTelegram(channel, message, deps)
  }
}
