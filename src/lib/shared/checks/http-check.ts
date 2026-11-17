import type { OutgoingHttpHeaders } from "node:http"

import {
  CHECK_MAX_BODY_BYTES,
  CHECK_MAX_REDIRECTS,
  CHECK_USER_AGENT,
  DEFAULT_SLOW_THRESHOLD_MS,
} from "../constants"
import {
  resolvePublicTarget,
  type GuardOptions,
  type GuardResult,
} from "../security/ssrf"
import { matchesStatusCode } from "../status-codes"
import type {
  CheckStatus,
  HttpMethod,
  RequestHeader,
  StatusCodeRange,
} from "../types"
import {
  describeRequestError,
  readBodyText,
  sendPinnedRequest,
} from "./http-request"

// One HTTP check. Shared by "Test now" (web) and the scheduled checker (worker).

export type HttpCheckRequest = {
  url: string
  method: HttpMethod
  /** Decrypted values. */
  headers: RequestHeader[]
  body: string | null
  timeoutMs: number
  expectedStatusCodes: StatusCodeRange[]
  keyword: string | null
  followRedirects: boolean
}

export type HttpCheckResult = {
  /** "degraded" is still up (isUp = true), just slow. */
  status: CheckStatus
  isUp: boolean
  statusCode: number | null
  responseTimeMs: number | null
  errorMessage: string | null
  checkedAt: Date
}

export type HttpCheckOptions = GuardOptions & {
  userAgent?: string
  maxRedirects?: number
  maxBodyBytes?: number
  /** An up check slower than this is "degraded". */
  slowThresholdMs?: number
  /** Replaces the per-hop SSRF guard (tests only). */
  guard?: (url: string) => Promise<GuardResult>
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason)
    signal.addEventListener("abort", onAbort, { once: true })
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort)
    })
  })
}

export async function runHttpCheck(
  request: HttpCheckRequest,
  options: HttpCheckOptions = {}
): Promise<HttpCheckResult> {
  const checkedAt = new Date()
  const started = performance.now()
  const signal = AbortSignal.timeout(request.timeoutMs)
  const guard =
    options.guard ?? ((url: string) => resolvePublicTarget(url, options))
  const maxRedirects = options.maxRedirects ?? CHECK_MAX_REDIRECTS
  const slowThresholdMs = options.slowThresholdMs ?? DEFAULT_SLOW_THRESHOLD_MS

  const down = (
    errorMessage: string,
    statusCode: number | null = null
  ): HttpCheckResult => ({
    status: "down",
    isUp: false,
    statusCode,
    responseTimeMs: null,
    errorMessage,
    checkedAt,
  })

  let url = request.url
  let method: string = request.method
  let body = request.body
  let originalOrigin: string | null = null
  let sendCustomHeaders = true

  try {
    for (let hop = 0; ; hop++) {
      const resolved = await abortable(guard(url), signal)
      if (!resolved.ok) {
        const reason =
          resolved.code === "dns" ? "DNS not found" : resolved.reason
        return down(hop === 0 ? reason : `Redirect blocked: ${reason}`)
      }
      const { target } = resolved
      originalOrigin ??= target.url.origin
      // Like browsers, don't leak the user's headers (auth tokens) to another origin.
      if (target.url.origin !== originalOrigin) sendCustomHeaders = false

      const headers: OutgoingHttpHeaders = {
        "user-agent": options.userAgent ?? CHECK_USER_AGENT,
        accept: "*/*",
        "accept-encoding": "gzip, deflate, br",
        connection: "close",
      }
      if (sendCustomHeaders) {
        for (const header of request.headers) {
          headers[header.name.toLowerCase()] = header.value
        }
      }
      if (body !== null) headers["content-length"] = Buffer.byteLength(body)

      const response = await sendPinnedRequest(target, {
        method,
        headers,
        body,
        signal,
      })
      const status = response.statusCode ?? 0
      const location = response.headers.location

      if (
        request.followRedirects &&
        REDIRECT_STATUSES.has(status) &&
        location
      ) {
        response.destroy()
        if (hop >= maxRedirects) {
          return down(`Too many redirects (more than ${maxRedirects})`, status)
        }
        try {
          url = new URL(location, target.url).href
        } catch {
          return down("The server sent an invalid redirect", status)
        }
        if (
          status === 303 ||
          ((status === 301 || status === 302) && method === "POST")
        ) {
          method = "GET"
          body = null
        }
        continue
      }

      const responseTimeMs = Math.round(performance.now() - started)
      const result = { statusCode: status, responseTimeMs, checkedAt }
      const failed = (errorMessage: string): HttpCheckResult => ({
        ...result,
        status: "down",
        isUp: false,
        errorMessage,
      })

      if (!matchesStatusCode(status, request.expectedStatusCodes)) {
        response.destroy()
        return failed(`Unexpected status ${status}`)
      }

      if (request.keyword && method !== "HEAD") {
        const text = await readBodyText(
          response,
          options.maxBodyBytes ?? CHECK_MAX_BODY_BYTES
        )
        if (!text.toLowerCase().includes(request.keyword.toLowerCase())) {
          return failed("Keyword not found")
        }
      } else {
        response.destroy()
      }
      return {
        ...result,
        status: responseTimeMs > slowThresholdMs ? "degraded" : "up",
        isUp: true,
        errorMessage: null,
      }
    }
  } catch (error) {
    return down(describeRequestError(error, request.timeoutMs))
  }
}
