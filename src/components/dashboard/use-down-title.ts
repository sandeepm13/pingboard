"use client"

import { useEffect } from "react"

const PREFIX = /^\(\d+ down\) /

/**
 * "(2 down) Dashboard · PingBoard" while monitors are down, so a background
 * tab shows trouble. Re-applied on every refresh (`version`) in case the
 * metadata <title> was re-rendered, and removed when the page goes away.
 */
export function useDownTitle(down: number, version: string) {
  useEffect(() => {
    const base = document.title.replace(PREFIX, "")
    document.title = down > 0 ? `(${down} down) ${base}` : base
  }, [down, version])

  useEffect(
    () => () => {
      document.title = document.title.replace(PREFIX, "")
    },
    []
  )
}
