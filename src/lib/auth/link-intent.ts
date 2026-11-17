import "server-only"

import { createHmac, timingSafeEqual } from "node:crypto"

import type { Session } from "next-auth"
import { cookies } from "next/headers"

import type { OAuthProvider } from "@shared/types"
import { getEnv } from "@/lib/env"

// "Connect Google/GitHub" from Settings. Before redirecting to the provider we
// set a short-lived, HMAC-signed cookie naming the logged-in user. The OAuth
// callback links the provider account to that user only if the cookie is
// valid, unexpired, for this provider, and the request still carries a
// session for the same user and sessionVersion (so a stale cookie on a shared
// computer can't attach someone else's login to this account).

const COOKIE = "pb_link_intent"
const COOKIE_PATH = "/api/auth"
const TTL_SEC = 5 * 60

export type LinkIntent = { userId: string; provider: OAuthProvider }

function sign(payload: string): string {
  return createHmac("sha256", getEnv().AUTH_SECRET)
    .update(`link-intent:${payload}`)
    .digest("base64url")
}

function sameSignature(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function setLinkIntent(
  user: { id: string; sessionVersion: number },
  provider: OAuthProvider
): Promise<void> {
  const expires = Date.now() + TTL_SEC * 1000
  const payload = `${user.id}.${user.sessionVersion}.${provider}.${expires}`
  ;(await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    path: COOKIE_PATH,
    maxAge: TTL_SEC,
  })
}

export async function clearLinkIntent(): Promise<void> {
  ;(await cookies()).delete({ name: COOKIE, path: COOKIE_PATH })
}

/**
 * The verified intent for this OAuth callback, or null. Always clears the
 * cookie, so an intent is used at most once.
 */
export async function consumeLinkIntent(
  provider: string,
  session: Session | null
): Promise<LinkIntent | null> {
  const store = await cookies()
  const raw = store.get(COOKIE)?.value
  if (!raw) return null
  await clearLinkIntent()

  const parts = raw.split(".")
  if (parts.length !== 5) return null
  const [userId, version, intentProvider, expires, signature] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]
  const payload = `${userId}.${version}.${intentProvider}.${expires}`
  if (!sameSignature(signature, sign(payload))) return null
  if (Number(expires) < Date.now()) return null
  if (intentProvider !== provider) return null
  if (
    session?.user?.id !== userId ||
    session.user.sessionVersion !== Number(version)
  ) {
    return null
  }
  return { userId, provider: intentProvider as OAuthProvider }
}
