"use client"

import { useFormContext } from "react-hook-form"

import { CHECK_INTERVALS_MINUTES } from "@shared/constants"
import { isIntervalAllowed, planLimits } from "@shared/plans"
import type { MonitorFormValues } from "@shared/schemas/monitor"
import type { CheckIntervalMinutes, Plan } from "@shared/types"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { formatInterval } from "../format"

export function IntervalField({ plan }: { plan: Plan }) {
  const form = useFormContext<MonitorFormValues>()
  const limits = planLimits(plan)

  return (
    <FormField
      control={form.control}
      name="intervalMinutes"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Check every</FormLabel>
          <Select
            value={String(field.value)}
            onValueChange={(value) =>
              field.onChange(Number(value) as CheckIntervalMinutes)
            }
          >
            <FormControl>
              <SelectTrigger className="w-full" onBlur={field.onBlur}>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {CHECK_INTERVALS_MINUTES.map((minutes) => {
                const allowed = isIntervalAllowed(plan, minutes)
                return (
                  <SelectItem
                    key={minutes}
                    value={String(minutes)}
                    disabled={!allowed}
                  >
                    {formatInterval(minutes)}
                    {!allowed && (
                      <span className="text-muted-foreground"> · Pro</span>
                    )}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {limits.minIntervalMinutes > 1 && (
            <FormDescription>
              The {limits.label} plan checks every {limits.minIntervalMinutes}{" "}
              minutes at most.
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
