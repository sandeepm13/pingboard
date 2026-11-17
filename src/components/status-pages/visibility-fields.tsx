"use client"

import { useFormContext } from "react-hook-form"

import type { StatusPageFormValues } from "@shared/schemas/status-page"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"

const SWITCHES: {
  name: "isPublic" | "showResponseTimes" | "showUrls"
  label: string
  description: string
}[] = [
  {
    name: "isPublic",
    label: "Public",
    description:
      "Anyone with the link can see the page. Off: only you, in the preview.",
  },
  {
    name: "showResponseTimes",
    label: "Show response times",
    description: "A response-time chart for the last 24 hours per service.",
  },
  {
    name: "showUrls",
    label: "Show monitored URLs",
    description:
      "Off by default. Headers, request bodies and error details are never shown.",
  },
]

export function VisibilityFields() {
  const form = useFormContext<StatusPageFormValues>()
  return (
    <div className="space-y-3">
      {SWITCHES.map((item) => (
        <FormField
          key={item.name}
          control={form.control}
          name={item.name}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <FormLabel>{item.label}</FormLabel>
                <FormDescription>{item.description}</FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      ))}
    </div>
  )
}
