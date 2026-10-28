import "server-only"

import { updateTag } from "next/cache"

import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { CheckResult } from "@shared/models/check-result"
import { DailyStat } from "@shared/models/daily-stat"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { PasswordResetToken } from "@shared/models/password-reset-token"
import { StatusPage } from "@shared/models/status-page"
import { StatusPageLogo } from "@shared/models/status-page-logo"
import { User } from "@shared/models/user"
import type { AlertReminderMinutes, OAuthProvider } from "@shared/types"
import { connectDb } from "@/lib/db"
import { getEnv } from "@/lib/env"
import { statusPageTag } from "@/lib/public-status"
import { removeMonitorSchedule } from "@/lib/scheduler"

export type AccountSettings = {
  name: string
  email: string
  emailVerified: boolean
  timezone: string
  hasPassword: boolean
  linked: OAuthProvider[]
  /** Providers configured on this server (keys set). */
  available: OAuthProvider[]
  reminderMinutes: AlertReminderMinutes
}

/** Everything the settings page shows. Caller has already run requireUser(). */
export async function getAccountSettings(
  userId: string
): Promise<AccountSettings | null> {
  await connectDb()
  const user = await User.findById(userId)
    .select(
      "+passwordHash name email emailVerified timezone accounts alertReminderMinutes"
    )
    .lean()
  if (!user) return null
  const env = getEnv()
  return {
    name: user.name,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    timezone: user.timezone ?? "UTC",
    hasPassword: Boolean(user.passwordHash),
    linked: [...new Set(user.accounts.map((account) => account.provider))],
    available: [
      ...(env.googleEnabled ? (["google"] as const) : []),
      ...(env.githubEnabled ? (["github"] as const) : []),
    ],
    reminderMinutes: (user.alertReminderMinutes ?? 0) as AlertReminderMinutes,
  }
}

/**
 * Removes a user and everything they own. Monitors (and their schedulers)
 * go first so the worker stops checking at once; a check already in flight
 * finds its monitor gone and discards its result. The user record goes last,
 * so a failure half-way leaves an account that can retry the deletion.
 */
export async function deleteUserData(userId: string): Promise<void> {
  await connectDb()
  const monitors = await Monitor.find({ userId }).select("_id").lean()
  const monitorIds = monitors.map((monitor) => monitor._id)
  await Monitor.deleteMany({ userId })
  // Best effort (Redis may be down); the worker's reconcile removes orphans too.
  await Promise.all(
    monitorIds.map((id) => removeMonitorSchedule(id.toString()))
  )

  const pages = await StatusPage.find({ userId }).select("slug").lean()
  await Promise.all([
    // By monitorId: these collections are indexed on it, not on userId.
    CheckResult.deleteMany({ monitorId: { $in: monitorIds } }),
    DailyStat.deleteMany({ monitorId: { $in: monitorIds } }),
    Incident.deleteMany({ userId }),
    AlertLog.deleteMany({ userId }),
    AlertChannel.deleteMany({ userId }),
    StatusPageLogo.deleteMany({ userId }),
    StatusPage.deleteMany({ userId }),
    PasswordResetToken.deleteMany({ userId }),
  ])
  for (const page of pages) updateTag(statusPageTag(page.slug))

  await User.deleteOne({ _id: userId })
}
