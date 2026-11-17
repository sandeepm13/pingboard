import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { SkipLink } from "@/components/layout/skip-link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="PingBoard home" className="rounded-md">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <main
        id="main"
        className="flex flex-1 justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
