"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"

import type { StatusPageFormValues } from "@shared/schemas/status-page"
import type { MonitorStatus } from "@shared/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { MonitorPickerRow } from "./monitor-picker-row"

export type MonitorOption = { id: string; name: string; status: MonitorStatus }

/**
 * The page's services, in display order. Reorder by dragging the handle, or
 * with the arrow buttons (keyboard and touch). Each gets a public name.
 */
export function MonitorPicker({ monitors }: { monitors: MonitorOption[] }) {
  const form = useFormContext<StatusPageFormValues>()
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "monitors",
  })
  const rows = useWatch({ control: form.control, name: "monitors" })
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const byId = new Map(monitors.map((monitor) => [monitor.id, monitor]))
  const listed = new Set(rows.map((row) => row.monitorId))
  const available = monitors.filter((monitor) => !listed.has(monitor.id))
  const error = form.formState.errors.monitors

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= fields.length || from === to) return
    move(from, to)
    const name = rows[from]?.displayName || "Service"
    setAnnouncement(`${name} moved to position ${to + 1} of ${fields.length}`)
  }

  function add(id: string) {
    const monitor = byId.get(id)
    if (!monitor) return
    append({ monitorId: monitor.id, displayName: monitor.name })
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
          No services yet. Add the monitors visitors should see.
        </p>
      ) : (
        <ol className="space-y-2">
          {fields.map((field, index) => (
            <MonitorPickerRow
              key={field.id}
              index={index}
              count={fields.length}
              monitor={byId.get(field.monitorId)}
              dragging={dragFrom === index}
              onMove={(to) => moveTo(index, to)}
              onRemove={() => remove(index)}
              onDragStart={() => setDragFrom(index)}
              onDragEnter={() => {
                if (dragFrom === null || dragFrom === index) return
                move(dragFrom, index)
                setDragFrom(index)
              }}
              onDragEnd={() => setDragFrom(null)}
            />
          ))}
        </ol>
      )}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {error?.root?.message || error?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {error.root?.message ?? error.message}
        </p>
      ) : null}

      {available.length > 0 ? (
        // Remounted after each pick (key) so the trigger goes back to its placeholder.
        <Select key={fields.length} onValueChange={add}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Add a monitor">
            <PlusIcon aria-hidden="true" />
            <SelectValue placeholder="Add a monitor" />
          </SelectTrigger>
          <SelectContent>
            {available.map((monitor) => (
              <SelectItem key={monitor.id} value={monitor.id}>
                {monitor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        monitors.length > 0 && (
          <p className="text-sm text-muted-foreground">
            All your monitors are on this page.
          </p>
        )
      )}
    </div>
  )
}
