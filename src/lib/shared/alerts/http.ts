import { ALERT_LIMITS, CHECK_USER_AGENT } from "../constants"
import {
  describeRequestError,
  readBodyText,
  sendPinnedRequest,
} from "../checks/http-request"
import { resolvePublicTarget, type GuardResult } from "../security/ssrf"
import { DeliveryError } from "./errors"

// POST JSON to a chat webhook. Same SSRF guard as monitor checks (every DNS
// answer checked, connection pinned to the validated IP), plus an exact host
// allow-list. Redirects are never followed. The URL may contain a secret
// (webhook token, bot token): it is never logged or put into an error.

export type PostJsonResult = { status: number; text: string }

export type PostJsonOptions = {
  allowedHosts: readonly string[]
  timeoutMs?: number
  /** Replaces the DNS guard (tests only). */
  guard?: (url: string) => Promise<GuardResult>
}

export type PostJson = (
  url: string,
  body: unknown,
  options: PostJsonOptions
) => Promise<PostJsonResult>

const MAX_RESPONSE_BYTES = 16 * 1024

export const postJson: PostJson = async (url, body, options) => {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new DeliveryError("The webhook URL is invalid", { permanent: true })
  }
  if (
    parsed.protocol !== "https:" ||
    !options.allowedHosts.includes(parsed.hostname.toLowerCase())
  ) {
    throw new DeliveryError("This webhook host isn't allowed", {
      permanent: true,
    })
  }

  const timeoutMs = options.timeoutMs ?? ALERT_LIMITS.requestTimeoutMs
  const signal = AbortSignal.timeout(timeoutMs)
  // Webhook hosts are public services: private addresses are never allowed here.
  const resolved = await (
    options.guard ?? ((u: string) => resolvePublicTarget(u))
  )(parsed.href)
  if (!resolved.ok) {
    throw new DeliveryError(
      resolved.code === "dns"
        ? `Couldn't resolve ${parsed.hostname}`
        : `${parsed.hostname} resolved to a blocked address`,
      { permanent: false }
    )
  }

  const payload = JSON.stringify(body)
  try {
    const response = await sendPinnedRequest(resolved.target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        "user-agent": CHECK_USER_AGENT,
        accept: "application/json",
        connection: "close",
      },
      body: payload,
      signal,
    })
    const text = await readBodyText(response, MAX_RESPONSE_BYTES)
    return { status: response.statusCode ?? 0, text }
  } catch (error) {
    throw new DeliveryError(describeRequestError(error, timeoutMs), {
      permanent: false,
    })
  }
}
