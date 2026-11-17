"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Path } from "react-hook-form"
import type { z } from "zod"

import {
  deleteAccountSchema,
  type DeleteAccountInput,
} from "@shared/schemas/account"
import { deleteAccountAction } from "@/actions/account"
import { FormAlert } from "@/components/auth/form-alert"
import { PasswordInput } from "@/components/auth/password-input"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

/** Typing the email (and the password, if the account has one) confirms. */
export function DeleteAccountDialog({
  email,
  hasPassword,
}: {
  email: string
  hasPassword: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const form = useForm<
    DeleteAccountInput,
    unknown,
    z.output<typeof deleteAccountSchema>
  >({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { confirmEmail: "", password: "" },
  })

  function onSubmit() {
    setError(null)
    startTransition(async () => {
      // On success the action signs out and redirects to "/".
      const result = await deleteAccountAction(form.getValues())
      if ("error" in result) {
        setError(result.error)
        for (const [path, message] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          form.setError(path as Path<DeleteAccountInput>, { message })
        }
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        setOpen(next)
        if (!next) {
          form.reset()
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This can&apos;t be undone. Checks stop at once, and your status
            pages and badges stop working.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            method="post"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormAlert
              notice={error ? { type: "error", message: error } : null}
            />
            <FormField
              control={form.control}
              name="confirmEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="block leading-relaxed">
                    Type <span className="font-mono break-all">{email}</span> to
                    confirm
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {hasPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <LoadingButton
                type="submit"
                variant="destructive"
                loading={pending}
              >
                Delete everything
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
