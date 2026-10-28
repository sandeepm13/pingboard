import "server-only"

import { isValidObjectId } from "mongoose"
import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

import { User } from "@shared/models/user"
import type { Plan } from "@shared/types"
import { connectDb } from "@/lib/db"
import { getEnv } from "@/lib/env"

import { auth } from "./index"

export type CurrentUser = {
  id: string
  name: string
  email: string
  image: string | null
  plan: Plan
  timezone: string
  onboarded: boolean
  draftMonitor: { url: string; name: string | null } | null
  sessionVersion: number
}

/**
 * sessionVersion of a session cookie re-issued during this request, or null.
 * A Server Action that bumps sessionVersion (password change) re-issues the
 * cookie, then Next re-renders the page in the same response. auth() reads
 * the request's original Cookie header (the old version); cookies() already
 * holds the new cookie. An old cookie on its own never passes this check.
 */
async function reissuedSessionVersion(userId: string): Promise<number | null> {
  const store = await cookies()
  const secureCookie = store
    .getAll()
    .some((cookie) => cookie.name.startsWith("__Secure-authjs.session-token"))
  const token = await getToken({
    req: { headers: { cookie: store.toString() } },
    secret: getEnv().AUTH_SECRET,
    secureCookie,
  })
  return token?.sub === userId && typeof token.sv === "number" ? token.sv : null
}

/**
 * The logged-in user, freshly read from MongoDB (once per request).
 * Returns null when there is no session, the user no longer exists, or the
 * session predates a password change.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth()
  const id = session?.user?.id
  if (!id || !isValidObjectId(id)) return null

  await connectDb()
  const user = await User.findById(id).lean()
  if (!user) return null
  if (
    user.sessionVersion !== session.user.sessionVersion &&
    (await reissuedSessionVersion(id)) !== user.sessionVersion
  ) {
    return null
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    plan: user.plan,
    timezone: user.timezone ?? "UTC",
    onboarded: Boolean(user.onboardedAt),
    draftMonitor: user.draftMonitor
      ? { url: user.draftMonitor.url, name: user.draftMonitor.name ?? null }
      : null,
    sessionVersion: user.sessionVersion,
  }
})

/**
 * Use at the top of every server action, page data loader and route handler.
 * Redirects to /login when there is no valid session.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  // `reason` lets a stale cookie reach /login instead of bouncing back to /app.
  if (!user) redirect("/login?reason=session")
  return user
}

/** Route-handler variant: JSON 401 instead of a redirect. */
export async function requireApiUser(): Promise<
  { user: CurrentUser; response?: never } | { user?: never; response: Response }
> {
  const user = await getCurrentUser()
  if (!user) {
    return {
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { user }
}
