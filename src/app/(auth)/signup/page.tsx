import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import {
  OAuthSection,
  OAuthSectionSkeleton,
} from "@/components/auth/oauth-section"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata: Metadata = { title: "Sign up" }

export default function SignupPage() {
  return (
    <AuthCard
      title="Start monitoring free"
      description="Create your account. Your first monitor takes under a minute."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<OAuthSectionSkeleton />}>
        <OAuthSection />
      </Suspense>
      <SignupForm />
    </AuthCard>
  )
}
