import { z } from "zod"

import { ALERT_LIMITS, CHECK_TIMEOUT_MS, MONITOR_LIMITS } from "../constants"
import {
  checkUrlPolicy,
  withDefaultScheme,
  type UrlPolicyOptions,
} from "../security/url-policy"
import { parseStatusCodes } from "../status-codes"
import { checkIntervalSchema, httpMethodSchema, objectIdSchema } from "./common"

// Shared by the monitor form (client) and the monitor server actions. Built by
// factories because the dev-only SSRF_ALLOW_PRIVATE flag changes the URL rules.

const L = MONITOR_LIMITS

/** Set by Node itself or would let a monitor smuggle a second request. */
const RESERVED_HEADERS = new Set([
  "host",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
  "expect",
  "proxy-authorization",
  "proxy-connection",
])

export function monitorUrlSchema(options: UrlPolicyOptions = {}) {
  return z
    .string()
    .trim()
    .min(1, "Enter a URL")
    .max(L.urlMax, "URL is too long")
    .transform((value, ctx) => {
      const result = checkUrlPolicy(withDefaultScheme(value), options)
      if (!result.ok) {
        ctx.issues.push({
          code: "custom",
          message: result.reason,
          input: value,
        })
        return z.NEVER
      }
      return result.url.href
    })
}

export const statusCodesSchema = z
  .string()
  .max(200, "Too long")
  .transform((value, ctx) => {
    const parsed = parseStatusCodes(value)
    if (!parsed.ok) {
      ctx.issues.push({ code: "custom", message: parsed.error, input: value })
      return z.NEVER
    }
    return parsed.ranges
  })

export const monitorHeaderSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Enter a header name")
      .max(L.headerNameMax, "Header name is too long")
      .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/, "Use letters, digits and - only")
      .refine((name) => !RESERVED_HEADERS.has(name.toLowerCase()), {
        error: "PingBoard sets this header itself",
      }),
    value: z
      .string()
      .trim()
      .max(L.headerValueMax, "Header value is too long")
      .refine((value) => !/[\r\n\0]/.test(value), {
        error: "Header values can't contain line breaks",
      }),
    /** Edit form: keep the stored (encrypted, never sent to the browser) value. */
    keepExisting: z.boolean().optional(),
  })
  .refine((header) => header.keepExisting || header.value.length > 0, {
    path: ["value"],
    error: "Enter a value",
  })

const tagsSchema = z
  .string()
  .max(400, "Too many tags")
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ])
  .pipe(
    z
      .array(
        z
          .string()
          .max(L.tagMax, `Tags can be at most ${L.tagMax} characters`)
          .regex(
            /^[a-z0-9][a-z0-9 _.-]*$/,
            "Tags can use letters, digits, spaces and - _ ."
          )
      )
      .max(L.tagsMax, `Use at most ${L.tagsMax} tags`)
  )

function checkFields(options: UrlPolicyOptions) {
  return {
    url: monitorUrlSchema(options),
    method: httpMethodSchema,
    timeoutMs: z
      .number({ error: "Pick a timeout" })
      .int()
      .min(CHECK_TIMEOUT_MS.min)
      .max(CHECK_TIMEOUT_MS.max),
    expectedStatusCodes: statusCodesSchema,
    headers: z
      .array(monitorHeaderSchema)
      .max(L.headersMax, `Use at most ${L.headersMax} headers`),
    body: z
      .string()
      .max(
        L.bodyMax,
        `Body is too long (max ${L.bodyMax.toLocaleString("en-US")} characters)`
      ),
    keyword: z.string().trim().max(L.keywordMax, "Keyword is too long"),
    followRedirects: z.boolean(),
  }
}

type CheckFields = {
  method: string
  keyword: string
  body: string
  headers: { name: string }[]
}

function refineCheckFields(data: CheckFields, ctx: z.RefinementCtx) {
  if (data.method === "HEAD" && data.keyword) {
    ctx.addIssue({
      code: "custom",
      path: ["keyword"],
      message: "HEAD responses have no body. Use GET to check for a keyword.",
    })
  }
  const seen = new Set<string>()
  data.headers.forEach((header, index) => {
    const key = header.name.toLowerCase()
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["headers", index, "name"],
        message: "This header is already set",
      })
    }
    seen.add(key)
  })
}

/** Body only travels with POST; empty optional text becomes null. */
function normalize<T extends CheckFields>(data: T) {
  return {
    ...data,
    body: data.method === "POST" && data.body.trim() ? data.body : null,
    keyword: data.keyword || null,
  }
}

/** Only what "Test now" needs (name/interval/tags aren't required to test). */
export function createMonitorTestSchema(options: UrlPolicyOptions = {}) {
  return z
    .object(checkFields(options))
    .superRefine(refineCheckFields)
    .transform(normalize)
}

/** Which channels alert for this monitor. Ownership is checked by the server action. */
const alertFields = {
  alertAllChannels: z.boolean(),
  alertChannelIds: z
    .array(objectIdSchema)
    .max(ALERT_LIMITS.channelsMax, "Too many channels"),
  alertOnDegraded: z.boolean(),
}

export function createMonitorInputSchema(options: UrlPolicyOptions = {}) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Give the monitor a name")
        .max(L.nameMax, "Name is too long"),
      intervalMinutes: checkIntervalSchema,
      tags: tagsSchema,
      ...checkFields(options),
      ...alertFields,
    })
    .superRefine(refineCheckFields)
    .transform(normalize)
}

/**
 * "Try it now" on the landing page: only a URL, always the strict policy
 * (anonymous visitors never get SSRF_ALLOW_PRIVATE).
 */
export const tryCheckSchema = z.object({ url: monitorUrlSchema() })

export type TryCheckInput = z.input<typeof tryCheckSchema>

/** Strict (production) variants, used for types and the client form. */
export const monitorInputSchema = createMonitorInputSchema()
export const monitorTestSchema = createMonitorTestSchema()

export type MonitorFormValues = z.input<typeof monitorInputSchema>
export type MonitorInput = z.output<typeof monitorInputSchema>
export type MonitorTestInput = z.output<typeof monitorTestSchema>
