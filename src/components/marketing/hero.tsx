import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { PLAN_LIMITS } from "@shared/plans"
import { StatusDot } from "@/components/status/status-dot"
import { Button } from "@/components/ui/button"

import { HeroPreview } from "./hero-preview"
import { Reveal } from "./motion"

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b"
    >
      {/* Faint grid, fading out: texture without a gradient blob. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] mask-[radial-gradient(ellipse_at_top,black_20%,transparent_70%)] bg-size-[48px_48px] opacity-60"
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <StatusDot status="up" size="sm" />
            Uptime monitoring for websites and APIs
          </p>
          <h1
            id="hero-heading"
            className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
          >
            Know your site is down before your users do.
          </h1>
          <p className="mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
            PingBoard checks your URLs every few minutes and alerts you
            instantly — by email, Discord, Slack or Telegram — the moment
            something breaks.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start monitoring free
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">See live demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free plan: {PLAN_LIMITS.free.maxMonitors} monitors, no credit card.
          </p>
        </div>
        <Reveal delay={0.15} className="mx-auto mt-14 max-w-4xl">
          <HeroPreview />
        </Reveal>
      </div>
    </section>
  )
}
