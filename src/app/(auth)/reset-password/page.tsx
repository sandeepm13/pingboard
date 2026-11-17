import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { AuthCard } from "@/components/auth/auth-card"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"

export const metadata: Metadata = {
  title: "Choose a new password",
  // The token is in the URL; don't leak it to other sites via Referer.
  referrer: "no-referrer",
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="This also signs you out on every other device."
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  )
}
