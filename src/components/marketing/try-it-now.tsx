"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRightIcon, GlobeIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { tryCheckSchema } from "@shared/schemas/monitor"
import type { TestCheckResult } from "@/actions/monitors"
import { tryCheckAction } from "@/actions/public"
import { LoadingButton } from "@/components/common/loading-button"
import { ResponseTimeText } from "@/components/status/response-time-text"
import { StatusBadge } from "@/components/status/status-badge"
import { StatusCodeText } from "@/components/status/status-code-text"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

type Values = z.input<typeof tryCheckSchema>

/** One anonymous check of any public URL, from our server. Nothing is saved. */
export function TryItNow() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<
    { url: string; check: TestCheckResult } | { error: string } | null
  >(null)
  const form = useForm<Values, unknown, z.output<typeof tryCheckSchema>>({
    resolver: zodResolver(tryCheckSchema),
    defaultValues: { url: "" },
  })

  function onSubmit(values: z.output<typeof tryCheckSchema>) {
    startTransition(async () => {
      // Raw input: the server runs the same schema (and the DNS-level guard).
      const response = await tryCheckAction(form.getValues())
      if ("error" in response) {
        if (response.fieldErrors?.url) {
          form.setError("url", { message: response.fieldErrors.url })
          setResult(null)
        } else {
          setResult({ error: response.error })
        }
        return
      }
      setResult({ url: values.url, check: response.result })
    })
  }

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <Form {...form}>
        <form
          method="post"
          noValidate
          // An invalid URL clears the previous result, so it can't look like this one's.
          onSubmit={form.handleSubmit(onSubmit, () => setResult(null))}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">URL to check</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="https://your-site.com"
                    className="h-10 font-mono text-sm"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <LoadingButton
            type="submit"
            size="lg"
            loading={pending}
            className="h-10 sm:w-36"
          >
            {!pending && <GlobeIcon aria-hidden="true" />}
            {pending ? "Checking…" : "Check it"}
          </LoadingButton>
        </form>
      </Form>
      <div aria-live="polite">{result && <TryResult result={result} />}</div>
      <p className="mt-3 text-xs text-muted-foreground">
        One GET request from our server, nothing saved. Private and internal
        addresses are refused.
      </p>
    </div>
  )
}

function TryResult({
  result,
}: {
  result: { url: string; check: TestCheckResult } | { error: string }
}) {
  if ("error" in result) {
    return (
      <p className="mt-4 rounded-lg border border-degraded/30 bg-degraded/10 px-3 py-2 text-sm">
        {result.error}
      </p>
    )
  }
  const { check, url } = result
  return (
    <div className="mt-4 space-y-3 rounded-lg border bg-background/50 p-3 sm:p-4">
      <p className="truncate font-mono text-xs text-muted-foreground">{url}</p>
      <dl className="grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <StatusBadge status={check.status} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Status code</dt>
          <dd className="mt-1 text-lg">
            <StatusCodeText code={check.statusCode} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Response time</dt>
          <dd className="mt-1 text-lg">
            <ResponseTimeText ms={check.responseTimeMs} />
          </dd>
        </div>
      </dl>
      {check.errorMessage && (
        <p className="text-sm text-down">{check.errorMessage}</p>
      )}
      <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {check.isUp
            ? "Up right now. Want to know the minute that changes?"
            : "Down right now. PingBoard would have told you already."}
        </p>
        <Button asChild size="sm">
          <Link href="/signup">
            Monitor it free
            <ArrowRightIcon aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
