import { Suspense } from "react"
import type { Metadata } from "next"

import { PLAN_LIMITS } from "@shared/plans"
import { AccountDeletedNotice } from "@/components/marketing/account-deleted-notice"
import { AlertPreview } from "@/components/marketing/alert-preview"
import { Faq, type FaqItem } from "@/components/marketing/faq"
import { Features } from "@/components/marketing/features"
import { FinalCta } from "@/components/marketing/final-cta"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { SectionHeading } from "@/components/marketing/section-heading"
import { TryItNow } from "@/components/marketing/try-it-now"
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site"

export const metadata: Metadata = pageMetadata({
  title: null,
  description: SITE_DESCRIPTION,
  path: "/",
})

const { free, pro } = PLAN_LIMITS

const FAQ: FaqItem[] = [
  {
    question: "How often are my URLs checked?",
    answer: `Every ${free.minIntervalMinutes} minutes on the Free plan and as often as every minute on Pro. You can pick 1, 3, 5, 10, 30 or 60 minutes per monitor.`,
  },
  {
    question: "When do I get an alert?",
    answer:
      "When a monitor fails two checks in a row, PingBoard opens an incident and sends one down alert. The first successful check closes it and sends a recovery alert with the downtime. Optional reminders repeat every 30 or 60 minutes until someone acknowledges the incident.",
  },
  {
    question: "What counts as down?",
    answer:
      "A timeout, a connection or DNS error, an SSL error, a status code outside the ones you expect (200–299 by default) or a missing keyword. A check that works but is slow is shown as degraded and still counts as up.",
  },
  {
    question: "Will a status page show my URLs or errors?",
    answer:
      "No. A public status page shows only the names you choose, the status and the uptime history. URLs appear only if you turn that on; request headers, bodies and error messages never do. Header values are encrypted at rest.",
  },
  {
    question: "Can I monitor localhost or internal services?",
    answer:
      "No — PingBoard only checks public URLs. Private, internal and cloud-metadata addresses are refused, including hostnames that resolve to them, so nobody can point our checker at a private network.",
  },
  {
    question: "Is the Free plan really free?",
    answer: `Yes: ${free.maxMonitors} monitors, ${free.minIntervalMinutes}-minute checks, email alerts and ${free.maxStatusPages} status page, no credit card. Pro (${pro.maxMonitors} monitors, 1-minute checks, every alert channel) isn't on sale yet — join the waitlist on the pricing page.`,
  },
]

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AccountDeletedNotice />
      </Suspense>
      <Hero />
      <section
        aria-labelledby="try-heading"
        className="mx-auto max-w-3xl px-4 pt-20 sm:px-6 sm:pt-24"
      >
        <SectionHeading
          id="try-heading"
          eyebrow="Try it now"
          title="Is your site up right now?"
          description="Paste a URL and we'll check it from our server — status code and response time, no sign-up."
        />
        <div className="mt-8">
          <TryItNow />
        </div>
      </section>
      <Features />
      <HowItWorks />
      <AlertPreview />
      <Faq items={FAQ} />
      <FinalCta />
    </>
  )
}
