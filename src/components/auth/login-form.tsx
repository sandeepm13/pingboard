"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { loginSchema } from "@shared/schemas/auth"
import { loginAction } from "@/actions/auth"
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
import { PasswordInput } from "./password-input"

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Incorrect email or password.",
  EmailNotVerified:
    "That account's email isn't verified with the provider. Verify it there, or sign up with email and password.",
  OAuthAccountNotLinked:
    "This email is already used with a different sign-in method.",
  AccessDenied: "Sign-in was cancelled or not allowed.",
  Configuration: "Sign-in isn't configured correctly. Please try again later.",
}

/** Messages carried in the URL by redirects (OAuth errors, password reset, expired session). */
function noticeFromUrl(params: URLSearchParams): FormNotice | null {
  const error = params.get("error")
  if (error) {
    return {
      type: "error",
      message:
        ERROR_MESSAGES[error] ?? "Couldn't sign you in. Please try again.",
    }
  }
  if (params.get("reset") === "1") {
    return {
      type: "success",
      message: "Password updated. Log in with your new password.",
    }
  }
  if (params.get("reason") === "session") {
    return {
      type: "info",
      message: "Your session has ended. Please log in again.",
    }
  }
  return null
}

type LoginValues = z.input<typeof loginSchema>

export function LoginForm() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? undefined
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const form = useForm<LoginValues, unknown, z.output<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  function onSubmit(values: z.output<typeof loginSchema>) {
    setActionError(null)
    startTransition(async () => {
      const result = await loginAction(values, callbackUrl)
      if ("error" in result) setActionError(result.error)
    })
  }

  const notice: FormNotice | null = actionError
    ? { type: "error", message: actionError }
    : noticeFromUrl(searchParams)

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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
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
          Log in
        </LoadingButton>
      </form>
    </Form>
  )
}
