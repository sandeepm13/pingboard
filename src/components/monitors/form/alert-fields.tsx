"use client"

import Link from "next/link"
import { useFormContext, useWatch } from "react-hook-form"

import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { DEGRADED_ALERT_STREAK } from "@shared/constants"
import type { MonitorFormValues } from "@shared/schemas/monitor"
import type { AlertChannelType } from "@shared/types"
import { ChannelIcon } from "@/components/alerts/channel-icon"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"

export type AlertChannelOption = {
  id: string
  name: string
  type: AlertChannelType
  enabled: boolean
}

/** Which channels alert for this monitor, and the opt-in "slow" alert. */
export function AlertFields({ channels }: { channels: AlertChannelOption[] }) {
  const form = useFormContext<MonitorFormValues>()
  const all = useWatch({ control: form.control, name: "alertAllChannels" })
  const selected = useWatch({ control: form.control, name: "alertChannelIds" })

  function toggle(id: string, on: boolean) {
    const next = on ? [...selected, id] : selected.filter((v) => v !== id)
    form.setValue("alertChannelIds", next, { shouldDirty: true })
  }

  return (
    <div className="space-y-4">
      {channels.length === 0 && (
        <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
          You have no alert channels yet.{" "}
          <Link
            href="/app/alerts"
            className="font-medium text-foreground underline underline-offset-4"
          >
            Add email, Discord, Slack or Telegram
          </Link>{" "}
          to get notified.
        </p>
      )}
      <FormField
        control={form.control}
        name="alertAllChannels"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <FormLabel>Alert all channels</FormLabel>
              <FormDescription>
                Every channel under Alerts, including ones you add later.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      {!all && channels.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Send alerts to</legend>
          {channels.map((channel) => {
            const id = `alert-channel-${channel.id}`
            return (
              <div
                key={channel.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <label
                  htmlFor={id}
                  className="flex min-w-0 items-center gap-2.5 text-sm"
                >
                  <ChannelIcon type={channel.type} />
                  <span className="truncate font-medium">{channel.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {CHANNEL_TYPE_LABELS[channel.type]}
                    {!channel.enabled && " · off"}
                  </span>
                </label>
                <Switch
                  id={id}
                  checked={selected.includes(channel.id)}
                  onCheckedChange={(on) => toggle(channel.id, on)}
                />
              </div>
            )
          })}
          {selected.length === 0 && (
            <p className="text-sm text-degraded">
              No channel selected: this monitor won&apos;t send alerts.
            </p>
          )}
        </fieldset>
      )}
      <FormField
        control={form.control}
        name="alertOnDegraded"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-3">
            <div className="space-y-1">
              <FormLabel>Alert when slow</FormLabel>
              <FormDescription>
                After {DEGRADED_ALERT_STREAK} slow (degraded) checks in a row.
                Down and recovery alerts are always on.
              </FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  )
}
