"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PauseIcon, PlayIcon, Trash2Icon } from "lucide-react"

import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"

import { DeleteMonitorDialog } from "./delete-monitor-dialog"
import { usePauseMonitor } from "./use-pause-monitor"

export function MonitorEditActions({
  id,
  name,
  paused,
}: {
  id: string
  name: string
  paused: boolean
}) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { setPaused, pending } = usePauseMonitor(id, name)

  return (
    <>
      <LoadingButton
        variant="outline"
        loading={pending}
        onClick={() => setPaused(!paused)}
      >
        {!pending &&
          (paused ? (
            <PlayIcon aria-hidden="true" />
          ) : (
            <PauseIcon aria-hidden="true" />
          ))}
        {paused ? "Resume" : "Pause"}
      </LoadingButton>
      <Button variant="outline" onClick={() => setDeleteOpen(true)}>
        <Trash2Icon aria-hidden="true" className="text-destructive" />
        Delete
      </Button>
      <DeleteMonitorDialog
        id={id}
        name={name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/app")}
      />
    </>
  )
}
