"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Path } from "react-hook-form"
import { toast } from "sonner"

import {
  statusPageInputSchema,
  type StatusPageFormValues,
  type StatusPageInput,
} from "@shared/schemas/status-page"
import {
  createStatusPageAction,
  updateStatusPageAction,
} from "@/actions/status-pages"
import { FormAlert } from "@/components/auth/form-alert"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"

import { MonitorPicker, type MonitorOption } from "./monitor-picker"
import { PageDetailsFields } from "./page-details-fields"
import { VisibilityFields } from "./visibility-fields"

export type StatusPageFormMode =
  { kind: "create" } | { kind: "edit"; id: string }

export function StatusPageForm({
  mode,
  defaultValues,
  monitors,
  host,
}: {
  mode: StatusPageFormMode
  defaultValues: StatusPageFormValues
  monitors: MonitorOption[]
  host: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()
  const form = useForm<StatusPageFormValues, unknown, StatusPageInput>({
    resolver: zodResolver(statusPageInputSchema),
    defaultValues,
  })

  function save() {
    setError(null)
    startSave(async () => {
      // Raw input: the server parses it with the same schema again.
      const values = form.getValues()
      const result =
        mode.kind === "edit"
          ? await updateStatusPageAction(mode.id, values)
          : await createStatusPageAction(values)
      if ("error" in result) {
        setError(result.error)
        for (const [path, message] of Object.entries(
          result.fieldErrors ?? {}
        )) {
          form.setError(path as Path<StatusPageFormValues>, { message })
        }
        return
      }
      if (mode.kind === "edit") {
        toast.success("Status page saved")
        form.reset(values)
      } else {
        toast.success("Status page created", { description: values.title })
        router.push(`/app/status-pages/${result.id}`)
      }
    })
  }

  return (
    <Form {...form}>
      <form
        // POST if submitted before hydration, so values never land in the URL.
        method="post"
        noValidate
        onSubmit={form.handleSubmit(save)}
        className="space-y-6"
      >
        <FormAlert notice={error ? { type: "error", message: error } : null} />
        <Section title="Page">
          <PageDetailsFields host={host} autoSlug={mode.kind === "create"} />
        </Section>
        <Section
          title="Services"
          description="The monitors shown on the page, in this order. Visitors only see the public name, never the URL (unless you allow it below)."
        >
          <MonitorPicker monitors={monitors} />
        </Section>
        <Section title="Visibility">
          <VisibilityFields />
        </Section>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button asChild variant="ghost" className="sm:mr-auto">
            <Link href="/app/status-pages">Cancel</Link>
          </Button>
          <LoadingButton type="submit" loading={saving}>
            {mode.kind === "edit" ? "Save changes" : "Create status page"}
          </LoadingButton>
        </div>
      </form>
    </Form>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-4 sm:p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  )
}
