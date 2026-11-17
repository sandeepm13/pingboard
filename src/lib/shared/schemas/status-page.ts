import { z } from "zod"

import {
  RESERVED_STATUS_SLUGS,
  STATUS_PAGE_LIMITS,
  STATUS_PAGE_THEMES,
} from "../constants"
import { PLAN_LIMITS } from "../plans"
import { objectIdSchema } from "./common"

// Shared by the status page editor (client) and its server actions.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const RESERVED = new Set<string>(RESERVED_STATUS_SLUGS)

/** Also used on the public route to reject junk before touching the database. */
export const statusPageSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(
    STATUS_PAGE_LIMITS.slugMin,
    `Use at least ${STATUS_PAGE_LIMITS.slugMin} characters`
  )
  .max(
    STATUS_PAGE_LIMITS.slugMax,
    `Use at most ${STATUS_PAGE_LIMITS.slugMax} characters`
  )
  .regex(
    SLUG_PATTERN,
    "Lowercase letters, numbers and single dashes (e.g. acme-api)"
  )
  .refine((slug) => !RESERVED.has(slug), "That address is reserved")

/** "Acme API!" → "acme-api". A starting point for the slug field. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, STATUS_PAGE_LIMITS.slugMax)
    .replace(/-+$/, "")
}

const maxMonitors = Math.max(
  ...Object.values(PLAN_LIMITS).map((plan) => plan.maxMonitors)
)

export const statusPageMonitorSchema = z.object({
  monitorId: objectIdSchema,
  displayName: z
    .string()
    .trim()
    .min(1, "Give it a public name")
    .max(STATUS_PAGE_LIMITS.displayNameMax, "Name is too long"),
})

export const statusPageInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the page a title")
    .max(STATUS_PAGE_LIMITS.titleMax, "Title is too long"),
  slug: statusPageSlugSchema,
  description: z
    .string()
    .trim()
    .max(STATUS_PAGE_LIMITS.descriptionMax, "Description is too long"),
  theme: z.enum(STATUS_PAGE_THEMES),
  showResponseTimes: z.boolean(),
  showUrls: z.boolean(),
  isPublic: z.boolean(),
  monitors: z
    .array(statusPageMonitorSchema)
    .max(maxMonitors, "Too many monitors")
    .refine(
      (rows) => new Set(rows.map((row) => row.monitorId)).size === rows.length,
      "Each monitor can only be listed once"
    ),
})

export type StatusPageFormValues = z.input<typeof statusPageInputSchema>
export type StatusPageInput = z.output<typeof statusPageInputSchema>

export const announcementInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a message")
    .max(
      STATUS_PAGE_LIMITS.announcementMax,
      `At most ${STATUS_PAGE_LIMITS.announcementMax} characters`
    ),
})

export type AnnouncementFormValues = z.input<typeof announcementInputSchema>
