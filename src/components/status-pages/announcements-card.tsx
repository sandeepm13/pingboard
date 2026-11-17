"use client"

import { useId, useState, useTransition } from "react"
import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import { announcementInputSchema } from "@shared/schemas/status-page"
import {
  addAnnouncementAction,
  deleteAnnouncementAction,
} from "@/actions/status-pages"
import { LocalTime } from "@/components/common/local-time"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { AnnouncementItem } from "@/lib/status-pages"

const MAX = STATUS_PAGE_LIMITS.announcementsMax

/** Messages shown under the status banner, e.g. planned maintenance. */
export function AnnouncementsCard({
  id,
  announcements,
}: {
  id: string
  announcements: AnnouncementItem[]
}) {
  const fieldId = useId()
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [posting, startPost] = useTransition()
  const [deleting, startDelete] = useTransition()
  const full = announcements.length >= MAX

  function post(event: React.FormEvent) {
    event.preventDefault()
    const parsed = announcementInputSchema.safeParse({ message })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write a message")
      return
    }
    setError(null)
    startPost(async () => {
      const result = await addAnnouncementAction(id, { message })
      if ("error" in result) {
        setError(result.fieldErrors?.message ?? result.error)
        return
      }
      setMessage("")
      toast.success("Announcement posted")
    })
  }

  function remove(announcementId: string) {
    startDelete(async () => {
      const result = await deleteAnnouncementAction(id, announcementId)
      if ("error" in result) toast.error(result.error)
    })
  }

  return (
    <section
      aria-labelledby="announcements-heading"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div>
        <h2 id="announcements-heading" className="text-sm font-semibold">
          Announcements
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shown on the page right away, newest first.
        </p>
      </div>
      <form method="post" onSubmit={post} noValidate className="space-y-2">
        <label htmlFor={fieldId} className="sr-only">
          New announcement
        </label>
        <Textarea
          id={fieldId}
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={STATUS_PAGE_LIMITS.announcementMax}
          placeholder="Scheduled maintenance on Sunday, 02:00–03:00 UTC."
          aria-invalid={Boolean(error)}
          disabled={full}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {full
              ? `${MAX} / ${MAX}: delete one to post`
              : `${message.length} / ${STATUS_PAGE_LIMITS.announcementMax}`}
          </span>
          <LoadingButton
            type="submit"
            size="sm"
            loading={posting}
            disabled={full}
          >
            Post
          </LoadingButton>
        </div>
      </form>
      {announcements.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {announcements.map((announcement) => (
            <li key={announcement.id} className="flex gap-2 p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm break-words whitespace-pre-line">
                  {announcement.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  <LocalTime iso={announcement.createdAt} />
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={deleting}
                onClick={() => remove(announcement.id)}
                aria-label="Delete announcement"
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
