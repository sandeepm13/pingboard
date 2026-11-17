// The /docs guides, in reading order. Used by the docs sidebar, the
// previous/next links and the sitemap.

export type DocPage = {
  href: string
  title: string
  description: string
}

export const DOC_PAGES: DocPage[] = [
  {
    href: "/docs",
    title: "Getting started",
    description:
      "Sign up, add your first URL and get your first alert in five minutes.",
  },
  {
    href: "/docs/monitors",
    title: "Adding a monitor",
    description:
      "URL, method, interval, timeout, expected status codes, headers, body and keyword checks.",
  },
  {
    href: "/docs/alerts",
    title: "Alert channels",
    description:
      "Set up email, Discord, Slack and Telegram alerts, test them, and choose reminders.",
  },
  {
    href: "/docs/status-pages",
    title: "Status pages",
    description:
      "Publish a public status page for your users, pick what it shows and post announcements.",
  },
  {
    href: "/docs/status-badge",
    title: "Status badge",
    description: "Embed a live up/down badge in your README or website.",
  },
]

export function docNeighbours(href: string) {
  const index = DOC_PAGES.findIndex((page) => page.href === href)
  return {
    previous: index > 0 ? DOC_PAGES[index - 1] : undefined,
    next: index >= 0 ? DOC_PAGES[index + 1] : undefined,
  }
}

export function docPage(href: string): DocPage {
  const page = DOC_PAGES.find((entry) => entry.href === href)
  if (!page) throw new Error(`Unknown docs page ${href}`)
  return page
}
