import nodemailer, { type Transporter } from "nodemailer"

import { ALERT_LIMITS } from "../constants"
import { DeliveryError, isPermanentHttpStatus } from "../alerts/errors"
import type { EmailConfig } from "./config"
import type { EmailContent } from "./templates"

// The one sendEmail() for the app and the worker. The provider comes from
// EMAIL_PROVIDER: Resend (REST API), SMTP (nodemailer) or console (dev).

export type EmailLogger = (line: string) => void

export type SendEmailOptions = {
  /** Prints console-provider emails, including bodies outside production. */
  log?: EmailLogger
  production?: boolean
}

function clip(value: string, max = 200) {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`
}

async function sendWithResend(
  config: Extract<EmailConfig, { provider: "resend" }>,
  to: string,
  content: EmailContent
) {
  let response: Response
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: config.from, to: [to], ...content }),
      signal: AbortSignal.timeout(ALERT_LIMITS.requestTimeoutMs),
    })
  } catch (error) {
    const timeout = (error as { name?: string }).name === "TimeoutError"
    throw new DeliveryError(
      timeout ? "Resend didn't answer in time" : "Couldn't reach Resend",
      { permanent: false }
    )
  }
  if (response.ok) return
  // Resend's error messages are safe to show ("You can only send testing emails to…").
  const body = (await response.json().catch(() => null)) as {
    message?: string
  } | null
  throw new DeliveryError(
    `Resend rejected the email (${response.status}${body?.message ? `: ${clip(body.message)}` : ""})`,
    { permanent: isPermanentHttpStatus(response.status) }
  )
}

let smtpTransport: { key: string; transporter: Transporter } | null = null

function transportFor(config: Extract<EmailConfig, { provider: "smtp" }>) {
  const key = `${config.host}:${config.port}:${config.secure}:${config.user}`
  if (smtpTransport?.key !== key) {
    smtpTransport = {
      key,
      transporter: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: config.user
          ? { user: config.user, pass: config.pass ?? "" }
          : undefined,
        connectionTimeout: ALERT_LIMITS.requestTimeoutMs,
        greetingTimeout: ALERT_LIMITS.requestTimeoutMs,
        socketTimeout: ALERT_LIMITS.requestTimeoutMs * 2,
        // We never attach files or remote content.
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    }
  }
  return smtpTransport.transporter
}

async function sendWithSmtp(
  config: Extract<EmailConfig, { provider: "smtp" }>,
  to: string,
  content: EmailContent
) {
  try {
    await transportFor(config).sendMail({ from: config.from, to, ...content })
  } catch (error) {
    const err = error as { code?: string; responseCode?: number }
    if (err.code === "EAUTH") {
      throw new DeliveryError("SMTP login failed (check SMTP_USER/SMTP_PASS)", {
        permanent: true,
      })
    }
    if (err.responseCode) {
      // 5xx SMTP replies are final (bad address, rejected); 4xx are temporary.
      throw new DeliveryError(
        `The mail server refused the email (${err.responseCode})`,
        {
          permanent: err.responseCode >= 500,
        }
      )
    }
    throw new DeliveryError(
      `Couldn't reach the mail server${err.code ? ` (${err.code})` : ""}`,
      { permanent: false }
    )
  }
}

export async function sendEmail(
  config: EmailConfig,
  to: string,
  content: EmailContent,
  options: SendEmailOptions = {}
): Promise<void> {
  switch (config.provider) {
    case "resend":
      return sendWithResend(config, to, content)
    case "smtp":
      return sendWithSmtp(config, to, content)
    case "console": {
      // In production nothing may pretend to be delivered (and bodies can
      // hold reset links), so it fails like any undeliverable email.
      if (options.production) {
        throw new DeliveryError(
          "Email isn't set up on this server (EMAIL_PROVIDER)",
          { permanent: true }
        )
      }
      const log = options.log ?? ((line: string) => console.info(line))
      log(
        `[email:console] to=${to} subject="${content.subject}"\n${content.text}`
      )
      return
    }
  }
}
