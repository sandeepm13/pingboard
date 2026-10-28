import { cn } from "cn"

/** The PingBoard mark: a heartbeat trace ending in a live "up" dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M5 17h4.5l2.5-6.5 4 12 3-9 1.5 3.5H22"
        className="stroke-background"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="25.5" cy="17" r="2.5" className="fill-up" />
    </svg>
  )
}

export function Logo({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight",
        className
      )}
    >
      <LogoMark className={markClassName} />
      <span>PingBoard</span>
    </span>
  )
}
