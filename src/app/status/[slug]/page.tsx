import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import { OVERALL_STATUS_LABELS } from "@shared/status-page"
import { AutoRefresh } from "@/components/status-page/auto-refresh"
import { PublicStatusView } from "@/components/status-page/public-status-view"
import { getEnv } from "@/lib/env"
import {
  getPublicStatusPage,
  getPublicStatusSummary,
  parseSlug,
} from "@/lib/public-status"

// Public, no login. Rendered per request from cached data (≤ 60 s old, see
// lib/public-status.ts). The page awaits params and data without its own
// <Suspense> fallback (instant = false opts it out of static-shell
// validation), so the page's content and <head> arrive in one pass. An
// unknown slug is a "soft 404": the root shell has already streamed, so the
// status is 200 and Next adds <meta name="robots" content="noindex">.
// A hard 404 would need a slug check in the proxy, which is DB-free by design.
export const instant = false

export async function generateMetadata({
  params,
}: PageProps<"/status/[slug]">): Promise<Metadata> {
  const slug = parseSlug((await params).slug)
  const summary = slug ? await getPublicStatusSummary(slug) : null
  if (!slug || !summary) {
    return { title: "Status page not found", robots: { index: false } }
  }
  const label = OVERALL_STATUS_LABELS[summary.overall]
  const description =
    summary.description ||
    `Live status, uptime and incident history of ${summary.title}.`
  return {
    metadataBase: new URL(getEnv().APP_URL),
    title: { absolute: `${summary.title} status` },
    description,
    alternates: { canonical: `/status/${slug}` },
    openGraph: {
      type: "website",
      url: `/status/${slug}`,
      siteName: summary.title,
      title: `${summary.title} status: ${label}`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${summary.title} status: ${label}`,
      description,
    },
  }
}

export default async function Page({ params }: PageProps<"/status/[slug]">) {
  const slug = parseSlug((await params).slug)
  const view = slug ? await getPublicStatusPage(slug) : null
  if (!view) notFound()

  return (
    <>
      <PublicStatusView view={view} className="flex-1" />
      <AutoRefresh intervalMs={STATUS_PAGE_LIMITS.cacheMaxAgeSec * 1000} />
    </>
  )
}
