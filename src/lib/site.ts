import type { Metadata } from "next"

// Public-site constants and per-page SEO metadata. Reads only APP_URL (not the
// full server env), so metadata files, the sitemap and robots.txt build
// without runtime secrets.

export const SITE_NAME = "PingBoard"

export const SITE_DESCRIPTION =
  "Uptime monitoring for websites and APIs. PingBoard checks your URLs every few minutes and alerts you by email, Discord, Slack or Telegram the moment something breaks."

export function siteUrl(): URL {
  try {
    return new URL(process.env.APP_URL || "http://localhost:3000")
  } catch {
    return new URL("http://localhost:3000")
  }
}

/** Absolute URL for a site path, e.g. for the sitemap. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl()).toString()
}

/** The default share image (src/app/opengraph-image.tsx). */
export const SITE_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "PingBoard — Know your site is down before your users do.",
}

/**
 * Title, description, canonical, Open Graph and Twitter tags for one page.
 * Metadata merges shallowly, so a page's `openGraph` replaces the root's
 * file-based image: it's named here explicitly.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  /** null = the site's default title (home page). */
  title: string | null
  description: string
  path: string
}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : undefined
  return {
    ...(title !== null && { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      ...(fullTitle && { title: fullTitle }),
      description,
      images: [SITE_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      ...(fullTitle && { title: fullTitle }),
      description,
      images: [SITE_OG_IMAGE],
    },
  }
}
