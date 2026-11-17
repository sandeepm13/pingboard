import { z } from "zod"

import { DEFAULT_SLOW_THRESHOLD_MS } from "@shared/constants"
import { emailEnvSchema, type EmailConfig } from "@shared/email/config"

/** .env.example leaves keys blank; treat "" like "not set" so defaults apply. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional()
  )
}

const workerEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    /** Dev only: let checks reach private addresses. Refused in production. */
    SSRF_ALLOW_PRIVATE: z
      .enum(["true", "false", ""])
      .optional()
      .transform((value) => value === "true"),
    MONGODB_URI: z.url({ protocol: /^mongodb(\+srv)?$/ }),
    /** Same database as the web app (Atlas URIs often have no db in the path). */
    MONGODB_DB: optional(z.string().min(1)),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    /** Same key as the web app: decrypts monitor headers and bodies. */
    ENCRYPTION_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, {
        error:
          "ENCRYPTION_KEY must be 32 random bytes, base64 (openssl rand -base64 32)",
      }),
    LOG_LEVEL: optional(
      z.enum(["trace", "debug", "info", "warn", "error", "fatal"])
    ),
    // Checks are I/O-bound. Load test (300 × 1-min monitors, 2 % timing out):
    // 20 → avg lag 1.8 s, p95 4 s; 50 → avg 0.17 s, p95 0.43 s. Stay below
    // Mongoose's default pool (100): each check makes a few sequential queries.
    WORKER_CONCURRENCY: optional(z.coerce.number().int().min(1).max(200)).pipe(
      z.number().default(50)
    ),
    WORKER_HEALTH_PORT: optional(
      z.coerce.number().int().min(1).max(65_535)
    ).pipe(z.number().default(3001)),
    /** Loopback by default; set 0.0.0.0 inside a container if needed. */
    WORKER_HEALTH_HOST: optional(z.string().min(1)).pipe(
      z.string().default("127.0.0.1")
    ),
    CHECK_USER_AGENT: optional(z.string().min(1).max(200)),
    /** An up check slower than this is "degraded". */
    SLOW_THRESHOLD_MS: optional(
      z.coerce.number().int().min(100).max(60_000)
    ).pipe(z.number().default(DEFAULT_SLOW_THRESHOLD_MS)),
    /** Base of the links in alerts (monitor and incident pages). */
    APP_URL: optional(z.url({ protocol: /^https?$/ })).pipe(
      z.string().default("http://localhost:3000")
    ),
    /** Alert deliveries sent in parallel. */
    ALERT_CONCURRENCY: optional(z.coerce.number().int().min(1).max(50)).pipe(
      z.number().default(5)
    ),
  })
  .refine((env) => !(env.NODE_ENV === "production" && env.SSRF_ALLOW_PRIVATE), {
    path: ["SSRF_ALLOW_PRIVATE"],
    error: "SSRF_ALLOW_PRIVATE must be false in production",
  })
  .transform((env) => ({ ...env, APP_URL: env.APP_URL.replace(/\/+$/, "") }))

export type WorkerEnv = z.infer<typeof workerEnvSchema> & {
  email: EmailConfig
}

function describeIssues(error: z.ZodError) {
  // Print which keys are wrong, never their values.
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}

export function loadWorkerEnv(): WorkerEnv {
  const parsed = workerEnvSchema.safeParse(process.env)
  const email = emailEnvSchema.safeParse(process.env)
  if (!parsed.success || !email.success) {
    const issues = [parsed.error, email.error]
      .filter((error) => error !== undefined)
      .map(describeIssues)
      .join("\n")
    throw new Error(`Invalid worker environment:\n${issues}`)
  }
  return { ...parsed.data, email: email.data }
}
