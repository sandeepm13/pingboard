import {
  BellRingIcon,
  CalendarRangeIcon,
  GaugeIcon,
  GlobeIcon,
  ShieldCheckIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react"

import {
  DEFAULT_FAILURE_THRESHOLD,
  SSL_ALERT_DAYS,
  UPTIME_HISTORY_DAYS,
} from "@shared/constants"
import { PLAN_LIMITS } from "@shared/plans"

import { Reveal } from "./motion"
import { SectionHeading } from "./section-heading"

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  detail: string
}

const FEATURES: Feature[] = [
  {
    icon: TimerIcon,
    title: "Checks every minute",
    description:
      "GET, POST or HEAD with your own headers, body and expected status codes. Optionally require a keyword in the response.",
    detail: `every ${PLAN_LIMITS.pro.minIntervalMinutes} min on Pro · ${PLAN_LIMITS.free.minIntervalMinutes} min on Free`,
  },
  {
    icon: GaugeIcon,
    title: "Status codes + response time",
    description:
      "Every check records up or down, the HTTP status code and how long it took, with plain-word errors like “Timeout after 10s”.",
    detail: "200 · 142 ms · p95 per day",
  },
  {
    icon: BellRingIcon,
    title: "Instant alerts",
    description: `Email, Discord, Slack or Telegram after ${DEFAULT_FAILURE_THRESHOLD} failed checks in a row — no alert storms from one blip — and again when it recovers.`,
    detail: "one alert per outage + recovery",
  },
  {
    icon: GlobeIcon,
    title: "Public status pages",
    description:
      "A page like /status/your-company that tells your users what's up. You pick the services and their public names; URLs stay private.",
    detail: "badge for your README included",
  },
  {
    icon: ShieldCheckIcon,
    title: "SSL expiry warnings",
    description:
      "We read the certificate of every https monitor daily and warn you before visitors see a security error.",
    detail: `alerts at ${SSL_ALERT_DAYS.join(" and ")} days left`,
  },
  {
    icon: CalendarRangeIcon,
    title: `${UPTIME_HISTORY_DAYS}-day history`,
    description:
      "Uptime for 24 hours, 7 and 30 days, a response-time chart and a 90-day bar per monitor, plus every incident with its timeline.",
    detail: "raw checks 30 days · daily stats 1 year",
  },
]

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
    >
      <SectionHeading
        id="features-heading"
        eyebrow="Features"
        title="Everything a small team needs. Nothing it doesn't."
        description="Set up in a minute, quiet until something breaks, clear about what broke."
      />
      <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <li key={feature.title} className="bg-background">
            <Reveal delay={(index % 3) * 0.06} className="h-full p-6">
              <feature.icon
                aria-hidden="true"
                className="size-5 text-muted-foreground"
              />
              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {feature.description}
              </p>
              <p className="mt-4 font-mono text-xs text-muted-foreground/80">
                {feature.detail}
              </p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
