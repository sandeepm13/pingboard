import type { MetadataRoute } from "next"

import { absoluteUrl } from "@/lib/site"

// Status pages (/status/*) stay crawlable: their owners publish them on
// purpose. Unpublished ones answer with noindex.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app",
        "/api/",
        "/onboarding",
        "/reset-password",
        "/forgot-password",
        "/styleguide",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
