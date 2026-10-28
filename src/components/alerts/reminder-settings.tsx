"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"

import { ALERT_REMINDER_MINUTES } from "@shared/constants"
import type { AlertReminderMinutes } from "@shared/types"
import { updateAlertSettingsAction } from "@/actions/alert-channels"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LABELS: Record<AlertReminderMinutes, string> = {
  0: "Off",
  30: "Every 30 minutes",
  60: "Every 60 minutes",
}

export function ReminderSettings({ value }: { value: AlertReminderMinutes }) {
  const [pending, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(value)

  function change(raw: string) {
    const minutes = Number(raw) as AlertReminderMinutes
    startTransition(async () => {
      setShown(minutes)
      const result = await updateAlertSettingsAction({
        reminderMinutes: minutes,
      })
      if ("error" in result) toast.error(result.error)
      else
        toast.success(
          minutes
            ? `Reminders: ${LABELS[minutes].toLowerCase()}`
            : "Reminders off"
        )
    })
  }

  return (
    <section
      aria-labelledby="reminders-heading"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="space-y-1">
        <h2 id="reminders-heading" className="text-lg font-semibold">
          “Still down” reminders
        </h2>
        <p id="reminders-help" className="text-sm text-muted-foreground">
          One down alert per outage. Optionally repeat it while a monitor stays
          down, until someone acknowledges the incident.
        </p>
      </div>
      <Select value={String(shown)} onValueChange={change} disabled={pending}>
        <SelectTrigger
          className="w-full sm:w-48"
          aria-labelledby="reminders-heading"
          aria-describedby="reminders-help"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALERT_REMINDER_MINUTES.map((minutes) => (
            <SelectItem key={minutes} value={String(minutes)}>
              {LABELS[minutes]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  )
}
