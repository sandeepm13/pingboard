"use server"

import { createHash } from "node:crypto"

import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import { Monitor } from "@shared/models/monitor"
import { StatusPage } from "@shared/models/status-page"
import { StatusPageLogo } from "@shared/models/status-page-logo"
import { planLimits } from "@shared/plans"
import { objectIdSchema } from "@shared/schemas/common"
import {
  announcementInputSchema,
  statusPageInputSchema,
  type StatusPageInput,
} from "@shared/schemas/status-page"
import { requireUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"
import { sniffImageType } from "@/lib/image-type"
import { statusPageTag } from "@/lib/public-status"
import { findOwnedStatusPage } from "@/lib/status-pages"

// Every action: requireUser() → Zod → queries scoped by { _id, userId }.
// After a change the public cache for the page's slug is expired at once.

export type StatusPageActionResult =
  | { ok: true; id: string }
  | { error: string; fieldErrors?: Record<string, string> }

const NOT_FOUND = { error: "Status page not found." } as const

function invalid(error: z.ZodError): StatusPageActionResult {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    fieldErrors[issue.path.join(".")] ??= issue.message
  }
  return { error: "Please fix the highlighted fields.", fieldErrors }
}

const SLUG_TAKEN = {
  error: "That address is already taken.",
  fieldErrors: { slug: "That address is already taken. Try another one." },
}

/** The unique slug index caught two pages wanting the same address. */
function isDuplicateKey(error: unknown) {
  return (error as { code?: number } | null)?.code === 11000
}

function revalidatePage(slugs: string[], id?: string) {
  for (const slug of new Set(slugs)) updateTag(statusPageTag(slug))
  revalidatePath("/app/status-pages")
  if (id) revalidatePath(`/app/status-pages/${id}`)
}

/** The listed monitors, keeping only the user's own (in the chosen order). */
async function ownedMonitors(userId: string, data: StatusPageInput) {
  const ids = data.monitors.map((entry) => entry.monitorId)
  const owned = ids.length
    ? await Monitor.find({ _id: { $in: ids }, userId })
        .select("_id")
        .lean()
    : []
  const ownedIds = new Set(owned.map((monitor) => monitor._id.toString()))
  return data.monitors
    .filter((entry) => ownedIds.has(entry.monitorId))
    .map((entry) => ({
      monitorId: entry.monitorId,
      displayName: entry.displayName,
    }))
}

function storedFields(data: StatusPageInput) {
  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    theme: data.theme,
    showResponseTimes: data.showResponseTimes,
    showUrls: data.showUrls,
    isPublic: data.isPublic,
  }
}

export async function createStatusPageAction(
  input: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const parsed = statusPageInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  await connectDb()
  const { maxStatusPages, label } = planLimits(user.plan)
  const limitError = {
    error: `The ${label} plan includes ${maxStatusPages} status ${maxStatusPages === 1 ? "page" : "pages"}.`,
  }
  if (
    (await StatusPage.countDocuments({ userId: user.id })) >= maxStatusPages
  ) {
    return limitError
  }

  let id: string
  try {
    const page = await StatusPage.create({
      userId: user.id,
      ...storedFields(parsed.data),
      monitors: await ownedMonitors(user.id, parsed.data),
    })
    id = page._id.toString()
  } catch (error) {
    if (isDuplicateKey(error)) return SLUG_TAKEN
    throw error
  }
  // Two parallel creates can both pass the count check; undo the extra one.
  if ((await StatusPage.countDocuments({ userId: user.id })) > maxStatusPages) {
    await StatusPage.deleteOne({ _id: id, userId: user.id })
    return limitError
  }
  revalidatePage([parsed.data.slug], id)
  return { ok: true, id }
}

export async function updateStatusPageAction(
  id: unknown,
  input: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND
  const parsed = statusPageInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  try {
    const update = await StatusPage.updateOne(
      { _id: existing._id, userId: user.id },
      {
        $set: {
          ...storedFields(parsed.data),
          monitors: await ownedMonitors(user.id, parsed.data),
        },
      }
    )
    if (update.matchedCount === 0) return NOT_FOUND
  } catch (error) {
    if (isDuplicateKey(error)) return SLUG_TAKEN
    throw error
  }
  // The old address stops working at once when the slug changes.
  revalidatePage([existing.slug, parsed.data.slug], existing._id.toString())
  return { ok: true, id: existing._id.toString() }
}

