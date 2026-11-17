import { cn } from "cn"

const SURFACE_TOKENS = [
  { name: "background", className: "bg-background" },
  { name: "card", className: "bg-card" },
  { name: "popover", className: "bg-popover" },
  { name: "muted", className: "bg-muted" },
  { name: "secondary", className: "bg-secondary" },
  { name: "sidebar", className: "bg-sidebar" },
  { name: "border", className: "bg-border" },
  { name: "foreground", className: "bg-foreground" },
  { name: "muted-foreground", className: "bg-muted-foreground" },
  { name: "primary", className: "bg-primary" },
  { name: "ring", className: "bg-ring" },
  { name: "destructive", className: "bg-destructive" },
] as const

const STATUS_TOKENS = [
  { name: "up", className: "bg-up", meaning: "Monitor is up" },
  { name: "down", className: "bg-down", meaning: "Monitor is down" },
  {
    name: "degraded",
    className: "bg-degraded",
    meaning: "Slow / SSL expiring",
  },
  { name: "paused", className: "bg-paused", meaning: "Paused by user" },
  { name: "nodata", className: "bg-nodata", meaning: "No checks in slot" },
  { name: "info", className: "bg-info", meaning: "3xx codes (not a status)" },
] as const

function Swatch({
  name,
  className,
  meaning,
}: {
  name: string
  className: string
  meaning?: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className={cn("h-14 border-b", className)} />
      <div className="px-3 py-2">
        <p className="text-sm font-medium">{name}</p>
        <p className="font-mono text-xs text-muted-foreground">--{name}</p>
        {meaning && (
          <p className="mt-1 text-xs text-muted-foreground">{meaning}</p>
        )}
      </div>
    </div>
  )
}

export function TokenSwatches() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-medium">Surfaces & text</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SURFACE_TOKENS.map((token) => (
            <Swatch key={token.name} {...token} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Status</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_TOKENS.map((token) => (
            <Swatch key={token.name} {...token} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TypographySamples() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p className="font-mono text-xs text-muted-foreground">
          Inter · font-sans
        </p>
        <p className="text-3xl font-semibold tracking-tight">
          Know before your users do
        </p>
        <p className="text-xl font-semibold tracking-tight">Section heading</p>
        <p className="text-base">
          Body text — PingBoard checks your URLs every few minutes.
        </p>
        <p className="text-sm text-muted-foreground">
          Muted helper text for descriptions and hints.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p className="font-mono text-xs text-muted-foreground">
          JetBrains Mono · font-mono tabular-nums
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Status code</dt>
          <dd className="font-mono tabular-nums">200 · 301 · 404 · 503</dd>
          <dt className="text-muted-foreground">Response time</dt>
          <dd className="font-mono tabular-nums">142 ms · 1.18 s</dd>
          <dt className="text-muted-foreground">Uptime</dt>
          <dd className="font-mono tabular-nums">99.98%</dd>
          <dt className="text-muted-foreground">Timestamp</dt>
          <dd className="font-mono tabular-nums">2026-10-24 14:32:07 UTC</dd>
        </dl>
      </div>
    </div>
  )
}
