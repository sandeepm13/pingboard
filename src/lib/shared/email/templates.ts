import { escapeHtml } from "../alerts/render-chat"
import type { AlertMessage, AlertTone } from "../alerts/types"

// HTML + plain-text emails. Email clients ignore stylesheets and CSS
// variables, so styles are inline literals (light theme, readable anywhere).

export type EmailContent = { subject: string; html: string; text: string }

const ACCENTS: Record<AlertTone, string> = {
  down: "#d93036",
  up: "#18794e",
  warning: "#ad5700",
  info: "#0d74ce",
}

function layout(options: {
  heading: string
  accent: string
  bodyHtml: string
  button: { label: string; url: string }
  footer: string
}): string {
  const { heading, accent, bodyHtml, button, footer } = options
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Arial,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;border-top:4px solid ${accent}">
<tr><td style="padding:24px 24px 8px;font-size:13px;font-weight:600;color:#71717a;letter-spacing:.02em">PingBoard</td></tr>
<tr><td style="padding:0 24px 8px"><h1 style="margin:0;font-size:20px;line-height:1.35;font-weight:600;color:#18181b">${escapeHtml(heading)}</h1></td></tr>
<tr><td style="padding:8px 24px 0;font-size:14px;line-height:1.6;color:#3f3f46">${bodyHtml}</td></tr>
<tr><td style="padding:20px 24px 24px"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px">${escapeHtml(button.label)}</a></td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#71717a">${escapeHtml(footer)}</p>
</td></tr></table>
</body></html>`
}

export function alertEmail(message: AlertMessage): EmailContent {
  const rows = message.fields
    .map(
      (field) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#71717a;white-space:nowrap;vertical-align:top">${escapeHtml(field.label)}</td><td style="padding:6px 0;font-family:'JetBrains Mono',Consolas,monospace;font-size:13px;word-break:break-all">${escapeHtml(field.value)}</td></tr>`
    )
    .join("")
  const bodyHtml = `<p style="margin:0 0 12px">${escapeHtml(message.text)}</p>${
    rows
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e4e4e7;font-size:14px">${rows}</table>`
      : ""
  }`
  const footer =
    "You get this email because this address is an alert channel in PingBoard. Change it under Alerts."
  return {
    subject: message.title,
    html: layout({
      heading: message.title,
      accent: ACCENTS[message.tone],
      bodyHtml,
      button: { label: message.linkLabel, url: message.url },
      footer,
    }),
    text: [
      message.text,
      "",
      ...message.fields.map((f) => `${f.label}: ${f.value}`),
      "",
      `${message.linkLabel}: ${message.url}`,
      "",
      footer,
    ].join("\n"),
  }
}

export function passwordResetEmail(link: string): EmailContent {
  const footer =
    "If you didn't ask to reset your password, ignore this email; your password stays the same."
  return {
    subject: "Reset your PingBoard password",
    html: layout({
      heading: "Reset your password",
      accent: ACCENTS.info,
      bodyHtml:
        '<p style="margin:0">Someone (hopefully you) asked to reset the password of your PingBoard account. The link works once and expires in 1 hour.</p>',
      button: { label: "Choose a new password", url: link },
      footer,
    }),
    text: `Reset your PingBoard password\n\nOpen this link to choose a new password (works once, expires in 1 hour):\n${link}\n\n${footer}`,
  }
}
