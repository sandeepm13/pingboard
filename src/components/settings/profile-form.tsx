"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { BadgeCheckIcon } from "lucide-react"
import { useForm, type Path } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { profileSchema, type ProfileInput } from "@shared/schemas/account"
import { currentZoneName } from "@shared/time"
import { updateProfileAction } from "@/actions/account"
import { FormAlert } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
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
import { Label } from "@/components/ui/label"

import { TimeZoneSelect } from "./time-zone-select"

export function ProfileForm({
  name,
  email,
  emailVerified,
  timezone,
  timeZones,
}: {
  name: string
  email: string
  emailVerified: boolean
  timezone: string
  /** IANA zones from the server (so SSR and hydration render the same list). */
  timeZones: string[]
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const form = useForm<ProfileInput, unknown, z.output<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, timezone },
  })

  function onSubmit() {
    setError(null)
    startTransition(async () => {
      const values = form.getValues()
      const result = await updateProfileAction(values)
      if ("error" in result) {
        setError(result.error)
        for (const [path, message] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          form.setError(path as Path<ProfileInput>, { message })
        }
        return
      }
      form.reset(values)
      toast.success("Profile saved")
    })
  }

  function applyBrowserZone() {
    const zone = currentZoneName(
      Intl.DateTimeFormat().resolvedOptions().timeZone
    )
    form.setValue("timezone", zone, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5"
      >
        <FormAlert notice={error ? { type: "error", message: error } : null} />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" className="sm:max-w-sm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-2">
          <Label htmlFor="account-email">Email</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="account-email"
              value={email}
              readOnly
              aria-describedby="account-email-help"
              className="font-mono text-sm sm:max-w-sm"
            />
            {emailVerified && (
              <span className="inline-flex items-center gap-1 text-xs text-up">
                <BadgeCheckIcon aria-hidden="true" className="size-3.5" />
                Verified
              </span>
            )}
          </div>
          <p id="account-email-help" className="text-sm text-muted-foreground">
            Your login and default alert address. It can&apos;t be changed yet.
          </p>
        </div>
        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time zone</FormLabel>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <FormControl>
                  <TimeZoneSelect
                    zones={timeZones}
                    className="sm:max-w-sm"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyBrowserZone}
                  className="self-start sm:self-auto"
                >
                  Use this device&apos;s zone
                </Button>
              </div>
              <FormDescription>
                Dashboard times, hourly uptime bars and alert messages use this
                zone.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <LoadingButton
            type="submit"
            loading={pending}
            disabled={!form.formState.isDirty}
          >
            Save profile
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
