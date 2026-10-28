// Channel-agnostic alert content. Built once per event (format.ts), stored on
// the AlertLog, then rendered per channel (render-*.ts).

export const ALERT_TONES = ["down", "up", "warning", "info"] as const
export type AlertTone = (typeof ALERT_TONES)[number]

export type AlertField = { label: string; value: string }

export type AlertMessage = {
  /** Short headline, e.g. "🔴 Checkout API is DOWN". Email subject. */
  title: string
  /** The full one-line message, e.g. "🔴 Checkout API is DOWN — 503 … — since 10:42 IST". */
  text: string
  /** Extra facts shown as embed fields / table rows. */
  fields: AlertField[]
  /** Link to the monitor or incident page (APP_URL based). */
  url: string
  linkLabel: string
  tone: AlertTone
}

/** Payload of a "dispatch" job: one event, fanned out to the monitor's channels. */
export type AlertEvent =
  | { kind: "down" | "recovered"; incidentId: string }
  | { kind: "reminder"; incidentId: string; reminder: number }
  | {
      kind: "ssl"
      monitorId: string
      expiresAt: string
      /** The SSL_ALERT_DAYS threshold that was crossed (14 or 3). */
      thresholdDays: number
    }
  | {
      kind: "degraded"
      monitorId: string
      checkedAt: string
      responseTimeMs: number
    }

/** Payload of a "deliver" job. Everything else is read from the AlertLog. */
export type AlertDeliverJob = { alertLogId: string }

/** A channel with its secrets decrypted, ready to send. Never log this. */
export type ResolvedChannel =
  | { type: "email"; email: string }
  | { type: "discord" | "slack"; webhookUrl: string }
  | { type: "telegram"; botToken: string; chatId: string }
