"use server"

import { createHash, randomBytes } from "node:crypto"

import { AuthError } from "next-auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { after } from "next/server"

import { OAUTH_PROVIDERS } from "@shared/constants"
import { passwordResetEmail } from "@shared/email/templates"
import { PasswordResetToken } from "@shared/models/password-reset-token"
import { User } from "@shared/models/user"
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from "@shared/schemas/auth"
import { signIn, signOut } from "@/lib/auth"
import { clearLinkIntent } from "@/lib/auth/link-intent"
import { hashPassword } from "@/lib/auth/passwords"
import { connectDb } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { getEnv } from "@/lib/env"
import { rateLimit, rateLimitAll, retryMessage } from "@/lib/rate-limit"
import { clientIp, safeRedirectPath } from "@/lib/request"

export type ActionResult = { error: string } | { ok: true; message?: string }

const INVALID_INPUT = { error: "Please fix the highlighted fields." }
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function signupAction(input: unknown): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input)
  if (!parsed.success) return INVALID_INPUT
  const { name, email, password, timezone } = parsed.data

  const limit = await rateLimit("signupByIp", clientIp(await headers()))
  if (!limit.ok) return { error: retryMessage(limit.retryAfterSec) }

  await connectDb()
  if (await User.exists({ email })) {
    return {
      error: "An account with this email already exists. Try logging in.",
    }
  }

  try {
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      timezone: timezone ?? "UTC",
    })
  } catch (error) {
    // Two signups for the same email at once: the unique index catches it.
    if ((error as { code?: number }).code === 11000) {
      return {
        error: "An account with this email already exists. Try logging in.",
      }
    }
    throw error
  }

  return loginWithCredentials(email, password, "/onboarding")
}

export async function loginAction(
  input: unknown,
  callbackUrl?: string
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) return INVALID_INPUT
  return loginWithCredentials(
    parsed.data.email,
    parsed.data.password,
    safeRedirectPath(callbackUrl)
  )
}

async function loginWithCredentials(
  email: string,
  password: string,
  redirectTo: string
): Promise<ActionResult> {
  try {
    // On success this throws Next's redirect, which must propagate.
    await signIn("credentials", { email, password, redirectTo })
    return { ok: true }
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        const code = (error as AuthError & { code?: string }).code
        return {
          error:
            code === "rate_limited"
              ? "Too many login attempts. Try again in a few minutes."
              : "Incorrect email or password.",
        }
      }
      console.error("[auth] sign-in failed:", error.type)
      return { error: "Something went wrong. Please try again." }
    }
    throw error
  }
}

export async function oauthSignInAction(
  provider: string,
  callbackUrl?: string
): Promise<void> {
  if (!(OAUTH_PROVIDERS as readonly string[]).includes(provider)) return
  await signIn(provider, { redirectTo: safeRedirectPath(callbackUrl) })
}

export async function logoutAction(): Promise<void> {
  // An unfinished "Connect GitHub" mustn't outlive the session that started it.
  await clearLinkIntent()
  await signOut({ redirectTo: "/login" })
}

const FORGOT_OK: ActionResult = {
  ok: true,
  message:
    "If an account exists for that email, a reset link is on its way. It expires in 1 hour.",
}

export async function forgotPasswordAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input)
  if (!parsed.success) return INVALID_INPUT
  const { email } = parsed.data

  const limit = await rateLimitAll([
    ["forgotByIp", clientIp(await headers())],
    ["forgotByEmail", email],
  ])
  if (!limit.ok) return { error: retryMessage(limit.retryAfterSec) }

  await connectDb()
  const user = await User.findOne({ email }).select("_id").lean()
  // Same answer whether or not the account exists (no email enumeration).
  if (!user) return FORGOT_OK

  const token = randomBytes(32).toString("base64url")
  await PasswordResetToken.deleteMany({ userId: user._id })
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  })

  const link = `${getEnv().APP_URL}/reset-password?token=${token}`
  // Sent after the response, so a slow mail server doesn't reveal (by timing)
  // that the account exists. The console provider prints it in development.
  after(async () => {
    try {
      await sendEmail(email, passwordResetEmail(link))
    } catch (error) {
      console.error(
        "[auth] password reset email failed:",
        error instanceof Error ? error.message : error
      )
    }
  })
  return FORGOT_OK
}

export async function resetPasswordAction(
  input: unknown
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input)
  if (!parsed.success) return INVALID_INPUT
  const { token, password } = parsed.data

  await connectDb()
  const record = await PasswordResetToken.findOneAndDelete({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  })
  if (!record) {
    return {
      error: "This reset link is invalid or has expired. Request a new one.",
    }
  }

  // Bumping sessionVersion logs out every existing session for this user.
  await User.updateOne(
    { _id: record.userId },
    {
      $set: { passwordHash: await hashPassword(password) },
      $inc: { sessionVersion: 1 },
    }
  )
  await PasswordResetToken.deleteMany({ userId: record.userId })

  redirect("/login?reset=1")
}
