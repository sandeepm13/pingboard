import type { Metadata } from "next"
import Link from "next/link"

import { PLAN_LIMITS } from "@shared/plans"
import { Faq, type FaqItem } from "@/components/marketing/faq"
import { Reveal } from "@/components/marketing/motion"
import { ComparisonTable } from "@/components/pricing/comparison-table"
import { PlanCard } from "@/components/pricing/plan-card"
import { WaitlistDialog } from "@/components/pricing/waitlist-dialog"
import { Button } from "@/components/ui/button"
import { pageMetadata } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description: `Free: ${PLAN_LIMITS.free.maxMonitors} monitors, ${PLAN_LIMITS.free.minIntervalMinutes}-minute checks, email alerts and a status page. Pro: ${PLAN_LIMITS.pro.maxMonitors} monitors, 1-minute checks and every alert channel.`,
  path: "/pricing",
})

const FAQ: FaqItem[] = [
  {
    question: "Can I buy Pro today?",
    answer:
      "Not yet — payments aren't built. The Pro price shown is a placeholder. Join the waitlist and we'll email you once when it's available.",
  },
  {
    question: "Do I need a credit card for the Free plan?",
    answer: "No. Sign up with email, Google or GitHub and start monitoring.",
  },
  {
    question: "What happens when I hit a limit?",
    answer:
      "Nothing breaks: existing monitors keep running. You just can't add more monitors or status pages than your plan allows, or pick a shorter interval.",
  },
  {
    question: "Can I delete my account and data?",
    answer:
      "Yes, any time in Settings. It removes your monitors, check results, incidents, alert channels and status pages right away.",
  },
]

export default function PricingPage() {
  return (
    <>
      <section
        aria-labelledby="pricing-heading"
        className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-24"
      >
        <div className="mx-auto max-w-2xl text-center">
          <h1
            id="pricing-heading"
            className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
          >
            Simple pricing. Start free.
          </h1>
          <p className="mt-4 text-pretty text-muted-foreground sm:text-lg">
            Every plan gets real-time alerts, status pages, SSL warnings and 90
            days of history. Pro adds more monitors, 1-minute checks and every
            alert channel.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
          <Reveal>
            <PlanCard
              plan="free"
              action={
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link href="/signup">Start monitoring free</Link>
                </Button>
              }
            />
          </Reveal>
          <Reveal delay={0.08}>
            <PlanCard
              plan="pro"
              highlighted
              badge="Coming soon"
              action={<WaitlistDialog className="w-full" />}
            />
          </Reveal>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Prices are placeholders. Payments aren&apos;t live yet, so nobody is
          charged.
        </p>
      </section>
      <section
        aria-labelledby="compare-heading"
        className="mx-auto max-w-3xl px-4 pt-20 sm:px-6"
      >
        <h2
          id="compare-heading"
          className="mb-6 text-center text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Compare plans
        </h2>
        <ComparisonTable />
      </section>
      <Faq items={FAQ} title="Pricing questions." />
    </>
  )
}