export async function deleteStatusPageAction(
  id: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND
  const deleted = await StatusPage.deleteOne({
    _id: existing._id,
    userId: user.id,
  })
  if (deleted.deletedCount === 0) return NOT_FOUND
  await StatusPageLogo.deleteOne({
    statusPageId: existing._id,
    userId: user.id,
  })
  revalidatePage([existing.slug])
  return { ok: true, id: existing._id.toString() }
}

/** FormData field "logo": PNG, JPEG or WebP up to STATUS_PAGE_LIMITS.logoMaxBytes. */
export async function uploadStatusPageLogoAction(
  id: unknown,
  formData: FormData
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND

  const file = formData.get("logo")
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." }
  }
  const maxKb = STATUS_PAGE_LIMITS.logoMaxBytes / 1024
  if (file.size > STATUS_PAGE_LIMITS.logoMaxBytes) {
    return { error: `The logo can be at most ${maxKb} KB.` }
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  const contentType = sniffImageType(bytes)
  if (!contentType) {
    return { error: "Use a PNG, JPEG or WebP image." }
  }

  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16)
  try {
    await StatusPageLogo.updateOne(
      { statusPageId: existing._id, userId: user.id },
      { $set: { contentType, data: bytes, hash } },
      { upsert: true, runValidators: true }
    )
  } catch (error) {
    console.error(
      "[status-pages] logo save failed:",
      error instanceof Error ? error.message : error
    )
    return { error: "Couldn't save the logo. Try again." }
  }
  const update = await StatusPage.updateOne(
    { _id: existing._id, userId: user.id },
    { $set: { logoUrl: `/api/status-logo/${existing._id}?v=${hash}` } }
  )
  if (update.matchedCount === 0) return NOT_FOUND
  revalidatePage([existing.slug], existing._id.toString())
  return { ok: true, id: existing._id.toString() }
}

export async function removeStatusPageLogoAction(
  id: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND
  await StatusPageLogo.deleteOne({
    statusPageId: existing._id,
    userId: user.id,
  })
  await StatusPage.updateOne(
    { _id: existing._id, userId: user.id },
    { $set: { logoUrl: null } }
  )
  revalidatePage([existing.slug], existing._id.toString())
  return { ok: true, id: existing._id.toString() }
}

export async function addAnnouncementAction(
  id: unknown,
  input: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND
  const parsed = announcementInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  const max = STATUS_PAGE_LIMITS.announcementsMax
  // The size condition makes the limit hold even for parallel posts.
  const update = await StatusPage.updateOne(
    {
      _id: existing._id,
      userId: user.id,
      [`announcements.${max - 1}`]: { $exists: false },
    },
    {
      $push: {
        announcements: {
          $each: [{ message: parsed.data.message, createdAt: new Date() }],
          $position: 0,
        },
      },
    }
  )
  if (update.matchedCount === 0) {
    return {
      error: `A page can show ${max} announcements. Delete an old one first.`,
    }
  }
  revalidatePage([existing.slug], existing._id.toString())
  return { ok: true, id: existing._id.toString() }
}

export async function deleteAnnouncementAction(
  id: unknown,
  announcementId: unknown
): Promise<StatusPageActionResult> {
  const user = await requireUser()
  const parsedAnnouncement = objectIdSchema.safeParse(announcementId)
  if (!parsedAnnouncement.success) return NOT_FOUND
  const existing = await findOwnedStatusPage(user.id, id)
  if (!existing) return NOT_FOUND
  await StatusPage.updateOne(
    { _id: existing._id, userId: user.id },
    { $pull: { announcements: { _id: parsedAnnouncement.data } } }
  )
  revalidatePage([existing.slug], existing._id.toString())
  return { ok: true, id: existing._id.toString() }
}
