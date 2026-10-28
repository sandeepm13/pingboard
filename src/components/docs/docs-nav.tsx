"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "cn"

import { DOC_PAGES } from "@/lib/docs"

/** Sidebar on desktop; a collapsible "Docs menu" on mobile. */
export function DocsNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const current = DOC_PAGES.find((page) => page.href === pathname)

  const links = (
    <ul className="space-y-0.5">
      {DOC_PAGES.map((page) => {
        const active = page.href === pathname
        return (
          <li key={page.href}>
            <Link
              href={page.href}
              aria-current={active ? "page" : undefined}
              onNavigate={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {page.title}
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <nav aria-label="Docs" className="hidden md:block">
        <p className="mb-2 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Guides
        </p>
        {links}
      </nav>
      <nav aria-label="Docs" className="rounded-lg border md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="docs-menu"
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
        >
          <span>
            <span className="text-muted-foreground">Docs · </span>
            {current?.title ?? "Guides"}
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn(
              "size-4 text-muted-foreground transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
        <div id="docs-menu" hidden={!open} className="border-t p-1">
          {links}
        </div>
      </nav>
    </>
  )
}
