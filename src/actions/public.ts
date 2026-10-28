"use server"

import { headers } from "next/headers"

import { runHttpCheck } from "@shared/checks/http-check"
import { DEFAULT_EXPECTED_STATUS_CODES } from "@shared/constants"
import { WaitlistEntry } from "@shared/models/waitlist-entry"
import { waitlistSchema } from "@shared/schemas/account"
import { tryCheckSchema } from "@shared/schemas/monitor"
import { parseStatusCodes } from "@shared/status-codes"
import { connectDb } from "@/lib/db"
import { rateLimitAll, retryMessage } from "@/lib/rate-limit"
import { clientIp } from "@/lib/request"

import type { TestMonitorResult } from "./monitors"

// Actions anyone can call, without an account. Each one is rate-limited by IP
// before it does any work.

const TRY_TIMEOUT_MS = 10_000

const EXPECTED = parseStatusCodes(DEFAULT_EXPECTED_STATUS_CODES)

/**
 * One GET from our server to a public URL, nothing stored. Same check runner
 * and SSRF guard as monitors, with private addresses always refused (the
 * dev-only SSRF_ALLOW_PRIVATE flag is deliberately not applied here).
 */
export async function tryCheckAction(
  input: unknown
): Promise<TestMonitorResult> {
  const parsed = tryCheckSchema.safeParse(input)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter a valid URL"
    return { error: message, fieldErrors: { url: message } }
  }

  const ip = clientIp(await headers())
  const limit = await rateLimitAll([
    ["tryCheckByIp", ip],
    ["tryCheckByIpDaily", ip],
    ["tryCheckGlobal", "all"],
  ])
  if (!limit.ok) {
    return {
      error: `That's a lot of checks. Try again in ${Math.max(1, Math.ceil(limit.retryAfterSec / 60))} min, or sign up to monitor it for free.`,
    }
  }

  const check = await runHttpCheck(
    {
      url: parsed.data.url,
      method: "GET",
      headers: [],
      body: null,
      timeoutMs: TRY_TIMEOUT_MS,
      expectedStatusCodes: EXPECTED.ok ? EXPECTED.ranges : [],
      keyword: null,
      followRedirects: true,
    },
    { allowPrivate: false }
  )
  return {
    ok: true,
    result: {
      status: check.status,
      isUp: check.isUp,
      statusCode: check.statusCode,
      responseTimeMs: check.responseTimeMs,
      errorMessage: check.errorMessage,
    },
  }
}

export type WaitlistResult = { ok: true; message: string } | { error: string }

/** Same answer whether or not the email was already on the list. */
export async function joinWaitlistAction(
  input: unknown
): Promise<WaitlistResult> {
  const parsed = waitlistSchema.safeParse(input)
  if (!parsed.success) return { error: "Enter a valid email address." }

  const limit = await rateLimitAll([
    ["waitlistByIp", clientIp(await headers())],
  ])
  if (!limit.ok) return { error: retryMessage(limit.retryAfterSec) }

  await connectDb()
  await WaitlistEntry.updateOne(
    { email: parsed.data.email },
    { $setOnInsert: { email: parsed.data.email, plan: "pro" } },
    { upsert: true }
  ).catch((error: { code?: number }) => {
    // Two requests for the same email at once: the unique index caught it.
    if (error.code !== 11000) throw error
  })
  return {
    ok: true,
    message:
      "You're on the list. We'll email you once when Pro is available — nothing else.",
  }
}
