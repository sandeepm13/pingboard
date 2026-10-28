import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { ThemeToggle } from "@/components/common/theme-toggle"
import { MotionProvider } from "@/components/marketing/motion"
import { Button } from "@/components/ui/button"

import { MarketingMobileNav } from "./marketing-mobile-nav"
import { MARKETING_NAV } from "./nav-config"
import { SkipLink } from "./skip-link"

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <noscript>
        {/* Without JavaScript, <Reveal> content must not stay invisible. */}
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <div className="flex min-h-svh flex-col">
        <SkipLink />
        <MarketingNavbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <MarketingFooter />
      </div>
    </MotionProvider>
  )
}

function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="PingBoard home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {MARKETING_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">Start monitoring free</Link>
          </Button>
          <MarketingMobileNav />
        </div>
      </div>
    </header>
  )
}

// Privacy/Terms links come back once those pages exist (see PROGRESS.md).
const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { title: "Features", href: "/#features" },
      { title: "Pricing", href: "/pricing" },
      { title: "Live demo", href: "/demo" },
    ],
  },
  {
    title: "Docs",
    links: [
      { title: "Getting started", href: "/docs" },
      { title: "Alert channels", href: "/docs/alerts" },
      { title: "Status pages", href: "/docs/status-pages" },
    ],
  },
  {
    title: "Account",
    links: [
      { title: "Log in", href: "/login" },
      { title: "Sign up free", href: "/signup" },
    ],
  },
] as const

function MarketingFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-4 py-12 sm:grid-cols-3 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="col-span-2 space-y-3 sm:col-span-3 md:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Uptime monitoring for websites and APIs. Know before your users do.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="mb-3 text-sm font-medium">{column.title}</h2>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          © PingBoard. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
