"use client"

import { useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  XIcon,
} from "lucide-react"
import { cn } from "cn"
import { useFormContext } from "react-hook-form"

import type { StatusPageFormValues } from "@shared/schemas/status-page"
import { StatusDot } from "@/components/status/status-dot"
import { STATUS_META } from "@/components/status/status-meta"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import type { MonitorOption } from "./monitor-picker"

export function MonitorPickerRow({
  index,
  count,
  monitor,
  dragging,
  onMove,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  index: number
  count: number
  /** undefined if the monitor was deleted meanwhile (saved without it). */
  monitor: MonitorOption | undefined
  dragging: boolean
  onMove: (to: number) => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnter: () => void
  onDragEnd: () => void
}) {
  const form = useFormContext<StatusPageFormValues>()
  // Only the handle starts a drag, so text in the input stays selectable.
  const [armed, setArmed] = useState(false)
  const realName = monitor?.name ?? "Deleted monitor"

  return (
    <li
      draggable={armed}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", String(index))
        onDragStart()
      }}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
      onDragEnd={() => {
        setArmed(false)
        onDragEnd()
      }}
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card p-2 sm:p-3",
        dragging && "border-dashed opacity-60"
      )}
    >
      <span
        aria-hidden="true"
        onPointerDown={() => setArmed(true)}
        onPointerUp={() => setArmed(false)}
        className="mt-2 hidden cursor-grab touch-none text-muted-foreground active:cursor-grabbing sm:block"
        title="Drag to reorder"
      >
        <GripVerticalIcon className="size-4" />
      </span>
      <span className="mt-2 w-5 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
        {index + 1}
      </span>
      <FormField
        control={form.control}
        name={`monitors.${index}.displayName`}
        render={({ field }) => (
          <FormItem className="min-w-0 flex-1 gap-1">
            <FormLabel className="sr-only">
              Public name for {realName}
            </FormLabel>
            <FormControl>
              <Input placeholder={realName} {...field} />
            </FormControl>
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {monitor && (
                <StatusDot
                  status={monitor.status}
                  size="sm"
                  label={STATUS_META[monitor.status].label}
                />
              )}
              <span className="truncate">Monitor: {realName}</span>
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
          aria-label={`Move ${realName} up`}
        >
          <ArrowUpIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
          aria-label={`Move ${realName} down`}
        >
          <ArrowDownIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove ${realName}`}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}
