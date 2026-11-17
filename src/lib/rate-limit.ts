import "server-only"

import { createHash } from "node:crypto"

import { getRedis } from "./redis"

export const RATE_LIMITS = {
  loginByIp: { limit: 20, windowSec: 15 * 60 },
  loginByEmail: { limit: 8, windowSec: 15 * 60 },
  signupByIp: { limit: 5, windowSec: 60 * 60 },
  forgotByIp: { limit: 5, windowSec: 60 * 60 },
  forgotByEmail: { limit: 3, windowSec: 60 * 60 },
  /** "Test now" makes an outbound request from our server. */
  monitorTestByUser: { limit: 10, windowSec: 60 },
  /** "Send test alert" posts to a webhook or sends an email. */
  testAlertByUser: { limit: 5, windowSec: 60 },
  testAlertByUserDaily: { limit: 50, windowSec: 24 * 60 * 60 },
  /**
   * "Try it now" on the landing page: anonymous outbound requests. The global
   * cap bounds the total even if x-forwarded-for is spoofed (until Stage 10).
   */
  tryCheckByIp: { limit: 5, windowSec: 10 * 60 },
  tryCheckByIpDaily: { limit: 30, windowSec: 24 * 60 * 60 },
  tryCheckGlobal: { limit: 300, windowSec: 60 * 60 },
  waitlistByIp: { limit: 5, windowSec: 60 * 60 },
  /** Settings: password change and account deletion check the password. */
  accountPasswordByUser: { limit: 5, windowSec: 15 * 60 },
} as const

export type RateLimitRule = keyof typeof RATE_LIMITS

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSec: number }

/** Hash identifiers so emails/IPs aren't stored in Redis in plain text. */
function keyFor(rule: RateLimitRule, identifier: string) {
  const digest = createHash("sha256").update(identifier).digest("hex")
  return `rl:${rule}:${digest.slice(0, 32)}`
}

/**
 * Fixed-window counter. If Redis is unreachable the request is allowed (and
 * logged): an outage shouldn't lock every user out of the app.
 */
export async function rateLimit(
  rule: RateLimitRule,
  identifier: string
): Promise<RateLimitResult> {
  const { limit, windowSec } = RATE_LIMITS[rule]
  const key = keyFor(rule, identifier)

  try {
    const results = await getRedis()
      .multi()
      .incr(key)
      .expire(key, windowSec, "NX")
      .ttl(key)
      .exec()
    const count = Number(results?.[0]?.[1] ?? 0)
    const ttl = Number(results?.[2]?.[1] ?? windowSec)
    if (count > limit) {
      return { ok: false, retryAfterSec: ttl > 0 ? ttl : windowSec }
    }
    return { ok: true }
  } catch (error) {
    console.error(
      `[rate-limit] ${rule}: Redis unavailable, allowing request:`,
      error instanceof Error ? error.message : error
    )
    return { ok: true }
  }
}

/** Checks several rules; the first one that is exceeded wins. */
export async function rateLimitAll(
  checks: [RateLimitRule, string][]
): Promise<RateLimitResult> {
  for (const [rule, identifier] of checks) {
    const result = await rateLimit(rule, identifier)
    if (!result.ok) return result
  }
  return { ok: true }
}

export function retryMessage(retryAfterSec: number) {
  const minutes = Math.max(1, Math.ceil(retryAfterSec / 60))
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}
