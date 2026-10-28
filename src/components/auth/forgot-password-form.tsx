"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { forgotPasswordSchema } from "@shared/schemas/auth"
import { forgotPasswordAction } from "@/actions/auth"
import { LoadingButton } from "@/components/common/loading-button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { FormAlert, type FormNotice } from "./form-alert"

export function ForgotPasswordForm() {
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<
    z.input<typeof forgotPasswordSchema>,
    unknown,
    z.output<typeof forgotPasswordSchema>
  >({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: z.output<typeof forgotPasswordSchema>) {
    setNotice(null)
    startTransition(async () => {
      const result = await forgotPasswordAction(values)
      setNotice(
        "error" in result
          ? { type: "error", message: result.error }
          : { type: "success", message: result.message ?? "Check your inbox." }
      )
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
        <FormAlert notice={notice} />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  {...field}
                />
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
          Send reset link
        </LoadingButton>
      </form>
    </Form>
  )
}
