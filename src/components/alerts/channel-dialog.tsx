"use client"

import { useMemo, useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch, type Path } from "react-hook-form"
import { toast } from "sonner"

import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import {
  createAlertChannelSchema,
  type AlertChannelFormValues,
  type AlertChannelInput,
} from "@shared/schemas/alert-channel"
import type { AlertChannelType } from "@shared/types"
import {
  createAlertChannelAction,
  updateAlertChannelAction,
} from "@/actions/alert-channels"
import { FormAlert } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import type { AlertChannelItem } from "@/lib/alert-channels"

import { ChannelFields } from "./channel-fields"
import { ChannelTypePicker } from "./channel-type-picker"

function defaults(
  channel: AlertChannelItem | undefined,
  accountEmail: string
): AlertChannelFormValues {
  return {
    type: channel?.type ?? "email",
    name: channel?.name ?? "My email",
    email: channel?.email ?? (channel ? "" : accountEmail),
    // Secrets are never sent to the browser: blank = keep the stored one.
    webhookUrl: "",
    botToken: "",
    chatId: channel?.chatId ?? "",
  }
}

const DEFAULT_NAMES: Record<AlertChannelType, string> = {
  email: "My email",
  discord: "Discord alerts",
  slack: "Slack alerts",
  telegram: "Telegram alerts",
}

/** Add (no `channel`) or edit a channel. Mounted only while open. */
export function ChannelDialog({
  channel,
  accountEmail,
  allowedTypes = ["email"],
  open,
  onOpenChange,
}: {
  channel?: AlertChannelItem
  accountEmail: string
  /** Channel types the user's plan includes (only used when adding). */
  allowedTypes?: readonly AlertChannelType[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const editing = Boolean(channel)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const schema = useMemo(() => createAlertChannelSchema({ editing }), [editing])
  const form = useForm<AlertChannelFormValues, unknown, AlertChannelInput>({
    resolver: zodResolver(schema),
    defaultValues: defaults(channel, accountEmail),
  })
  const type = useWatch({ control: form.control, name: "type" })

  function changeType(next: AlertChannelType) {
    const name = form.getValues("name")
    // Follow the type with the suggested name until the user types their own.
    if (!name || Object.values(DEFAULT_NAMES).includes(name)) {
      form.setValue("name", DEFAULT_NAMES[next])
    }
    form.setValue("type", next)
    form.clearErrors()
  }

  function save() {
    setError(null)
    startTransition(async () => {
      // Raw input: the server runs the same schema again.
      const values = form.getValues()
      const result = channel
        ? await updateAlertChannelAction(channel.id, values)
        : await createAlertChannelAction(values)
      if ("error" in result) {
        setError(result.error)
        for (const [path, message] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          form.setError(path as Path<AlertChannelFormValues>, { message })
        }
        return
      }
      toast.success(editing ? "Channel saved" : "Channel added", {
        description: editing
          ? values.name
          : "Send a test alert to check it works.",
      })
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? `Edit ${CHANNEL_TYPE_LABELS[type]} channel`
              : "Add alert channel"}
          </DialogTitle>
          <DialogDescription>
            Down, recovery and SSL alerts are sent here. Choose per monitor
            which channels it uses.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            method="post"
            noValidate
            onSubmit={form.handleSubmit(save)}
            className="space-y-4"
          >
            <FormAlert
              notice={error ? { type: "error", message: error } : null}
            />
            {!editing && (
              <ChannelTypePicker
                value={type}
                onChange={changeType}
                allowedTypes={allowedTypes}
              />
            )}
            <ChannelFields editing={editing} />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton type="submit" loading={pending}>
                {editing ? "Save channel" : "Add channel"}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
