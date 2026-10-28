import type { DefaultSession } from "next-auth"

import type { Plan } from "@shared/types"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      plan: Plan
      onboarded: boolean
      sessionVersion: number
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    plan?: Plan
    onboarded?: boolean
    /** User.sessionVersion at sign-in; see requireUser(). */
    sv?: number
  }
}
