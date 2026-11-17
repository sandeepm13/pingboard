import type { NextAuthConfig } from "next-auth"

/**
 * DB-free part of the Auth.js config. The proxy uses only this (it just reads
 * the signed JWT cookie); `./index.ts` adds providers and DB-backed callbacks.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      session.user.plan = token.plan ?? "free"
      session.user.onboarded = token.onboarded ?? false
      session.user.sessionVersion = token.sv ?? 0
      return session
    },
  },
} satisfies NextAuthConfig
