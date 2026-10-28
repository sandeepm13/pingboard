"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Re-renders the page from the server every `intervalMs` while the tab is
 * visible (and once on return), so an open status page follows outages
 * without a reload. The server side is cached, so this is cheap.
 */
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
      clearInterval(timer)
      timer = setInterval(() => router.refresh(), intervalMs)
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        router.refresh()
        start()
      } else {
        clearInterval(timer)
      }
    }
    if (document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [router, intervalMs])

  return null
}
