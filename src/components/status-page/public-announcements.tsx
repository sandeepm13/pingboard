import { MegaphoneIcon } from "lucide-react"

import type { PublicAnnouncement } from "@shared/status-page"
import { LocalTime } from "@/components/common/local-time"

/** The owner's messages, newest first. Plain text: React escapes it. */
export function PublicAnnouncements({
  announcements,
}: {
  announcements: PublicAnnouncement[]
}) {
  if (announcements.length === 0) return null
  return (
    <section aria-labelledby="announcements" className="space-y-3">
      <h2 id="announcements" className="sr-only">
        Announcements
      </h2>
      <ul className="space-y-3">
        {announcements.map((announcement) => (
          <li
            key={announcement.key}
            className="flex gap-3 rounded-xl border border-info/30 bg-info/10 p-4"
          >
            <MegaphoneIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-info"
            />
            <div className="min-w-0 space-y-1">
              <p className="text-sm break-words whitespace-pre-line">
                {announcement.message}
              </p>
              <p className="text-xs text-muted-foreground">
                Posted <LocalTime iso={announcement.createdAt} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
