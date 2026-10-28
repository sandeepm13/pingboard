import { connection } from "next/server"

import type { OAuthProvider } from "@shared/types"
import { Skeleton } from "@/components/ui/skeleton"

import { OAuthButtons } from "./oauth-buttons"

function enabledProviders(): OAuthProvider[] {
  const list: OAuthProvider[] = []
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    list.push("google")
  }
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    list.push("github")
  }
  return list
}

/** Google/GitHub buttons for whichever providers have keys configured. */
export async function OAuthSection() {
  // Read env at request time, not build time, so keys added later show up.
  await connection()
  const providers = enabledProviders()
  if (providers.length === 0) return null

  return (
    <>
      <OAuthButtons providers={providers} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  )
}

export function OAuthSectionSkeleton() {
  return <Skeleton className="h-9 w-full" />
}
