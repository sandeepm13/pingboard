"use client"

import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { ALERT_LIMITS } from "@shared/constants"
import { saveIncidentNotesAction } from "@/actions/incidents"
import { LoadingButton } from "@/components/common/loading-button"
import { Textarea } from "@/components/ui/textarea"

/** Free-text notes (what happened, what fixed it). Private to the owner. */
export function IncidentNotes({
  id,
  initial,
}: {
  id: string
  initial: string
}) {
  const fieldId = useId()
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const max = ALERT_LIMITS.incidentNotesMax
  const dirty = value.trim() !== saved.trim()

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await saveIncidentNotesAction(id, value)
      if ("error" in result) {
        setError(result.error)
        return
      }
      setSaved(value)
      toast.success("Notes saved")
    })
  }

  return (
    <section
      aria-labelledby={`${fieldId}-heading`}
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <h2 id={`${fieldId}-heading`} className="mb-3 text-lg font-semibold">
        Notes
      </h2>
      <form
        method="post"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
        className="space-y-3"
      >
        <label htmlFor={fieldId} className="sr-only">
          Incident notes
        </label>
        <Textarea
          id={fieldId}
          rows={5}
          maxLength={max}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="What happened? What fixed it? Anything to follow up on?"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${fieldId}-count${error ? ` ${fieldId}-error` : ""}`}
        />
        <div className="flex items-center justify-between gap-3">
          <p
            id={`${fieldId}-count`}
            className="font-mono text-xs text-muted-foreground tabular-nums"
          >
            {value.length.toLocaleString("en-US")} /{" "}
            {max.toLocaleString("en-US")}
          </p>
          <LoadingButton
            type="submit"
            variant="outline"
            size="sm"
            loading={pending}
            disabled={!dirty}
          >
            Save notes
          </LoadingButton>
        </div>
        {error && (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </form>
    </section>
  )
}
