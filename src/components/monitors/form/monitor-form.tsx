"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { ChevronDownIcon, ZapIcon } from "lucide-react"
import { useForm } from "react-hook-form"
import { cn } from "cn"

import {
  createMonitorInputSchema,
  type MonitorFormValues,
  type MonitorInput,
} from "@shared/schemas/monitor"
import type { Plan } from "@shared/types"
import { FormAlert } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"

import { AdvancedFields } from "./advanced-fields"
import { AlertFields, type AlertChannelOption } from "./alert-fields"
import { BasicFields } from "./basic-fields"
import { TestResult } from "./test-result"
import {
  useMonitorFormActions,
  type MonitorFormMode,
} from "./use-monitor-form-actions"

export function MonitorForm({
  mode,
  defaultValues,
  plan,
  allowPrivate,
  channels,
  advancedOpenByDefault = false,
}: {
  mode: MonitorFormMode
  defaultValues: MonitorFormValues
  plan: Plan
  /** Dev-only SSRF_ALLOW_PRIVATE, so the client rules match the server's. */
  allowPrivate: boolean
  channels: AlertChannelOption[]
  advancedOpenByDefault?: boolean
}) {
  const advancedId = useId()
  const [advancedOpen, setAdvancedOpen] = useState(advancedOpenByDefault)
  const schema = useMemo(
    () => createMonitorInputSchema({ allowPrivate }),
    [allowPrivate]
  )
  const form = useForm<MonitorFormValues, unknown, MonitorInput>({
    resolver: zodResolver(schema),
    defaultValues,
  })
  const actions = useMonitorFormActions({
    form,
    mode,
    openAdvanced: () => setAdvancedOpen(true),
  })
  const busy = actions.saving || actions.testing

  return (
    <Form {...form}>
      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit(actions.save, actions.onInvalid)}
        className="space-y-6"
      >
        <FormAlert
          notice={
            actions.error ? { type: "error", message: actions.error } : null
          }
        />

        <section className="rounded-xl border bg-card p-4 sm:p-6">
          <BasicFields plan={plan} />
        </section>

        <section
          aria-labelledby={`${advancedId}-alerts`}
          className="rounded-xl border bg-card p-4 sm:p-6"
        >
          <h2
            id={`${advancedId}-alerts`}
            className="mb-4 text-sm font-semibold"
          >
            Alerts
          </h2>
          <AlertFields channels={channels} />
        </section>

        <section className="rounded-xl border bg-card">
          <h2>
            <button
              type="button"
              aria-expanded={advancedOpen}
              aria-controls={advancedId}
              onClick={() => setAdvancedOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-4 rounded-xl p-4 text-left sm:px-6"
            >
              <span>
                <span className="block text-sm font-semibold">Advanced</span>
                <span className="block text-sm text-muted-foreground">
                  Method, headers, body, expected codes, keyword, timeout
                </span>
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                  advancedOpen && "rotate-180"
                )}
              />
            </button>
          </h2>
          {/* Kept mounted so field registration and errors survive collapsing. */}
          <div
            id={advancedId}
            hidden={!advancedOpen}
            className="border-t p-4 sm:p-6"
          >
            <AdvancedFields />
          </div>
        </section>

        <TestResult state={actions.test} />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="ghost" className="sm:mr-auto">
            <Link
              href={
                mode.kind === "edit"
                  ? `/app/monitors/${mode.monitorId}`
                  : "/app"
              }
            >
              Cancel
            </Link>
          </Button>
          <LoadingButton
            type="button"
            variant="outline"
            loading={actions.testing}
            disabled={busy}
            onClick={actions.runTest}
          >
            {!actions.testing && <ZapIcon aria-hidden="true" />}
            Test now
          </LoadingButton>
          <LoadingButton type="submit" loading={actions.saving} disabled={busy}>
            {mode.kind === "edit" ? "Save changes" : "Create monitor"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}
