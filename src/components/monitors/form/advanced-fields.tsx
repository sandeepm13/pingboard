"use client"

import { useFormContext, useWatch } from "react-hook-form"

import { HTTP_METHODS, TIMEOUT_OPTIONS_MS } from "@shared/constants"
import type { MonitorFormValues } from "@shared/schemas/monitor"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { formatTimeout } from "../format"
import { HeadersField } from "./headers-field"

/** Fields that live in the collapsible "Advanced" section. */
export const ADVANCED_FIELDS = [
  "method",
  "timeoutMs",
  "expectedStatusCodes",
  "keyword",
  "followRedirects",
  "body",
  "headers",
] as const

export function AdvancedFields() {
  const form = useFormContext<MonitorFormValues>()
  const method = useWatch({ control: form.control, name: "method" })

  return (
    <div className="grid items-start gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Method</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full font-mono">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {HTTP_METHODS.map((m) => (
                  <SelectItem key={m} value={m} className="font-mono">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="timeoutMs"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timeout</FormLabel>
            <Select
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIMEOUT_OPTIONS_MS.map((ms) => (
                  <SelectItem key={ms} value={String(ms)}>
                    {formatTimeout(ms)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="expectedStatusCodes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Expected status codes</FormLabel>
            <FormControl>
              <Input placeholder="200-299" className="font-mono" {...field} />
            </FormControl>
            <FormDescription>
              Codes or ranges, e.g.{" "}
              <code className="font-mono">200-299, 301</code> or{" "}
              <code className="font-mono">2xx</code>.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="keyword"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Keyword{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder='"status":"ok"'
                className="font-mono"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Must appear in the response (not case-sensitive).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="followRedirects"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
            <div className="space-y-1">
              <FormLabel>Follow redirects</FormLabel>
              <FormDescription>
                Up to 5 hops, each one checked against the private-address
                blocklist. Off: a 3xx response is judged as-is.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {method === "POST" && (
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>
                Request body{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  spellCheck={false}
                  placeholder='{"ping": true}'
                  className="font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Sent with POST. Set a Content-Type header if your API needs one.
                Stored encrypted.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <HeadersField />
    </div>
  )
}
