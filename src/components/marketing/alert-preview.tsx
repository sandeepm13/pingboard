import {
  downMessage,
  recoveredMessage,
  type AlertContext,
  type AlertIncident,
} from "@shared/alerts/format"
import { siteUrl } from "@/lib/site"

import { DiscordPreview } from "./discord-preview"
import { EmailPreview } from "./email-preview"
import { Reveal } from "./motion"
import { SectionHeading } from "./section-heading"

// The previews use the same message builders the worker sends with, on a
// fixed sample incident (fixed dates: nothing time-dependent at prerender).

const MONITOR = {
  id: "sample",
  name: "Checkout API",
  url: "https://shop.acme.dev/api/checkout",
}

const STARTED = new Date(Date.UTC(2026, 9, 27, 10, 42, 0))
const RESOLVED = new Date(Date.UTC(2026, 9, 27, 10, 49, 12))

const INCIDENT: AlertIncident = {
  id: "sample",
  startedAt: STARTED,
  resolvedAt: null,
  durationSeconds: null,
  cause: { statusCode: 503, errorMessage: "Unexpected status 503" },
  checksFailed: 2,
}

function context(now: Date): AlertContext {
  return { appUrl: siteUrl().origin, timeZone: "UTC", now }
}

export function AlertPreview() {
  const down = downMessage(MONITOR, INCIDENT, context(STARTED))
  const recovered = recoveredMessage(
    MONITOR,
    { ...INCIDENT, resolvedAt: RESOLVED, durationSeconds: 432 },
    context(RESOLVED)
  )

  return (
    <section
      aria-labelledby="alerts-heading"
      className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24"
    >
      <SectionHeading
        id="alerts-heading"
        eyebrow="Alerts"
        title="Alerts that say what broke."
        description="What failed, since when, and a link to the incident. Then one message when it's back — with how long it was down."
      />
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        <Reveal>
          <DiscordPreview messages={[down, recovered]} />
        </Reveal>
        <Reveal delay={0.08}>
          <EmailPreview message={down} />
        </Reveal>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Sample messages, rendered from the same templates PingBoard sends. Slack
        and Telegram get the same content in their own format.
      </p>
    </section>
  )
}
