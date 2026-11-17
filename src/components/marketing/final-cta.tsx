import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { PLAN_LIMITS } from "@shared/plans"
import { Button } from "@/components/ui/button"

import { Reveal } from "./motion"

export function FinalCta() {
  return (
    <section aria-labelledby="cta-heading" className="border-t">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2
          id="cta-heading"
          className="text-2xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          Your users shouldn&apos;t be your monitoring.
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-muted-foreground">
          Add your first URL in under a minute. Free for up to{" "}
          {PLAN_LIMITS.free.maxMonitors} monitors, no credit card.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Start monitoring free
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  )
}
