import http, { type IncomingMessage, type OutgoingHttpHeaders } from "node:http"
import https from "node:https"
import type { LookupFunction } from "node:net"
import { pipeline, type Readable } from "node:stream"
import zlib from "node:zlib"

import type { ResolvedTarget } from "../security/ssrf"

// Low-level pieces of a check: one request pinned to a validated IP, a capped
// body reader, and friendly error messages.

export type RequestInit = {
  method: string
  headers: OutgoingHttpHeaders
  body: string | null
  signal: AbortSignal
}

/**
 * Sends one request to `target.address` only. The hostname is still used for
 * the Host header, TLS SNI and certificate checks, but DNS is never consulted
 * again, so a rebinding answer can't redirect the connection.
 */
export function sendPinnedRequest(
  target: ResolvedTarget,
  init: RequestInit
): Promise<IncomingMessage> {
  const isHttps = target.url.protocol === "https:"
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address: target.address, family: target.family }])
    } else {
      callback(null, target.address, target.family)
    }
  }

  return new Promise((resolve, reject) => {
    const request = (isHttps ? https : http).request(
      {
        hostname: target.hostname,
        port: target.url.port || (isHttps ? 443 : 80),
        path: `${target.url.pathname}${target.url.search}`,
        method: init.method,
        headers: init.headers,
        lookup,
        agent: false,
        signal: init.signal,
      },
      resolve
    )
    request.on("error", reject)
    request.end(init.body ?? undefined)
  })
}

function decoderFor(encoding: string) {
  switch (encoding) {
    case "gzip":
    case "x-gzip":
      return zlib.createGunzip()
    case "deflate":
      return zlib.createInflate()
    case "br":
      return zlib.createBrotliDecompress()
    default:
      return null
  }
}

/** Reads at most `maxBytes` of the (decompressed) body, then closes the socket. */
export async function readBodyText(
  response: IncomingMessage,
  maxBytes: number
): Promise<string> {
  const encoding = String(response.headers["content-encoding"] ?? "")
    .trim()
    .toLowerCase()
  const decoder = decoderFor(encoding)
  // pipeline() forwards errors/aborts, so a dropped connection can't hang the loop.
  const stream: Readable = decoder
    ? pipeline(response, decoder, () => {})
    : response

  const chunks: Buffer[] = []
  let size = 0
  try {
    for await (const chunk of stream) {
      const buffer = chunk as Buffer
      const room = maxBytes - size
      chunks.push(buffer.length > room ? buffer.subarray(0, room) : buffer)
      size += Math.min(buffer.length, room)
      if (size >= maxBytes) break
    }
  } finally {
    response.destroy()
  }
  return Buffer.concat(chunks).toString("utf8")
}

function seconds(ms: number) {
  const value = ms / 1000
  return `${Number.isInteger(value) ? value : value.toFixed(1)}s`
}

const TLS_MESSAGES: Record<string, string> = {
  CERT_HAS_EXPIRED: "SSL error: certificate has expired",
  DEPTH_ZERO_SELF_SIGNED_CERT: "SSL error: certificate is self-signed",
  SELF_SIGNED_CERT_IN_CHAIN: "SSL error: certificate chain is self-signed",
  ERR_TLS_CERT_ALTNAME_INVALID:
    "SSL error: certificate doesn't match the hostname",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "SSL error: certificate can't be verified",
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY: "SSL error: certificate can't be verified",
}

const NETWORK_MESSAGES: Record<string, string> = {
  ENOTFOUND: "DNS not found",
  EAI_AGAIN: "DNS not found",
  ECONNREFUSED: "Connection refused",
  ECONNRESET: "Connection reset by the server",
  EPIPE: "Connection closed by the server",
  ETIMEDOUT: "Connection timed out",
  EHOSTUNREACH: "Host unreachable",
  ENETUNREACH: "Network unreachable",
  Z_DATA_ERROR: "Couldn't decode the compressed response",
}

/** Short, user-facing description. Never includes response content. */
export function describeRequestError(error: unknown, timeoutMs: number) {
  const err = error as { name?: string; code?: string } | null
  if (
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    err?.code === "ABORT_ERR"
  ) {
    return `Timeout after ${seconds(timeoutMs)}`
  }
  const code = err?.code ?? ""
  if (TLS_MESSAGES[code]) return TLS_MESSAGES[code]
  if (NETWORK_MESSAGES[code]) return NETWORK_MESSAGES[code]
  if (/^(ERR_TLS|ERR_SSL|CERT_)/.test(code)) return `SSL error (${code})`
  if (code.startsWith("HPE_")) return "The server sent an invalid HTTP response"
  return code ? `Request failed (${code})` : "Request failed"
}
