import { renderBadge } from "@/lib/badge"
import { getPublicStatusSummary, parseSlug } from "@/lib/public-status"

// GET /api/badge/<slug>.svg — README badge with the page's overall status.
// Public and unauthenticated, like the page itself; unpublished or unknown
// pages get a grey "unknown" badge with a 404.

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/badge/[file]">
) {
  const { file } = await params
  const slug = file.endsWith(".svg") ? parseSlug(file.slice(0, -4)) : null
  const summary = slug ? await getPublicStatusSummary(slug) : null

  return new Response(renderBadge(summary?.overall ?? "unknown"), {
    status: summary ? 200 : 404,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Short, so GitHub's image proxy picks up changes within about a minute.
      "Cache-Control": "public, max-age=30, s-maxage=30",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  })
}
