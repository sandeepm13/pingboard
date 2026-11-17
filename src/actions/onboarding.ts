"use server"

import { redirect } from "next/navigation"

import { User } from "@shared/models/user"
import { onboardingSchema, timezoneSchema } from "@shared/schemas/auth"
import { unstable_update } from "@/lib/auth"
import { requireUser } from "@/lib/auth/require-user"

import type { ActionResult } from "./auth"

async function finishOnboarding(
  userId: string,
  update: Record<string, unknown>
): Promise<never> {
  await User.updateOne(
    { _id: userId },
    { $set: { ...update, onboardedAt: new Date() } }
  )
  // Re-issue the session cookie so the proxy sees onboarded = true.
  await unstable_update({})
  redirect("/app")
}

/**
 * Saves the first URL as a draft. It becomes a real monitor in Stage 3, where
 * the full SSRF check runs; here we only check it's a well-formed http(s) URL.
 */
export async function saveFirstMonitorAction(
  input: unknown
): Promise<ActionResult> {
  const user = await requireUser()
  const parsed = onboardingSchema.safeParse(input)
  if (!parsed.success) return { error: "Please fix the highlighted fields." }
  const { url, name, timezone } = parsed.data

  return finishOnboarding(user.id, {
    draftMonitor: { url, name: name || null, createdAt: new Date() },
    ...(timezone ? { timezone } : {}),
  })
}

export async function skipOnboardingAction(timezone?: unknown): Promise<void> {
  const user = await requireUser()
  // The browser's guess; a value we don't recognise is ignored, not an error.
  const tz = timezoneSchema.safeParse(timezone)
  await finishOnboarding(user.id, tz.success ? { timezone: tz.data } : {})
}
