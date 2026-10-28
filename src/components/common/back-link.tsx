import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex max-w-full items-center gap-1 rounded-sm text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeftIcon className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  )
}
