import "server-only"

import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type NextAuthResult,
} from "next-auth"
import type { JWT } from "next-auth/jwt"
import Credentials from "next-auth/providers/credentials"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

import { User, type UserDoc } from "@shared/models/user"
import { loginSchema } from "@shared/schemas/auth"
import { connectDb } from "@/lib/db"
import { rateLimitAll } from "@/lib/rate-limit"
import { clientIp } from "@/lib/request"

import { authConfig } from "./auth.config"
import { consumeLinkIntent } from "./link-intent"
import { isOAuthProvider, upsertOAuthUser } from "./oauth-users"
import { verifyPassword } from "./passwords"

/** Surfaces as `error.code` in the login action, so the UI can say why. */
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited"
}

type TokenUser = Pick<
  UserDoc,
  "name" | "email" | "image" | "plan" | "onboardedAt" | "sessionVersion"
> & { _id: { toString(): string } }

const TOKEN_USER_FIELDS = "name email image plan onboardedAt sessionVersion"

function applyUser(token: JWT, user: TokenUser): JWT {
  token.sub = user._id.toString()
  token.name = user.name
  token.email = user.email
  token.picture = user.image ?? null
  token.plan = user.plan
  token.onboarded = Boolean(user.onboardedAt)
  token.sv = user.sessionVersion
  return token
}

const credentials = Credentials({
  credentials: { email: {}, password: {} },
  async authorize(input, request) {
    const parsed = loginSchema.safeParse(input)
    if (!parsed.success) return null
    const { email, password } = parsed.data

    // Lives here (not only in the login action) because this endpoint can
    // also be called directly at /api/auth/callback/credentials.
    const limit = await rateLimitAll([
      ["loginByIp", clientIp(request.headers)],
      ["loginByEmail", email],
    ])
    if (!limit.ok) throw new RateLimitedSignin()

    await connectDb()
    const user = await User.findOne({ email }).select("+passwordHash")
    const valid = await verifyPassword(password, user?.passwordHash)
    if (!user || !valid) return null

    return { id: user._id.toString(), name: user.name, email: user.email }
  },
})

function providers(): NextAuthConfig["providers"] {
  const list: NextAuthConfig["providers"] = [credentials]
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    list.push(Google)
  }
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    list.push(GitHub)
  }
  return list
}

// Annotated because the signIn callback calls `auth` (else TS infers a cycle).
const nextAuth: NextAuthResult = NextAuth({
  ...authConfig,
  providers: providers(),
  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account, profile }) {
      if (!account || account.type === "credentials") return true
      // "Connect" from Settings: only honoured for the same, still-valid session.
      const intent = await consumeLinkIntent(
        account.provider,
        await nextAuth.auth()
      )
      return upsertOAuthUser(user, account, profile, intent?.userId ?? null)
    },

    // DB is touched only at sign-in and on explicit session updates; normal
    // requests just decode the cookie.
    async jwt({ token, user, account, trigger }) {
      if (account && user) {
        await connectDb()
        let dbUser: TokenUser | null = null
        if (account.type === "credentials") {
          dbUser = await User.findById(
            user.id,
            TOKEN_USER_FIELDS
          ).lean<TokenUser>()
        } else if (isOAuthProvider(account.provider)) {
          dbUser = await User.findOne(
            {
              "accounts.provider": account.provider,
              "accounts.providerAccountId": account.providerAccountId,
            },
            TOKEN_USER_FIELDS
          ).lean<TokenUser>()
        }
        return dbUser ? applyUser(token, dbUser) : null
      }

      if (trigger === "update" && token.sub) {
        // Ignore any client-supplied data; reload the truth from the DB.
        await connectDb()
        const dbUser = await User.findById(
          token.sub,
          TOKEN_USER_FIELDS
        ).lean<TokenUser>()
        return dbUser ? applyUser(token, dbUser) : null
      }

      return token
    },
  },
})

export const { handlers, auth, signIn, signOut, unstable_update } = nextAuth
