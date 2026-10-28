"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { Path, UseFormReturn } from "react-hook-form"
import { toast } from "sonner"

import type { MonitorFormValues, MonitorInput } from "@shared/schemas/monitor"
import {
  createMonitorAction,
  testMonitorAction,
  updateMonitorAction,
} from "@/actions/monitors"

import { ADVANCED_FIELDS } from "./advanced-fields"
import type { TestState } from "./test-result"

const TEST_FIELDS = [
  "url",
  "method",
  "timeoutMs",
  "expectedStatusCodes",
  "headers",
  "body",
  "keyword",
  "followRedirects",
] as const

export type MonitorFormMode =
  { kind: "create"; fromDraft: boolean } | { kind: "edit"; monitorId: string }

function touchesAdvanced(paths: string[]) {
  return paths.some((path) =>
    ADVANCED_FIELDS.some(
      (field) => path === field || path.startsWith(`${field}.`)
    )
  )
}

export function useMonitorFormActions({
  form,
  mode,
  openAdvanced,
}: {
  form: UseFormReturn<MonitorFormValues, unknown, MonitorInput>
  mode: MonitorFormMode
  openAdvanced: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [test, setTest] = useState<TestState>({ kind: "idle" })
  const [saving, startSave] = useTransition()
  const [testing, startTest] = useTransition()

  function applyFieldErrors(fieldErrors: Record<string, string> = {}) {
    const paths = Object.keys(fieldErrors)
    for (const path of paths) {
      form.setError(path as Path<MonitorFormValues>, {
        message: fieldErrors[path],
      })
    }
    if (touchesAdvanced(paths)) openAdvanced()
  }

  function onInvalid(errors: Record<string, unknown>) {
    if (touchesAdvanced(Object.keys(errors))) openAdvanced()
  }

  function save() {
    setError(null)
    startSave(async () => {
      // Raw input: the server runs the same schema (with its transforms) again.
      const values = form.getValues()
      const result =
        mode.kind === "edit"
          ? await updateMonitorAction(mode.monitorId, values)
          : await createMonitorAction(values, { fromDraft: mode.fromDraft })
      if ("error" in result) {
        setError(result.error)
        applyFieldErrors(result.fieldErrors)
        return
      }
      toast.success(
        mode.kind === "edit" ? "Monitor saved" : "Monitor created",
        {
          description: values.name,
        }
      )
      router.push(`/app/monitors/${result.id}`)
    })
  }

  async function runTest() {
    if (!(await form.trigger(TEST_FIELDS))) {
      onInvalid(form.formState.errors)
      setTest({
        kind: "error",
        message: "Fix the highlighted fields to run a test.",
      })
      return
    }
    setTest({ kind: "running" })
    startTest(async () => {
      const values = form.getValues()
      const input = Object.fromEntries(
        TEST_FIELDS.map((key) => [key, values[key]])
      )
      const result = await testMonitorAction(
        input,
        mode.kind === "edit" ? mode.monitorId : undefined
      )
      if ("error" in result) {
        applyFieldErrors(result.fieldErrors)
        setTest({ kind: "error", message: result.error })
        return
      }
      setTest({ kind: "done", url: values.url, result: result.result })
    })
  }

  return { error, test, saving, testing, save, runTest, onInvalid }
}
