"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { onboardingSchema } from "@shared/schemas/auth"
import {
  saveFirstMonitorAction,
  skipOnboardingAction,
} from "@/actions/onboarding"
import { FormAlert } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
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

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "UTC"
  }
}

export function OnboardingForm() {
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [skipping, startSkip] = useTransition()

  const form = useForm<
    z.input<typeof onboardingSchema>,
    unknown,
    z.output<typeof onboardingSchema>
  >({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { url: "", name: "" },
  })

  function onSubmit(values: z.output<typeof onboardingSchema>) {
    setActionError(null)
    startTransition(async () => {
      const result = await saveFirstMonitorAction({
        ...values,
        timezone: browserTimeZone(),
      })
      if (result && "error" in result) setActionError(result.error)
    })
  }

  const busy = pending || skipping

  return (
    <Form {...form}>
      <form
        method="post"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="grid gap-4"
      >
        <FormAlert
          notice={actionError ? { type: "error", message: actionError } : null}
        />
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL to monitor</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="url"
                  placeholder="https://example.com"
                  className="font-mono"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your website, API health check, or any public URL.
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
              <FormLabel>
                Name{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FormLabel>
              <FormControl>
                <Input placeholder="Marketing site" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          size="lg"
          className="w-full"
          loading={pending}
          disabled={busy}
        >
          Save and continue
        </LoadingButton>
        <LoadingButton
          type="button"
          variant="ghost"
          className="w-full"
          loading={skipping}
          disabled={busy}
          onClick={() =>
            startSkip(() => skipOnboardingAction(browserTimeZone()))
          }
        >
          Skip for now
        </LoadingButton>
      </form>
    </Form>
  )
}
