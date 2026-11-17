"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { CHECK_INTERVALS_MINUTES, HTTP_METHODS } from "@shared/constants"
import { checkIntervalSchema, httpMethodSchema } from "@shared/schemas/common"
import { Button } from "@/components/ui/button"
import {
  Form,
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

// Demo-only schema built from shared pieces; the real monitor schema lands in Stage 3.
const demoSchema = z.object({
  name: z.string().trim().min(1, "Give the monitor a name").max(80),
  url: z.url({ protocol: /^https?$/, error: "Enter an http(s) URL" }),
  method: httpMethodSchema,
  interval: z
    .string()
    .refine((v) => checkIntervalSchema.safeParse(Number(v)).success, {
      error: "Pick an interval",
    }),
  alerts: z.boolean(),
})

type DemoValues = z.infer<typeof demoSchema>

export function FormDemo() {
  const form = useForm<DemoValues>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      name: "",
      url: "",
      method: "GET",
      interval: "5",
      alerts: true,
    },
  })

  function onSubmit(values: DemoValues) {
    toast.success("Monitor looks valid", {
      description: `${values.method} ${values.url} every ${values.interval} min`,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="grid gap-5 rounded-xl border bg-card p-5 sm:grid-cols-2"
      >
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
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  className="font-mono"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Method</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem
                      key={method}
                      value={method}
                      className="font-mono"
                    >
                      {method}
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
          name="interval"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Check every</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CHECK_INTERVALS_MINUTES.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes} {minutes === 1 ? "minute" : "minutes"}
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
          name="alerts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3 sm:col-span-2">
              <div className="space-y-1">
                <FormLabel>Send alerts</FormLabel>
                <FormDescription>
                  Email me when this goes down or recovers.
                </FormDescription>
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
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">Validate</Button>
          <Button type="button" variant="ghost" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>
      </form>
    </Form>
  )
}
