import { isIP } from "node:net"
import tls from "node:tls"

import type { ResolvedTarget } from "../security/ssrf"

/**
 * Reads the expiry date of the certificate served for `target`, connecting to
 * the already-validated IP only. Verification is off on purpose: an expired or
 * mismatched certificate is exactly what we want to report a date for (the
 * regular check already fails those). No HTTP request is sent.
 */
export function readCertificateExpiry(
  target: ResolvedTarget,
  timeoutMs: number
): Promise<Date | null> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: target.address,
      port: Number(target.url.port) || 443,
      // SNI must be a hostname; RFC 6066 forbids IP literals there.
      servername: isIP(target.hostname) ? undefined : target.hostname,
      rejectUnauthorized: false,
      ALPNProtocols: ["http/1.1"],
    })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error("TLS handshake timed out"))
    }, timeoutMs)

    socket.once("secureConnect", () => {
      clearTimeout(timer)
      const validTo = socket.getPeerCertificate().valid_to
      socket.end()
      const expiresAt = validTo ? new Date(validTo) : null
      resolve(
        expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null
      )
    })
    socket.once("error", (error) => {
      clearTimeout(timer)
      socket.destroy()
      reject(error)
    })
  })
}
