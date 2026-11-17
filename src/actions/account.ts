"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { OAUTH_PROVIDERS } from "@shared/constants"
import { User } from "@shared/models/user"
import {
  changePasswordSchema,
  deleteAccountSchema,
  profileSchema,
} from "@shared/schemas/account"
import { deleteUserData } from "@/lib/account"
import { signIn, signOut, unstable_update } from "@/lib/auth"
import { setLinkIntent } from "@/lib/auth/link-intent"
import { hashPassword, verifyPassword } from "@/lib/auth/passwords"
import { requireUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"
import { getEnv } from "@/lib/env"
import { rateLimit } from "@/lib/rate-limit"

// Settings. Every action: requireUser() → Zod → updates scoped to user.id.
// Anything that proves identity (password change, deletion) re-checks the
// password and is rate-limited per user.

export type AccountActionResult =
  | { ok: true; message?: string }
  | { error: string; fieldErrors?: Record<string, string> }

function invalid(error: z.ZodError): AccountActionResult {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message
  }
  return { error: "Please fix the highlighted fields.", fieldErrors }
}

const providerSchema = z.enum(OAUTH_PROVIDERS)

const PROVIDER_LABELS = { google: "Google", github: "GitHub" } as const

export async function updateProfileAction(
  input: unknown
): Promise<AccountActionResult> {
  const user = await requireUser()
  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  await connectDb()
  await User.updateOne(
    { _id: user.id },
    { $set: { name: parsed.data.name, timezone: parsed.data.timezone } }
  )
  // The name lives in the session cookie too (user menu).
  await unstable_update({})
  // Every /app page formats times in this zone.
  revalidatePath("/app", "layout")
  return { ok: true }
}

/** Wrong password, or too many tries: the same rate limit for both actions. */
async function checkPassword(
  userId: string,
  password: string
): Promise<{ ok: true } | { error: string; field?: string }> {
  const limit = await rateLimit("accountPasswordByUser", userId)
  if (!limit.ok) {
    return {
      error: `Too many attempts. Try again in ${Math.max(1, Math.ceil(limit.retryAfterSec / 60))} minutes.`,
    }
  }
  const record = await User.findById(userId).select("+passwordHash").lean()
  if (!record?.passwordHash) return { ok: true }
  if (!(await verifyPassword(password, record.passwordHash))) {
    return { error: "That password isn't right." }
  }
  return { ok: true }
}

export async function changePasswordAction(
  input: unknown
): Promise<AccountActionResult> {
  const user = await requireUser()
  const parsed = changePasswordSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { currentPassword, newPassword } = parsed.data

  await connectDb()
  const record = await User.findById(user.id).select("+passwordHash").lean()
  if (!record) return { error: "Account not found." }
  if (record.passwordHash) {
    if (!currentPassword) {
      return {
        error: "Enter your current password.",
        fieldErrors: { currentPassword: "Enter your current password" },
      }
    }
    const check = await checkPassword(user.id, currentPassword)
    if ("error" in check) {
      return {
        error: check.error,
        fieldErrors: { currentPassword: check.error },
      }
    }
  }

  // Bumping sessionVersion signs out every other session; this one is
  // re-issued right after with the new version.
  await User.updateOne(
    { _id: user.id },
    {
      $set: { passwordHash: await hashPassword(newPassword) },
      $inc: { sessionVersion: 1 },
    }
  )
  await unstable_update({})
  revalidatePath("/app/settings")
  return {
    ok: true,
    message: record.passwordHash
      ? "Password changed. Other devices have been signed out."
      : "Password set. You can now log in with your email too.",
  }
}

/** Starts the OAuth round-trip that links a provider to this account. */
export async function connectProviderAction(provider: unknown): Promise<void> {
  const user = await requireUser()
  const parsed = providerSchema.safeParse(provider)
  if (!parsed.success) return
  const env = getEnv()
  const enabled =
    parsed.data === "google" ? env.googleEnabled : env.githubEnabled
  if (!enabled) return

  await setLinkIntent(user, parsed.data)
  // Throws Next's redirect to the provider.
  await signIn(parsed.data, {
    redirectTo: `/app/settings?linked=${parsed.data}`,
  })
}

export async function disconnectProviderAction(
  provider: unknown
): Promise<AccountActionResult> {
  const user = await requireUser()
  const parsed = providerSchema.safeParse(provider)
  if (!parsed.success) return { error: "Unknown login provider." }

  await connectDb()
  const record = await User.findById(user.id)
    .select("+passwordHash accounts")
    .lean()
  if (!record) return { error: "Account not found." }
  const others = record.accounts.filter(
    (account) => account.provider !== parsed.data
  )
  if (others.length === record.accounts.length) {
    return { error: `${PROVIDER_LABELS[parsed.data]} isn't connected.` }
  }
  if (!record.passwordHash && others.length === 0) {
    return {
      error: `Set a password first: ${PROVIDER_LABELS[parsed.data]} is your only way to log in.`,
    }
  }
  // The filter repeats the check, so two parallel disconnects can't remove the last login.
  const update = await User.updateOne(
    {
      _id: user.id,
      $or: [
        { passwordHash: { $nin: [null, ""] } },
        { accounts: { $elemMatch: { provider: { $ne: parsed.data } } } },
      ],
    },
    { $pull: { accounts: { provider: parsed.data } } }
  )
  if (update.modifiedCount === 0) {
    return { error: "Keep at least one way to log in." }
  }
  revalidatePath("/app/settings")
  return { ok: true, message: `${PROVIDER_LABELS[parsed.data]} disconnected.` }
}

export async function deleteAccountAction(
  input: unknown
): Promise<AccountActionResult> {
  const user = await requireUser()
  const parsed = deleteAccountSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  if (parsed.data.confirmEmail !== user.email) {
    return {
      error: "Type your account email exactly to confirm.",
      fieldErrors: { confirmEmail: "This isn't your account email" },
    }
  }

  await connectDb()
  const check = await checkPassword(user.id, parsed.data.password)
  if ("error" in check) {
    return { error: check.error, fieldErrors: { password: check.error } }
  }

  try {
    await deleteUserData(user.id)
  } catch (error) {
    console.error(
      "[account] deletion failed:",
      error instanceof Error ? error.message : error
    )
    return {
      error: "Something went wrong while deleting. Please try again.",
    }
  }
  await signOut({ redirectTo: "/?deleted=1" })
  return { ok: true }
}
