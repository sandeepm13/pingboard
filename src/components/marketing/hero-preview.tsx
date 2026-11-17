"use client"

import { useEffect, useRef, useState } from "react"
import { PauseIcon, PlayIcon } from "lucide-react"
import { m, useReducedMotion } from "motion/react"
import { cn } from "cn"

import type { MonitorStatus } from "@shared/types"
import { useHydrated } from "@/components/common/time-zone"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusCodeText } from "@/components/status/status-code-text"
import { UptimeBar } from "@/components/status/uptime-bar"
import { Button } from "@/components/ui/button"
import { mulberry32 } from "@/lib/prng"

import {
  createDemoRandom,
  DEMO_BASE_TIME,
  DEMO_POINTS,
  DEMO_SPECS,
  DEMO_TICK_MS,
  demoSlots,
  initialSeries,
  isFlipDown,
  nextResponse,
  type DemoSpec,
} from "./hero-preview-data"
import { Sparkline } from "./sparkline"

type DemoState = {
  tick: number
  /** Response times per monitor, oldest first; null = failed check. */
  series: Record<string, (number | null)[]>
  /** End of the uptime bars (fixed until mounted, then "now"). */
  baseTime: number
}

/**
 * A mini dashboard with sample monitors, built from the app's own status
 * components. A new "check" arrives every few seconds and the Checkout
 * monitor goes down and recovers. It starts paused for people who prefer
 * reduced motion, and can always be paused.
 */
export function HeroPreview() {
  const hydrated = useHydrated()
  const reducedMotion = useReducedMotion()
  const [choice, setChoice] = useState<boolean | null>(null)
  const playing = choice ?? (hydrated && !reducedMotion)

  const [state, setState] = useState<DemoState>(() => ({
    tick: 0,
    series: initialSeries(createDemoRandom()),
    baseTime: DEMO_BASE_TIME,
  }))
  const rand = useRef(mulberry32(7))

  useEffect(() => {
    if (!playing) return
    // One timeout per tick: the next one is scheduled when `state.tick` changes.
    const timer = window.setTimeout(() => {
      // Drawn outside the updater, which must stay pure (StrictMode runs it twice).
      const tick = state.tick + 1
      const fresh = Object.fromEntries(
        DEMO_SPECS.map((spec) => [
          spec.id,
          spec.flips && isFlipDown(tick)
            ? null
            : nextResponse(spec, rand.current),
        ])
      )
      const now = Date.now()
      setState((current) => ({
        tick: current.tick + 1,
        baseTime: now,
        series: Object.fromEntries(
          DEMO_SPECS.map((spec) => [
            spec.id,
            [
              ...(current.series[spec.id] ?? []).slice(-(DEMO_POINTS - 1)),
              fresh[spec.id] ?? null,
            ],
          ])
        ),
      }))
    }, DEMO_TICK_MS)
    return () => window.clearTimeout(timer)
  }, [playing, state.tick])

  const statusOf = (spec: DemoSpec): MonitorStatus =>
    spec.flips && isFlipDown(state.tick) ? "down" : "up"
  const downCount = DEMO_SPECS.filter(
    (spec) => statusOf(spec) === "down"
  ).length

  return (
    <figure className="overflow-hidden rounded-xl border bg-card text-left shadow-2xl shadow-black/20">
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2.5">
        <span className="text-sm font-medium">Monitors</span>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono tabular-nums">{DEMO_SPECS.length}</span>{" "}
          monitors ·{" "}
          <span
            className={cn(
              "font-mono tabular-nums",
              downCount > 0 ? "text-down" : "text-up"
            )}
          >
            {downCount}
          </span>{" "}
          down
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          Sample data
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-pressed={!playing}
          aria-label="Pause the live preview"
          onClick={() => setChoice(!playing)}
          className="-my-1"
        >
          {playing ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
        </Button>
      </figcaption>
      <ul className="divide-y">
        {DEMO_SPECS.map((spec) => (
          <DemoRow
            key={spec.id}
            spec={spec}
            status={statusOf(spec)}
            values={state.series[spec.id] ?? []}
            baseTime={state.baseTime}
          />
        ))}
      </ul>
    </figure>
  )
}

function DemoRow({
  spec,
  status,
  values,
  baseTime,
}: {
  spec: DemoSpec
  status: MonitorStatus
  values: (number | null)[]
  baseTime: number
}) {
  const last = values[values.length - 1] ?? null
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3 transition-colors duration-500 motion-reduce:transition-none",
        "sm:grid-cols-[minmax(0,1fr)_6rem_4.5rem_2.5rem]",
        "lg:grid-cols-[minmax(0,1fr)_7rem_4.5rem_2.5rem_10rem]",
        status === "down" && "bg-down/[0.07]"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <m.span
          key={status}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="inline-flex w-[4.75rem] shrink-0"
        >
          <StatusBadge status={status} />
        </m.span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{spec.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {spec.url}
          </p>
        </div>
      </div>
      <div className="hidden sm:block">
        <Sparkline values={values} />
      </div>
      <ResponseTimeText
        ms={status === "down" ? null : last}
        className="text-right text-sm"
      />
      <StatusCodeText
        code={status === "down" ? 503 : 200}
        className="hidden text-right text-sm sm:inline"
      />
      <UptimeBar
        label={`${spec.name}, last 24 hours`}
        slots={demoSlots(spec, baseTime, status)}
        slotMinutes={60}
        className="hidden h-6 lg:flex"
      />
    </li>
  )
}
