// Synchronous rules for alert-channel targets (no DNS), shared by the Zod
// schema in the browser and on the server. Webhooks may only point at the
// chat services themselves, over https (CLAUDE.md §6.7).

export const WEBHOOK_HOSTS = {
  discord: [
    "discord.com",
    "discordapp.com",
    "ptb.discord.com",
    "canary.discord.com",
  ],
  slack: ["hooks.slack.com"],
  telegram: ["api.telegram.org"],
} as const

export type PolicyResult =
  { ok: true; url: URL } | { ok: false; reason: string }

const DISCORD_PATH =
  /^\/api(?:\/v\d{1,2})?\/webhooks\/(\d{5,25})\/[\w-]{20,200}$/
const SLACK_PATH =
  /^\/services\/(T[A-Z0-9]{4,20})\/B[A-Z0-9]{4,20}\/[A-Za-z0-9]{8,64}$/

export const TELEGRAM_TOKEN = /^\d{5,15}:[A-Za-z0-9_-]{30,50}$/
/** Numeric chat id (groups are negative) or a public @channel username. */
export const TELEGRAM_CHAT_ID = /^(?:-?\d{1,20}|@[A-Za-z][A-Za-z0-9_]{4,31})$/

function parseHttpsUrl(
  raw: string,
  hosts: readonly string[],
  service: string
): PolicyResult {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return { ok: false, reason: `Paste the full ${service} webhook URL` }
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "Webhook URLs must start with https://" }
  }
  if (url.username || url.password || (url.port && url.port !== "443")) {
    return { ok: false, reason: `This isn't a ${service} webhook URL` }
  }
  if (!hosts.includes(url.hostname.toLowerCase())) {
    return {
      ok: false,
      reason: `${service} webhook URLs start with https://${hosts[0]}/`,
    }
  }
  return { ok: true, url }
}

export function checkDiscordWebhook(raw: string): PolicyResult {
  const parsed = parseHttpsUrl(raw, WEBHOOK_HOSTS.discord, "Discord")
  if (!parsed.ok) return parsed
  const { url } = parsed
  const extraParams = [...url.searchParams.keys()].filter(
    (k) => k !== "thread_id"
  )
  if (!DISCORD_PATH.test(url.pathname) || extraParams.length > 0 || url.hash) {
    return {
      ok: false,
      reason: "Expected https://discord.com/api/webhooks/<id>/<token>",
    }
  }
  return parsed
}

export function checkSlackWebhook(raw: string): PolicyResult {
  const parsed = parseHttpsUrl(raw, WEBHOOK_HOSTS.slack, "Slack")
  if (!parsed.ok) return parsed
  if (
    !SLACK_PATH.test(parsed.url.pathname) ||
    parsed.url.search ||
    parsed.url.hash
  ) {
    return {
      ok: false,
      reason: "Expected https://hooks.slack.com/services/T…/B…/…",
    }
  }
  return parsed
}

/** Non-secret description shown in the UI (the secret part is never shown). */
export function maskChannelTarget(
  input:
    | { type: "email"; email: string }
    | { type: "discord" | "slack"; webhookUrl: string }
    | { type: "telegram"; chatId: string }
): string {
  switch (input.type) {
    case "email":
      return input.email
    case "discord": {
      const url = new URL(input.webhookUrl)
      const id = DISCORD_PATH.exec(url.pathname)?.[1] ?? ""
      return `${url.hostname} · webhook …${id.slice(-4)}`
    }
    case "slack": {
      const team =
        SLACK_PATH.exec(new URL(input.webhookUrl).pathname)?.[1] ?? ""
      return `hooks.slack.com · workspace ${team}`
    }
    case "telegram":
      return `Chat ${input.chatId}`
  }
}
