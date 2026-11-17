import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Button } from "@/components/ui/button"

import {
  BrandDemo,
  ButtonsDemo,
  CardsDemo,
  InputsDemo,
  StatesDemo,
  TabsAlertsDemo,
} from "./_components/component-gallery"
import { FormDemo } from "./_components/form-demo"
import { IncidentDemos } from "./_components/incident-demos"
import { MarketingDemos } from "./_components/marketing-demos"
import { MetricDemos } from "./_components/metric-demos"
import { MonitorTableDemo } from "./_components/monitor-table-demo"
import { OverlayDemos } from "./_components/overlay-demos"
import { Section } from "./_components/section"
import { StatusDemos, UptimeBarDemos } from "./_components/status-demos"
import { StatusPageDemos } from "./_components/status-page-demos"
import { TokenSwatches, TypographySamples } from "./_components/tokens"

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false },
}

const SECTIONS = [
  { id: "tokens", title: "Colour tokens" },
  { id: "type", title: "Typography" },
  { id: "brand", title: "Logo" },
  { id: "status", title: "Status" },
  { id: "uptime", title: "Uptime bar" },
  { id: "metrics", title: "Stats & chart" },
  { id: "table", title: "Monitor table" },
  { id: "incidents", title: "Incidents & alerts" },
  { id: "status-pages", title: "Status pages" },
  { id: "marketing", title: "Marketing & settings" },
  { id: "buttons", title: "Buttons & badges" },
  { id: "inputs", title: "Inputs" },
  { id: "form", title: "Form" },
  { id: "cards", title: "Cards" },
  { id: "tabs", title: "Tabs & alerts" },
  { id: "overlays", title: "Overlays" },
  { id: "states", title: "Page states" },
] as const

export default function StyleguidePage() {
  // A development reference only; production builds answer 404.
  if (process.env.NODE_ENV === "production") notFound()
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" aria-label="PingBoard home" className="rounded-md">
            <Logo />
          </Link>
          <span className="font-mono text-xs text-muted-foreground">
            /styleguide
          </span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/">Marketing layout</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/app">App layout</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[180px_1fr]">
        <nav aria-label="Styleguide sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="min-w-0">
          <div className="mb-10">
            <h1 className="text-2xl font-semibold tracking-tight">
              Design system
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tokens and components used across PingBoard, shown with fake data.
              Toggle the theme to check dark and light.
            </p>
          </div>

          <Section
            id="tokens"
            title="Colour tokens"
            description="CSS variables in globals.css. Use them through Tailwind classes like bg-card or text-up."
          >
            <TokenSwatches />
          </Section>
          <Section
            id="type"
            title="Typography"
            description="Inter for UI text, JetBrains Mono for numbers and status codes."
          >
            <TypographySamples />
          </Section>
          <Section id="brand" title="Logo">
            <BrandDemo />
          </Section>
          <Section
            id="status"
            title="Status"
            description="Status is always shown with a text label, never colour alone."
          >
            <StatusDemos />
          </Section>
          <Section
            id="uptime"
            title="Uptime bar"
            description="One bar per time slot. Hover for details; screen readers get a summary."
          >
            <UptimeBarDemos />
          </Section>
          <Section
            id="metrics"
            title="Stats & chart"
            description="StatCard, StatusCodeText and the Recharts response-time chart (failed checks shaded red)."
          >
            <MetricDemos />
          </Section>
          <Section
            id="table"
            title="Monitor table"
            description="Dashboard row preview. Scrolls sideways inside its card on narrow screens."
          >
            <MonitorTableDemo />
          </Section>
          <Section
            id="incidents"
            title="Incidents & alerts"
            description="Incident state (icon + word), delivery status of an alert, channel types, and the incident timeline."
          >
            <IncidentDemos />
          </Section>
          <Section
            id="status-pages"
            title="Status pages"
            description="Public page banner (icon + words for every state), visitor wording per service, and ThemeScope: a subtree with its own light / dark / auto scheme."
          >
            <StatusPageDemos />
          </Section>
          <Section
            id="marketing"
            title="Marketing & settings"
            description="Landing-page building blocks (the hero preview reuses StatusBadge, UptimeBar and ResponseTimeText) and the settings card."
          >
            <MarketingDemos />
          </Section>
          <Section id="buttons" title="Buttons & badges">
            <ButtonsDemo />
          </Section>
          <Section id="inputs" title="Inputs">
            <InputsDemo />
          </Section>
          <Section
            id="form"
            title="Form"
            description="react-hook-form + Zod. Submit empty to see validation errors."
          >
            <FormDemo />
          </Section>
          <Section id="cards" title="Cards">
            <CardsDemo />
          </Section>
          <Section id="tabs" title="Tabs & alerts">
            <TabsAlertsDemo />
          </Section>
          <Section id="overlays" title="Overlays">
            <OverlayDemos />
          </Section>
          <Section
            id="states"
            title="Page states"
            description="Headers, empty states and loading skeletons."
          >
            <StatesDemo />
          </Section>
        </main>
      </div>
    </div>
  )
}
