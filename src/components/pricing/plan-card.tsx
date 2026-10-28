import { CheckIcon } from "lucide-react"
import { cn } from "cn"

import type { Plan } from "@shared/types"
import { PLAN_LIMITS } from "@shared/plans"
import { PLAN_PRICES, PLAN_TAGLINES, planFeatures } from "@/lib/pricing"

export function PlanCard({
  plan,
  highlighted = false,
  badge,
  action,
}: {
  plan: Plan
  highlighted?: boolean
  badge?: string
  action: React.ReactNode
}) {
  const price = PLAN_PRICES[plan]
  const headingId = `plan-${plan}`
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex flex-col rounded-xl border bg-card p-6 sm:p-8",
        highlighted && "border-foreground/30 ring-1 ring-foreground/10"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-semibold">
          {PLAN_LIMITS[plan].label}
        </h2>
        {badge && (
          <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {PLAN_TAGLINES[plan]}
      </p>
      <p className="mt-6 flex items-baseline gap-2">
        <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
          {price.amount}
        </span>
        <span className="text-sm text-muted-foreground">{price.period}</span>
      </p>
      <div className="mt-6">{action}</div>
      <ul className="mt-8 space-y-3 text-sm">
        {planFeatures(plan).map((feature) => (
          <li key={feature} className="flex gap-3">
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-up"
            />
            {feature}
          </li>
        ))}
      </ul>
    </section>
  )
}
