"use client"

import { Suspense } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "cn"

import { APP_NAV } from "./nav-config"

type SidebarNavProps = { onNavigate?: () => void }

/**
 * The pathname isn't known while prerendering dynamic routes
 * (/app/monitors/[id]/…), so the prerendered shell shows the nav without an
 * active item and the highlight streams in.
 */
export function SidebarNav(props: SidebarNavProps) {
  return (
    <Suspense fallback={<NavList {...props} pathname={null} />}>
      <ActiveNavList {...props} />
    </Suspense>
  )
}

function ActiveNavList(props: SidebarNavProps) {
  return <NavList {...props} pathname={usePathname()} />
}

function NavList({
  onNavigate,
  pathname,
}: SidebarNavProps & { pathname: string | null }) {
  return (
    <nav aria-label="App">
      <ul className="flex flex-col gap-0.5">
        {APP_NAV.map((item) => {
          const active =
            pathname !== null &&
            (pathname === item.href ||
              (!item.exact && pathname.startsWith(`${item.href}/`)) ||
              (item.alsoActiveFor ?? []).some(
                (path) => pathname === path || pathname.startsWith(`${path}/`)
              ))
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onNavigate={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
