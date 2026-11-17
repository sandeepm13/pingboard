import { StatusDot } from "@/components/status/status-dot"
import { STATUS_META } from "@/components/status/status-meta"

import { Reveal } from "./motion"
import { SectionHeading } from "./section-heading"

const CHECKS = [
  { time: "10:40", code: 200, ms: "138 ms", status: "up" as const },
  { time: "10:41", code: 200, ms: "151 ms", status: "up" as const },
  { time: "10:42", code: 503, ms: "—", status: "down" as const },
]

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="border-y bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
        <SectionHeading
          id="how-heading"
          eyebrow="How it works"
          title="Three steps, about a minute."
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          <Step
            number={1}
            title="Add your URL"
            description="Paste a website or API endpoint. Defaults are sensible; advanced options are there when you need them."
            delay={0}
          >
            <div className="rounded-md border bg-background px-3 py-2 font-mono text-xs">
              https://api.acme.dev/health
            </div>
          </Step>
          <Step
            number={2}
            title="We check it every minute"
            description="From our servers, around the clock (every 5 minutes on Free). Each result is stored with its status code and timing."
            delay={0.08}
          >
            <ul className="space-y-1.5 font-mono text-xs tabular-nums">
              {CHECKS.map((check) => (
                <li key={check.time} className="flex items-center gap-2">
                  <StatusDot
                    status={check.status}
                    size="sm"
                    pulse={false}
                    label={STATUS_META[check.status].label}
                  />
                  <span className="text-muted-foreground">{check.time}</span>
                  <span
                    className={check.status === "up" ? "text-up" : "text-down"}
                  >
                    {check.code}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {check.ms}
                  </span>
                </li>
              ))}
            </ul>
          </Step>
          <Step
            number={3}
            title="Get alerted"
            description="Two failed checks in a row open an incident and alert you. The first good check closes it and tells you."
            delay={0.16}
          >
            <p className="rounded-md border border-down/25 bg-down/10 px-3 py-2 text-xs text-down">
              <span aria-hidden="true">🔴 </span>Public API is DOWN — 503
              Service Unavailable
            </p>
          </Step>
        </ol>
      </div>
    </section>
  )
}

function Step({
  number,
  title,
  description,
  delay,
  children,
}: {
  number: number
  title: string
  description: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <li>
      <Reveal
        delay={delay}
        className="flex h-full flex-col rounded-xl border bg-card p-5"
      >
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full border font-mono text-xs"
        >
          {number}
        </span>
        <h3 className="mt-4 font-medium">
          <span className="sr-only">Step {number}: </span>
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 pt-1">{children}</div>
      </Reveal>
    </li>
  )
}
