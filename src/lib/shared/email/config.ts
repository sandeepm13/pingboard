import { z } from "zod"

// EMAIL_* environment variables, shared by the web app (password reset) and
// the worker (alert emails). Parsed by each process's env.ts.

export type EmailConfig =
  | { provider: "console"; from: string }
  | { provider: "resend"; from: string; apiKey: string }
  | {
      provider: "smtp"
      from: string
      host: string
      port: number
      secure: boolean
      user: string | null
      pass: string | null
    }

/** .env.example leaves keys blank; treat "" like "not set". */
const blank = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema.optional())

/** Resend's shared test sender: only delivers to your own Resend account email. */
export const RESEND_TEST_FROM = "PingBoard <onboarding@resend.dev>"

export const emailEnvSchema = z
  .object({
    EMAIL_PROVIDER: blank(z.enum(["console", "resend", "smtp"])),
    EMAIL_FROM: blank(z.string().min(3).max(200)),
    RESEND_API_KEY: blank(z.string().min(1)),
    SMTP_HOST: blank(z.string().min(1)),
    SMTP_PORT: blank(z.coerce.number().int().min(1).max(65_535)),
    SMTP_SECURE: blank(z.enum(["true", "false"])),
    SMTP_USER: blank(z.string().min(1)),
    SMTP_PASS: blank(z.string().min(1)),
  })
  .superRefine((env, ctx) => {
    const require = (key: keyof typeof env, why: string) => {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: why })
    }
    if (env.EMAIL_PROVIDER === "resend") {
      require("RESEND_API_KEY", "required when EMAIL_PROVIDER=resend")
    }
    if (env.EMAIL_PROVIDER === "smtp") {
      require("SMTP_HOST", "required when EMAIL_PROVIDER=smtp")
      if (!env.EMAIL_FROM && !env.SMTP_USER) {
        require("EMAIL_FROM", "required when EMAIL_PROVIDER=smtp (or set SMTP_USER)")
      }
    }
  })
  .transform((env): EmailConfig => {
    switch (env.EMAIL_PROVIDER) {
      case "resend":
        return {
          provider: "resend",
          from: env.EMAIL_FROM ?? RESEND_TEST_FROM,
          apiKey: env.RESEND_API_KEY ?? "",
        }
      case "smtp": {
        const port = env.SMTP_PORT ?? 587
        return {
          provider: "smtp",
          from: env.EMAIL_FROM ?? `PingBoard <${env.SMTP_USER}>`,
          host: env.SMTP_HOST ?? "",
          port,
          // 465 = implicit TLS; 587/25 upgrade with STARTTLS.
          secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
          user: env.SMTP_USER ?? null,
          pass: env.SMTP_PASS ?? null,
        }
      }
      default:
        return {
          provider: "console",
          from: env.EMAIL_FROM ?? "PingBoard <noreply@localhost>",
        }
    }
  })
