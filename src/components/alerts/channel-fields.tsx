"use client"

import { useFormContext, useWatch } from "react-hook-form"

import type { AlertChannelFormValues } from "@shared/schemas/alert-channel"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { ChannelSetupHelp } from "./channel-setup-help"

const KEEP_HINT = "Saved. Leave blank to keep it."

/** The type-specific inputs of the channel dialog. */
export function ChannelFields({ editing }: { editing: boolean }) {
  const form = useFormContext<AlertChannelFormValues>()
  const type = useWatch({ control: form.control, name: "type" })

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. #ops alerts"
                autoComplete="off"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {type === "email" && (
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {(type === "discord" || type === "slack") && (
        <FormField
          control={form.control}
          name="webhookUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                  placeholder={
                    editing
                      ? KEEP_HINT
                      : type === "discord"
                        ? "https://discord.com/api/webhooks/…"
                        : "https://hooks.slack.com/services/…"
                  }
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Stored encrypted and never shown again. Anyone with this URL can
                post to the channel.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {type === "telegram" && (
        <>
          <FormField
            control={form.control}
            name="botToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bot token</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                    placeholder={editing ? KEEP_HINT : "123456789:AA…"}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Stored encrypted and never shown again.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="chatId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chat id</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                    placeholder="123456789"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}

      <ChannelSetupHelp type={type} />
    </div>
  )
}
