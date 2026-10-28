import type { AlertMessage, AlertTone } from "./types"

// Chat payloads for one AlertMessage. Monitor names are user input, so every
// renderer escapes or disables mentions (@everyone, <!channel>…).

/** Embed/side colours. Chat APIs need literal colours, not CSS tokens. */
const TONE_COLORS: Record<AlertTone, number> = {
  down: 0xe5484d,
  up: 0x30a46c,
  warning: 0xf5a524,
  info: 0x3e63dd,
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

/** Discord execute-webhook body (one embed). */
export function renderDiscord(message: AlertMessage, now: Date) {
  return {
    username: "PingBoard",
    content: clip(message.title, 2000),
    embeds: [
      {
        title: clip(message.title, 256),
        description: clip(message.text, 4096),
        url: message.url,
        color: TONE_COLORS[message.tone],
        fields: message.fields.slice(0, 25).map((field) => ({
          name: clip(field.label, 256),
          value: clip(field.value, 1024),
          inline: field.value.length <= 40,
        })),
        timestamp: now.toISOString(),
        footer: { text: "PingBoard" },
      },
    ],
    // Names like "@everyone API" must not ping anyone.
    allowed_mentions: { parse: [] as string[] },
  }
}

/** Slack mrkdwn: escaping &, < and > also defuses <!channel> and <@user>. */
export function escapeSlack(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/** Slack incoming-webhook body (Block Kit, with a plain-text fallback). */
export function renderSlack(message: AlertMessage) {
  return {
    text: escapeSlack(message.text),
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: clip(message.title, 150),
          emoji: true,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: clip(escapeSlack(message.text), 3000) },
      },
      ...(message.fields.length > 0
        ? [
            {
              type: "section",
              fields: message.fields.slice(0, 10).map((field) => ({
                type: "mrkdwn",
                text: clip(
                  `*${escapeSlack(field.label)}*\n${escapeSlack(field.value)}`,
                  2000
                ),
              })),
            },
          ]
        : []),
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: message.linkLabel },
            url: message.url,
          },
        ],
      },
    ],
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Telegram sendMessage text (parse_mode HTML). */
export function renderTelegram(message: AlertMessage): string {
  // Telegram rejects some non-public link targets (e.g. localhost) in <a>,
  // so only https links become anchors; others are shown as plain text.
  const link = message.url.startsWith("https://")
    ? `<a href="${escapeHtml(message.url)}">${escapeHtml(message.linkLabel)} →</a>`
    : `${escapeHtml(message.linkLabel)}: ${escapeHtml(message.url)}`
  const fields = message.fields
    .map((f) => `<b>${escapeHtml(f.label)}:</b> ${escapeHtml(f.value)}`)
    .join("\n")
  return clip(
    [
      `<b>${escapeHtml(message.title)}</b>`,
      escapeHtml(message.text),
      fields,
      link,
    ]
      .filter(Boolean)
      .join("\n\n"),
    4096
  )
}
