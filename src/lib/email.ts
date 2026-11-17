import "server-only"

import { sendEmail as send } from "@shared/email/send"
import type { EmailContent } from "@shared/email/templates"

import { getEnv } from "./env"

/** sendEmail() with the app's EMAIL_* settings. Throws DeliveryError. */
export function sendEmail(to: string, content: EmailContent): Promise<void> {
  const env = getEnv()
  return send(env.email, to, content, {
    production: env.NODE_ENV === "production",
  })
}
