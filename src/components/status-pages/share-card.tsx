import Link from "next/link"
import { EyeIcon, ExternalLinkIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { CopyField } from "./copy-field"

/** Public link, README badge and preview for one page. */
export function ShareCard({
  id,
  slug,
  title,
  isPublic,
  appUrl,
}: {
  id: string
  slug: string
  title: string
  isPublic: boolean
  appUrl: string
}) {
  const pageUrl = `${appUrl}/status/${slug}`
  const badgeUrl = `${appUrl}/api/badge/${slug}.svg`
  const markdown = `[![${title.replace(/[[\]]/g, "")} status](${badgeUrl})](${pageUrl})`

  return (
    <section
      aria-labelledby="share-heading"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="share-heading" className="text-sm font-semibold">
          Share
        </h2>
        {isPublic ? (
          <Badge variant="outline" className="border-up/25 bg-up/10 text-up">
            Public
          </Badge>
        ) : (
          <Badge variant="outline">Not public</Badge>
        )}
      </div>
      {!isPublic && (
        <p className="text-sm text-muted-foreground">
          Turn on <span className="font-medium text-foreground">Public</span>{" "}
          and save to make the link and badge work for everyone.
        </p>
      )}
      <CopyField label="Link" value={pageUrl} />
      <CopyField label="Badge Markdown" value={markdown} />
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/app/status-pages/${id}/preview`}>
            <EyeIcon aria-hidden="true" />
            Preview
          </Link>
        </Button>
        {isPublic && (
          <Button asChild variant="outline" size="sm">
            <a href={pageUrl} target="_blank" rel="noopener">
              <ExternalLinkIcon aria-hidden="true" />
              Open page
            </a>
          </Button>
        )}
      </div>
    </section>
  )
}
