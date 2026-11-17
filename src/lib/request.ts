import "server-only"

/**
 * Best-effort client IP for rate limiting. x-forwarded-for is only trustworthy
 * behind a proxy that overwrites it (configured in Stage 10).
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || headers.get("x-real-ip") || "unknown"
}

/** Only allow same-site relative paths, so redirects can't leave the app. */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = "/app"
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback
  }
  if (value.startsWith("/\\")) return fallback
  return value
}
