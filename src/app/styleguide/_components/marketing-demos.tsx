import { SectionHeading } from "@/components/marketing/section-heading"
import { Sparkline } from "@/components/marketing/sparkline"
import { PlanCard } from "@/components/pricing/plan-card"
import { SettingsCard } from "@/components/settings/settings-card"
import { Button } from "@/components/ui/button"

import { DemoLabel } from "./section"

const VALUES = [
  140,
  152,
  138,
  160,
  171,
  149,
  133,
  null,
  null,
  142,
  158,
  166,
  150,
  144,
]

export function MarketingDemos() {
  return (
    <div className="grid gap-8">
      <div>
        <DemoLabel>SectionHeading</DemoLabel>
        <SectionHeading
          id="demo-section-heading"
          eyebrow="Features"
          title="Everything a small team needs."
          description="Eyebrow, h2 and intro for a landing-page section."
        />
      </div>
      <div className="max-w-xs">
        <DemoLabel>Sparkline (null = failed check, red tick)</DemoLabel>
        <Sparkline values={VALUES} />
      </div>
      <div className="max-w-sm">
        <DemoLabel>PlanCard (limits from PLAN_LIMITS)</DemoLabel>
        <PlanCard
          plan="free"
          action={
            <Button variant="outline" className="w-full">
              Start monitoring free
            </Button>
          }
        />
      </div>
      <div className="grid gap-4">
        <DemoLabel>SettingsCard (default / danger)</DemoLabel>
        <SettingsCard
          id="demo-settings"
          title="Profile"
          description="Heading, help text, content."
        >
          <p className="text-sm text-muted-foreground">Form goes here.</p>
        </SettingsCard>
        <SettingsCard
          id="demo-settings-danger"
          title="Delete account"
          tone="danger"
          description="Destructive settings get a red border and heading."
        >
          <Button variant="destructive">Delete account</Button>
        </SettingsCard>
      </div>
    </div>
  )
}
