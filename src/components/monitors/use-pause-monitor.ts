"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { setMonitorPausedAction } from "@/actions/monitors"

/** Pause/resume with a toast. The action revalidates the list and edit page. */
export function usePauseMonitor(id: string, name: string) {
  const [pending, startTransition] = useTransition()

  function setPaused(paused: boolean) {
    startTransition(async () => {
      const result = await setMonitorPausedAction(id, paused)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(paused ? `Paused ${name}` : `Resumed ${name}`, {
        description: paused
          ? "No checks or alerts until you resume it."
          : "It will be checked on its next interval.",
      })
    })
  }

  return { setPaused, pending }
}
