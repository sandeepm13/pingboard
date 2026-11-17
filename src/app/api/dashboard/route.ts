import { requireApiUser } from "@/lib/auth/require-user"
import { getDashboard } from "@/lib/dashboard"

// Polled by the open dashboard every DASHBOARD_REFRESH_MS. Same loader as the
// server-rendered page, scoped to the session's user.

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET() {
  const { user, response } = await requireApiUser()
  if (response) return response

  try {
    return Response.json(await getDashboard(user), { headers: NO_STORE })
  } catch (error) {
    console.error(
      "[dashboard] couldn't load:",
      error instanceof Error ? error.message : error
    )
    return Response.json(
      { error: "Couldn't load the dashboard." },
      { status: 500, headers: NO_STORE }
    )
  }
}
