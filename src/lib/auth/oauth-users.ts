import "server-only"

import type { Account, Profile, User as AuthUser } from "next-auth"

import { User } from "@shared/models/user"
import type { OAuthProvider } from "@shared/types"
import { connectDb } from "@/lib/db"

type GitHubEmail = { email: string; primary: boolean; verified: boolean }

/** Returns the provider's email only if the provider says it is verified. */
async function verifiedEmail(
  provider: OAuthProvider,
  profile: Profile | undefined,
  account: Account
): Promise<string | null> {
  if (provider === "google") {
    return profile?.email_verified === true && profile.email
      ? profile.email.toLowerCase()
      : null
  }

  // GitHub: the profile email can be an unverified primary address, so check.
  if (!account.access_token) return null
  const res = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "PingBoard",
    },
    signal: AbortSignal.timeout(5_000),
  })
  if (!res.ok) return null
  const emails = (await res.json()) as GitHubEmail[]
  const pick =
    emails.find((e) => e.primary && e.verified) ??
    emails.find((e) => e.verified)
  return pick ? pick.email.toLowerCase() : null
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github"
}

/**
 * "Connect" from Settings (see link-intent.ts): attach the provider account to
 * the logged-in user, whatever email the provider has. One account per
 * provider per user; an account already linked elsewhere is refused.
 */
async function linkToUser(
  userId: string,
  link: { provider: OAuthProvider; providerAccountId: string }
): Promise<true | string> {
  const owner = await User.findOne({
    "accounts.provider": link.provider,
    "accounts.providerAccountId": link.providerAccountId,
  })
    .select("_id")
    .lean()
  if (owner) {
    return owner._id.toString() === userId
      ? true
      : `/app/settings?link=in_use&provider=${link.provider}`
  }
  const update = await User.updateOne(
    { _id: userId, "accounts.provider": { $ne: link.provider } },
    { $push: { accounts: link } }
  ).catch((error: { code?: number }) => {
    // Linked to another user at the same moment: the unique index caught it.
    if (error.code === 11000) return null
    throw error
  })
  if (!update) return `/app/settings?link=in_use&provider=${link.provider}`
  if (update.matchedCount === 0) {
    return `/app/settings?link=exists&provider=${link.provider}`
  }
  return true
}

/**
 * Finds or creates the PingBoard user for an OAuth sign-in, or links the
 * account to `linkToUserId` (a verified link intent from Settings).
 * Returns false (deny) or a redirect path when the email can't be trusted.
 */
export async function upsertOAuthUser(
  user: AuthUser,
  account: Account,
  profile: Profile | undefined,
  linkToUserId: string | null = null
): Promise<boolean | string> {
  if (!isOAuthProvider(account.provider)) return false
  const provider = account.provider
  const link = { provider, providerAccountId: account.providerAccountId }

  await connectDb()
  if (linkToUserId) return linkToUser(linkToUserId, link)

  const existingByAccount = await User.exists({
    "accounts.provider": provider,
    "accounts.providerAccountId": account.providerAccountId,
  })
  if (existingByAccount) return true

  const email = await verifiedEmail(provider, profile, account)
  if (!email) return "/login?error=EmailNotVerified"

  const existingByEmail = await User.findOne({ email }).select(
    "+passwordHash emailVerified"
  )

  if (existingByEmail) {
    // Pre-hijack protection: anyone could have signed up with this email and a
    // password before its real owner arrived via a verified provider. Drop that
    // unverified password and invalidate its sessions.
    const unverifiedPassword =
      !existingByEmail.emailVerified && existingByEmail.passwordHash
    await User.updateOne(
      { _id: existingByEmail._id },
      {
        $push: { accounts: link },
        $set: {
          emailVerified: existingByEmail.emailVerified ?? new Date(),
          ...(unverifiedPassword ? { passwordHash: null } : {}),
        },
        ...(unverifiedPassword ? { $inc: { sessionVersion: 1 } } : {}),
      }
    )
    return true
  }

  await User.create({
    name: user.name?.trim() || email.split("@")[0],
    email,
    emailVerified: new Date(),
    image: user.image ?? null,
    accounts: [link],
  })
  return true
}
