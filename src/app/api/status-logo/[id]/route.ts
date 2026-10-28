import type { NextRequest } from "next/server"

import { StatusPage } from "@shared/models/status-page"
import { StatusPageLogo } from "@shared/models/status-page-logo"
import { objectIdSchema } from "@shared/schemas/common"
import { getCurrentUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"

// GET /api/status-logo/<pageId>?v=<hash> — an uploaded status page logo.
// Public for published pages; an unpublished page's logo is only served to
// its owner (for the preview).

const notFound = () => new Response("Not found", { status: 404 })

export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/status-logo/[id]">
) {
  const parsed = objectIdSchema.safeParse((await params).id)
  if (!parsed.success) return notFound()

  await connectDb()
  const page = await StatusPage.findById(parsed.data)
    .select("userId isPublic")
    .lean()
  if (!page) return notFound()
  if (!page.isPublic) {
    const user = await getCurrentUser()
    if (user?.id !== page.userId.toString()) return notFound()
  }

  const logo = await StatusPageLogo.findOne({ statusPageId: page._id })
  if (!logo) return notFound()

  // The URL carries the content hash, so a matching ?v= can be cached forever.
  const versioned = request.nextUrl.searchParams.get("v") === logo.hash
  return new Response(new Uint8Array(logo.data), {
    headers: {
      // Sniffed from the bytes at upload; never an SVG.
      "Content-Type": logo.contentType,
      "Cache-Control": !page.isPublic
        ? "private, no-store"
        : versioned
          ? "public, max-age=31536000, immutable"
          : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": "inline",
    },
  })
}
