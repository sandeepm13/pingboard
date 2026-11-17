"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { DASHBOARD_REFRESH_MS } from "@shared/constants"
import type { DashboardData } from "@/lib/dashboard"

/**
 * Starts from the server-rendered data and re-fetches /api/dashboard every
 * DASHBOARD_REFRESH_MS while the tab is visible. A failed fetch keeps the
 * last good data and sets `stale`; the next tick retries.
 */
export function useDashboardData(initial: DashboardData) {
  const router = useRouter()
  const [polled, setPolled] = useState<DashboardData | null>(null)
  const [stale, setStale] = useState(false)
  // Fresh server data (after an action revalidates /app) beats an older poll.
  // ISO timestamps compare correctly as strings.
  const data =
    polled && polled.generatedAt > initial.generatedAt ? polled : initial

  const lastUpdated = useRef(data.generatedAt)
  useEffect(() => {
    lastUpdated.current = data.generatedAt
  }, [data.generatedAt])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined

    function schedule(delay = DASHBOARD_REFRESH_MS) {
      clearTimeout(timer)
      if (!document.hidden) timer = setTimeout(refresh, delay)
    }

    async function refresh() {
      if (document.hidden) return
      controller?.abort()
      controller = new AbortController()
      const { signal } = controller
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
          signal,
        })
        if (response.status === 401) {
          router.replace("/login?reason=session")
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        setPolled((await response.json()) as DashboardData)
        setStale(false)
      } catch {
        if (signal.aborted) return
        setStale(true)
      }
      schedule()
    }

    // Hidden tabs don't poll; coming back refreshes at once if the data is old.
    function onVisibilityChange() {
      if (document.hidden) {
        clearTimeout(timer)
        return
      }
      const age = Date.now() - Date.parse(lastUpdated.current)
      if (age >= DASHBOARD_REFRESH_MS) void refresh()
      else schedule(DASHBOARD_REFRESH_MS - age)
    }

    schedule()
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      clearTimeout(timer)
      controller?.abort()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router])

  return { data, stale }
}
