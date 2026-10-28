"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { resetPasswordSchema } from "@shared/schemas/auth"
import { resetPasswordAction } from "@/actions/auth"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

import { FormAlert } from "./form-alert"
import { PasswordInput } from "./password-input"

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? ""
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<
    z.input<typeof resetPasswordSchema>,
    unknown,
    z.output<typeof resetPasswordSchema>
  >({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  })

  if (!token) {
    return (
      <div className="grid gap-4">
        <FormAlert
          notice={{
            type: "error",
            message: "This reset link is missing its token. Request a new one.",
          }}
        />
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  function onSubmit(values: z.output<typeof resetPasswordSchema>) {
    setActionError(null)
    startTransition(async () => {
      const result = await resetPasswordAction(values)
      if ("error" in result) setActionError(result.error)
    })
  }

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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
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
        >
          Update password
        </LoadingButton>
      </form>
    </Form>
  )
}
