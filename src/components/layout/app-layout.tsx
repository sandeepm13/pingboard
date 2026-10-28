import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { Button } from "@/components/ui/button"

import { AppMobileNav } from "./app-mobile-nav"
import { SidebarNav } from "./sidebar-nav"
import { SkipLink } from "./skip-link"
export function AppLayout({
  children,
  userMenu,
}: {
  children: React.ReactNode
  /** Session-dependent, so the route passes it in behind a Suspense boundary. */
  userMenu: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh">
      <SkipLink />
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center px-4">
          <Link
            href="/app"
            aria-label="PingBoard dashboard"
            className="rounded-md"
          >
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-6">
          <AppMobileNav />
          <Link
            href="/app"
            aria-label="PingBoard dashboard"
            className="rounded-md md:hidden"
          >
            <Logo />
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button asChild>
              <Link href="/app/monitors/new">
                <PlusIcon aria-hidden="true" />
                <span className="sr-only sm:not-sr-only">New monitor</span>
              </Link>
            </Button>
            <ThemeToggle />
            {userMenu}
          </div>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
