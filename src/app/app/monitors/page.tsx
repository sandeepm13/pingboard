import { redirect } from "next/navigation"

// The monitor list lives on the dashboard (/app); kept for old links.
export default function Page() {
  redirect("/app")
}
