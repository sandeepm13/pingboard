import { isBlockedIp, parseIPv4, parseIPv6 } from "./ip"

// Synchronous URL rules (no DNS), shared by the Zod schema in the browser and
// on the server. The DNS half of the guard lives in ./ssrf.ts.

export type UrlPolicyOptions = {
  /** Dev-only escape hatch (SSRF_ALLOW_PRIVATE). Never true in production. */
  allowPrivate?: boolean
}

export type UrlPolicyResult =
  | { ok: true; url: URL }
  | { ok: false; code: "invalid_url" | "blocked"; reason: string }

export const PRIVATE_ADDRESS_MESSAGE =
  "This is a private or internal address. PingBoard can only monitor public URLs."

// Common database/infrastructure ports that are never a public website.
const BLOCKED_PORTS = new Set([
  2375, 2376, 2379, 2380, 3306, 5432, 5984, 6379, 6443, 8500, 9200, 9300, 10250,
  10255, 11211, 27017, 27018, 27019,
])

const BLOCKED_HOSTS = new Set(["localhost", "localhost.localdomain"])
const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".home.arpa",
  ".lan",
]

const LABEL = /^(?!-)[a-z0-9_-]{1,63}(?<!-)$/

function invalid(reason: string): UrlPolicyResult {
  return { ok: false, code: "invalid_url", reason }
}

function blocked(reason = PRIVATE_ADDRESS_MESSAGE): UrlPolicyResult {
  return { ok: false, code: "blocked", reason }
}

/** Adds https:// when the user typed a bare host like "example.com/health". */
export function withDefaultScheme(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function checkUrlPolicy(
  raw: string,
  options: UrlPolicyOptions = {}
): UrlPolicyResult {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return invalid("Enter a valid URL, like https://example.com")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return invalid("Only http:// and https:// URLs can be monitored")
  }
  if (url.username || url.password) {
    return invalid(
      "Remove the username and password from the URL. Use an Authorization header instead."
    )
  }

  if (url.port) {
    const port = Number(url.port)
    const allowed =
      port === 80 || port === 443 || (port >= 1024 && !BLOCKED_PORTS.has(port))
    if (!allowed) return blocked(`Port ${port} can't be monitored`)
  }

  // The URL parser already turns 0x7f.1, 2130706433, 0177.0.0.1… into 127.0.0.1.
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (!host) return invalid("Enter a hostname")
  const allowPrivate = options.allowPrivate === true

  if (host.startsWith("[")) {
    if (!parseIPv6(host)) return invalid("Enter a valid IPv6 address")
    return !allowPrivate && isBlockedIp(host) ? blocked() : { ok: true, url }
  }
  if (/^[\d.]+$/.test(host)) {
    if (!parseIPv4(host)) return invalid("Enter a valid IP address")
    return !allowPrivate && isBlockedIp(host) ? blocked() : { ok: true, url }
  }

  if (host.length > 253 || !host.split(".").every((l) => LABEL.test(l))) {
    return invalid("Enter a valid hostname, like example.com")
  }
  if (!allowPrivate) {
    if (
      BLOCKED_HOSTS.has(host) ||
      BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))
    ) {
      return blocked()
    }
    // Single-label names ("intranet", "redis") only resolve on private networks.
    if (!host.includes(".")) {
      return blocked("Use a public hostname, like example.com")
    }
  }
  return { ok: true, url }
}
