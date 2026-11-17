"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Path } from "react-hook-form"
import type { z } from "zod"

import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@shared/schemas/account"
import { changePasswordAction } from "@/actions/account"
import { FormAlert, type FormNotice } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
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

const EMPTY: ChangePasswordInput = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
}

/** Change the password, or set one on an account that only uses Google/GitHub. */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [pending, startTransition] = useTransition()
  const form = useForm<
    ChangePasswordInput,
    unknown,
    z.output<typeof changePasswordSchema>
  >({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  })

  function onSubmit() {
    setNotice(null)
    startTransition(async () => {
      const result = await changePasswordAction(form.getValues())
      if ("error" in result) {
        setNotice({ type: "error", message: result.error })
        for (const [path, message] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          form.setError(path as Path<ChangePasswordInput>, { message })
        }
        return
      }
      form.reset(EMPTY)
      setNotice({ type: "success", message: result.message ?? "Saved." })
    })
  }

  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-5 sm:max-w-sm"
      >
        <FormAlert notice={notice} />
        {hasPassword && (
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>At least 8 characters.</FormDescription>
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
        <div>
          <LoadingButton type="submit" loading={pending}>
            {hasPassword ? "Change password" : "Set password"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
