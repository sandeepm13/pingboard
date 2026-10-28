import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { OnboardingForm } from "@/components/onboarding/onboarding-form"

export const metadata: Metadata = { title: "Welcome" }

export default function OnboardingPage() {
  return (
    <AuthCard
      title="What should PingBoard watch first?"
      description="Add one URL now. We'll save it as a draft and you can turn it into a live monitor next."
    >
      <OnboardingForm />
    </AuthCard>
  )
}
