import type { MetadataRoute } from "next"

import { DOC_PAGES } from "@/lib/docs"
import { absoluteUrl } from "@/lib/site"

// Public marketing pages only. User status pages aren't listed: they're
// opt-in, and listing them would need a database read at build time.

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/pricing"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/demo"), changeFrequency: "monthly", priority: 0.6 },
    ...DOC_PAGES.map((page) => ({
      url: absoluteUrl(page.href),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: absoluteUrl("/signup"), changeFrequency: "yearly", priority: 0.5 },
    { url: absoluteUrl("/login"), changeFrequency: "yearly", priority: 0.3 },
  ]
}
