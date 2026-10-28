import { lookup as dnsLookup } from "node:dns/promises"

import { ipFamily, isBlockedIp } from "./ip"
import { checkUrlPolicy, type UrlPolicyOptions } from "./url-policy"

// Server-side SSRF guard (Node only). Used by monitor save, "Test now" and the
// worker, on every check and every redirect hop.

export type LookupAddress = { address: string; family: number }
export type LookupFn = (hostname: string) => Promise<LookupAddress[]>

export type ResolvedTarget = {
  url: URL
  /** Hostname without IPv6 brackets or trailing dot. */
  hostname: string
  /** The validated IP the request must connect to (pinned against DNS rebinding). */
  address: string
  family: 4 | 6
}

export type GuardResult =
  | { ok: true; target: ResolvedTarget }
  | { ok: false; code: "invalid_url" | "blocked" | "dns"; reason: string }

export type GuardOptions = UrlPolicyOptions & {
  /** Injectable for tests. Defaults to the OS resolver (same one a connect would use). */
  lookup?: LookupFn
  dnsTimeoutMs?: number
}

const defaultLookup: LookupFn = (hostname) =>
  dnsLookup(hostname, { all: true, verbatim: true })

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS timeout")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export async function resolvePublicTarget(
  rawUrl: string,
  options: GuardOptions = {}
): Promise<GuardResult> {
  const policy = checkUrlPolicy(rawUrl, options)
  if (!policy.ok) return policy

  const { url } = policy
  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "")
  const literalFamily = ipFamily(hostname)
  if (literalFamily) {
    // Literal IPs were already judged by the policy check.
    return {
      ok: true,
      target: { url, hostname, address: hostname, family: literalFamily },
    }
  }

  let addresses: LookupAddress[]
  try {
    addresses = await withTimeout(
      (options.lookup ?? defaultLookup)(hostname),
      options.dnsTimeoutMs ?? 5_000
    )
  } catch {
    return { ok: false, code: "dns", reason: `Couldn't resolve ${hostname}` }
  }
  if (addresses.length === 0) {
    return { ok: false, code: "dns", reason: `Couldn't resolve ${hostname}` }
  }

  // One private answer is enough to refuse: a mixed answer could be picked at connect time.
  if (!options.allowPrivate) {
    if (addresses.some((entry) => isBlockedIp(entry.address))) {
      return {
        ok: false,
        code: "blocked",
        reason: `${hostname} points to a private or internal address. PingBoard can only monitor public URLs.`,
      }
    }
  }

  // Prefer IPv4: many hosts (and dev machines) have no working IPv6 route.
  const chosen =
    addresses.find((entry) => ipFamily(entry.address) === 4) ?? addresses[0]!
  const family = ipFamily(chosen.address)
  if (!family) {
    return { ok: false, code: "dns", reason: `Couldn't resolve ${hostname}` }
  }
  return {
    ok: true,
    target: { url, hostname, address: chosen.address, family },
  }
}
