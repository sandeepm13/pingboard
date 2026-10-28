"use client"

import { createContext, useContext, useSyncExternalStore } from "react"

// The signed-in user's IANA time zone (User.timezone), so every timestamp is
// shown in the zone the server bucketed the data in. Without a provider
// (e.g. /styleguide) formatting falls back to the browser's zone.

const TimeZoneContext = createContext<string | undefined>(undefined)

export function TimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string
  children: React.ReactNode
}) {
  return <TimeZoneContext value={timeZone}>{children}</TimeZoneContext>
}

export function useTimeZone(): string | undefined {
  return useContext(TimeZoneContext)
}

const noopSubscribe = () => () => {}

/**
 * false during SSR and hydration, true afterwards. Locale-dependent text
 * (dates, numbers) renders only once this is true, so server and browser
 * can't disagree.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}
