import "server-only"

import { z } from "zod"

import { emailEnvSchema, type EmailConfig } from "@shared/email/config"

/** "true" turns it on; empty/missing/"false" is off. */
const booleanFlag = z
  .enum(["true", "false", ""])
  .optional()
  .transform((value) => value === "true")

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    APP_URL: z.url().default("http://localhost:3000"),
    MONGODB_URI: z.url({ protocol: /^mongodb(\+srv)?$/ }),
    MONGODB_DB: z.string().min(1).optional(),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters"),
    AUTH_GOOGLE_ID: z.string().min(1).optional(),
    AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
    AUTH_GITHUB_ID: z.string().min(1).optional(),
    AUTH_GITHUB_SECRET: z.string().min(1).optional(),
    ENCRYPTION_KEY: z
      .string()
      .refine((value) => Buffer.from(value, "base64").length === 32, {
        error:
          "ENCRYPTION_KEY must be 32 random bytes, base64 (openssl rand -base64 32)",
      }),
    SSRF_ALLOW_PRIVATE: booleanFlag,
  })
  .refine((env) => !(env.NODE_ENV === "production" && env.SSRF_ALLOW_PRIVATE), {
    path: ["SSRF_ALLOW_PRIVATE"],
    error: "SSRF_ALLOW_PRIVATE must be false in production",
  })
  .transform((env) => ({
    ...env,
    APP_URL: env.APP_URL.replace(/\/+$/, ""),
    googleEnabled: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    githubEnabled: Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
  }))

export type ServerEnv = z.output<typeof serverEnvSchema> & {
  email: EmailConfig
}

let cached: ServerEnv | undefined

function describeIssues(error: z.ZodError) {
  // Name the bad keys, never their values.
  return error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n")
}

// Parsed lazily (not at import) so `next build` doesn't need runtime secrets.
export function getEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverEnvSchema.safeParse(process.env)
  const email = emailEnvSchema.safeParse(process.env)
  if (!parsed.success || !email.success) {
    const issues = [parsed.error, email.error]
      .filter((error) => error !== undefined)
      .map(describeIssues)
      .join("\n")
    throw new Error(`Invalid server environment:\n${issues}`)
  }
  cached = { ...parsed.data, email: email.data }
  return cached
}
