"use client"

import { useFormContext } from "react-hook-form"

import { withDefaultScheme } from "@shared/security/url-policy"
import type { MonitorFormValues } from "@shared/schemas/monitor"
import type { Plan } from "@shared/types"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { IntervalField } from "./interval-field"

/** "api.example.com" from a typed URL, used as a default name. */
function hostnameOf(value: string): string | null {
  try {
    return new URL(withDefaultScheme(value)).hostname || null
  } catch {
    return null
  }
}

export function BasicFields({ plan }: { plan: Plan }) {
  const form = useFormContext<MonitorFormValues>()

  return (
    <div className="grid items-start gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="url"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>URL</FormLabel>
            <FormControl>
              <Input
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://example.com/health"
                className="font-mono"
                {...field}
                onBlur={() => {
                  field.onBlur()
                  const host = hostnameOf(field.value)
                  if (host && !form.getValues("name")) {
                    form.setValue("name", host, { shouldDirty: true })
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              A public http:// or https:// address. Private and internal
              addresses are blocked.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Marketing site" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <IntervalField plan={plan} />
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>
              Tags{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Input placeholder="production, api" {...field} />
            </FormControl>
            <FormDescription>Separate tags with commas.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
