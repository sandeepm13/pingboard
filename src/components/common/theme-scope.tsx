"use client"

import { createContext, useContext, useState } from "react"
import { cn } from "cn"

import type { StatusPageTheme } from "@shared/types"

// A subtree with its own colour scheme, whatever the app theme on <html> is
// (globals.css → [data-theme-scope]). Used by public status pages and their
// preview. Tooltips portal into the scope so they get its colours too.

const PortalContainerContext = createContext<HTMLElement | null>(null)

export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined
}

export function ThemeScope({
  theme,
  className,
  children,
}: {
  theme: StatusPageTheme
  className?: string
  children: React.ReactNode
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  return (
    <div
      ref={setNode}
      data-theme-scope={theme}
      className={cn("bg-background text-foreground", className)}
    >
      <PortalContainerContext value={node}>{children}</PortalContainerContext>
    </div>
  )
}
