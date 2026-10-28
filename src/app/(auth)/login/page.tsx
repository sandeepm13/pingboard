import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import {
  OAuthSection,
  OAuthSectionSkeleton,
} from "@/components/auth/oauth-section"

export const metadata: Metadata = { title: "Log in" }

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in to PingBoard"
      description="Welcome back. Your monitors kept watch while you were away."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<OAuthSectionSkeleton />}>
        <OAuthSection />
      </Suspense>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  )
}
