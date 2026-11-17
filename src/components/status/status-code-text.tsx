import { cn } from "cn"

// Full class names so Tailwind can see them. The code itself is the label,
// so colour is never the only signal.
const CLASS_BY_FAMILY = {
  2: "text-up",
  3: "text-info",
  4: "text-degraded",
  5: "text-down",
} as const

export function statusCodeClass(code: number | null | undefined): string {
  if (code == null) return "text-muted-foreground"
  const family = Math.floor(code / 100) as keyof typeof CLASS_BY_FAMILY
  return CLASS_BY_FAMILY[family] ?? "text-foreground"
}

/** HTTP status code: 2xx green, 3xx blue, 4xx amber, 5xx red, — for none. */
export function StatusCodeText({
  code,
  className,
}: {
  code: number | null | undefined
  className?: string
}) {
  if (code == null) {
    return (
      <span className={cn("font-mono text-muted-foreground", className)}>
        <span aria-hidden="true">—</span>
        <span className="sr-only">No status code</span>
      </span>
    )
  }
  return (
    <span
      className={cn("font-mono tabular-nums", statusCodeClass(code), className)}
    >
      {code}
    </span>
  )
}
