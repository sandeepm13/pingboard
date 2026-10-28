import type { Types } from "mongoose"

import { readCertificateExpiry } from "@shared/checks/ssl-expiry"
import { SSL_CHECK_INTERVAL_MS } from "@shared/constants"
import { Monitor } from "@shared/models/monitor"
import { resolvePublicTarget } from "@shared/security/ssrf"

import type { WorkerEnv } from "./env"
import type { Logger } from "./logger"

const TLS_TIMEOUT_MS = 10_000
/** After a failed read, try again in about an hour rather than a day. */
const RETRY_AFTER_FAILURE_MS = 60 * 60 * 1000

type SslMonitor = {
  _id: Types.ObjectId
  url: string
  sslCheckedAt?: Date | null
}

/** Saves sslExpiresAt for https monitors, at most once per SSL_CHECK_INTERVAL_MS. */
export async function refreshSslExpiryIfDue(
  monitor: SslMonitor,
  deps: {
    env: WorkerEnv
    log: Logger
    /** Called after a successful read (SSL expiry alerts). */
    onRead?: (expiresAt: Date | null) => Promise<void>
  },
  now: Date = new Date()
): Promise<void> {
  if (!monitor.url.startsWith("https:")) return
  const last = monitor.sslCheckedAt?.getTime() ?? 0
  if (now.getTime() - last < SSL_CHECK_INTERVAL_MS) return

  // Scoped to the URL we read it for, so an edit in between isn't overwritten.
  const filter = { _id: monitor._id, url: monitor.url }
  try {
    // Same SSRF guard as the check: validated IP, pinned connection.
    const resolved = await resolvePublicTarget(monitor.url, {
      allowPrivate: deps.env.SSRF_ALLOW_PRIVATE,
    })
    if (!resolved.ok) throw new Error(resolved.reason)
    const expiresAt = await readCertificateExpiry(
      resolved.target,
      TLS_TIMEOUT_MS
    )
    await Monitor.updateOne(filter, {
      $set: { sslExpiresAt: expiresAt, sslCheckedAt: now },
    })
    deps.log.debug(
      { sslExpiresAt: expiresAt?.toISOString() ?? null },
      "ssl expiry read"
    )
    await deps.onRead?.(expiresAt)
  } catch (error) {
    deps.log.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "couldn't read the ssl certificate"
    )
    const retryAt =
      now.getTime() - SSL_CHECK_INTERVAL_MS + RETRY_AFTER_FAILURE_MS
    await Monitor.updateOne(filter, {
      $set: { sslCheckedAt: new Date(retryAt) },
    })
  }
}
