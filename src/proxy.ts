import NextAuth from "next-auth"
import { NextResponse } from "next/server"

import { authConfig } from "@/lib/auth/auth.config"

// Optimistic gate: only reads the signed JWT cookie (no DB). Every server
// action, page loader and route handler still calls requireUser().
const { auth } = NextAuth(authConfig)

const GUEST_ONLY = new Set(["/login", "/signup", "/forgot-password"])

export default auth((req) => {
  const { nextUrl } = req
  const { pathname } = nextUrl
  const user = req.auth?.user

  const isApp = pathname === "/app" || pathname.startsWith("/app/")
  const isOnboarding = pathname === "/onboarding"

  if (!user) {
    if (isApp || isOnboarding) {
      const login = new URL("/login", nextUrl)
      login.searchParams.set("callbackUrl", pathname + nextUrl.search)
      return NextResponse.redirect(login)
    }
    return
  }

  const home = user.onboarded ? "/app" : "/onboarding"

  // `reason` is set by requireUser() when the cookie exists but is no longer
  // valid; let that request through to the login page instead of looping.
  if (GUEST_ONLY.has(pathname) && !nextUrl.searchParams.has("reason")) {
    return NextResponse.redirect(new URL(home, nextUrl))
  }
  if (isApp && !user.onboarded) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl))
  }
  if (isOnboarding && user.onboarded) {
    return NextResponse.redirect(new URL("/app", nextUrl))
  }
})

export const config = {
  matcher: [
    "/app",
    "/app/:path*",
    "/onboarding",
    "/login",
    "/signup",
    "/forgot-password",
  ],
}
