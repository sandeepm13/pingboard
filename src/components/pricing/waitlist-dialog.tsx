"use client"

import { useState, useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { waitlistSchema } from "@shared/schemas/account"
import { joinWaitlistAction } from "@/actions/public"
import { FormAlert, type FormNotice } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type Values = z.input<typeof waitlistSchema>

/** "Join waitlist" for Pro: email only, until billing exists. */
export function WaitlistDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState<FormNotice | null>(null)
  const [pending, startTransition] = useTransition()
  const form = useForm<Values, unknown, z.output<typeof waitlistSchema>>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "" },
  })
  const joined = notice?.type === "success"

  function onSubmit(values: z.output<typeof waitlistSchema>) {
    setNotice(null)
    startTransition(async () => {
      const result = await joinWaitlistAction(values)
      setNotice(
        "error" in result
          ? { type: "error", message: result.error }
          : { type: "success", message: result.message }
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className={className}>
          Join waitlist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the Pro waitlist</DialogTitle>
          <DialogDescription>
            Pro isn&apos;t on sale yet. Leave your email and we&apos;ll write
            once when it is. Until then, the Free plan has everything else.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            method="post"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
          >
            <FormAlert notice={notice} />
            {!joined && (
              <>
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
                <LoadingButton type="submit" loading={pending}>
                  Join waitlist
                </LoadingButton>
              </>
            )}
            {joined && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
