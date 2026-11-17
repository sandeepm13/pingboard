import "server-only"

import type { Types } from "mongoose"

import { StatusPage, type StatusPageDoc } from "@shared/models/status-page"
import { objectIdSchema } from "@shared/schemas/common"
import type { StatusPageFormValues } from "@shared/schemas/status-page"
import { connectDb } from "@/lib/db"

// Ownership-scoped reads for the status page editor. Every query includes
// userId, so someone else's page looks exactly like a missing one.

export type StatusPageRecord = StatusPageDoc & { _id: Types.ObjectId }

export type StatusPageListItem = {
  id: string
  slug: string
  title: string
  isPublic: boolean
  monitorCount: number
  announcementCount: number
}

export async function listStatusPages(
  userId: string
): Promise<StatusPageListItem[]> {
  await connectDb()
  const pages = await StatusPage.find({ userId })
    .select("slug title isPublic monitors announcements")
    .sort({ createdAt: -1 })
    .lean()
  return pages.map((page) => ({
    id: page._id.toString(),
    slug: page.slug,
    title: page.title,
    isPublic: page.isPublic,
    monitorCount: page.monitors.length,
    announcementCount: page.announcements.length,
  }))
}

export async function countStatusPages(userId: string): Promise<number> {
  await connectDb()
  return StatusPage.countDocuments({ userId })
}

/** null for malformed ids, missing pages and pages owned by someone else. */
export async function findOwnedStatusPage(
  userId: string,
  id: unknown
): Promise<StatusPageRecord | null> {
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return null
  await connectDb()
  return StatusPage.findOne({ _id: parsed.data, userId }).lean()
}

export function toStatusPageFormValues(
  page: StatusPageRecord
): StatusPageFormValues {
  return {
    title: page.title,
    slug: page.slug,
    description: page.description ?? "",
    theme: page.theme,
    showResponseTimes: page.showResponseTimes,
    showUrls: page.showUrls,
    isPublic: page.isPublic,
    monitors: page.monitors.map((entry) => ({
      monitorId: entry.monitorId.toString(),
      displayName: entry.displayName,
    })),
  }
}

export function newStatusPageDefaults(
  monitors: { id: string; name: string }[]
): StatusPageFormValues {
  return {
    title: "",
    slug: "",
    description: "",
    theme: "auto",
    showResponseTimes: false,
    showUrls: false,
    // Nothing is public until the owner has seen the preview and publishes.
    isPublic: false,
    // Start with every monitor listed; the owner removes or renames them.
    monitors: monitors.map((monitor) => ({
      monitorId: monitor.id,
      displayName: monitor.name,
    })),
  }
}

export type AnnouncementItem = {
  id: string
  message: string
  createdAt: string
}

export function toAnnouncementItems(
  page: StatusPageRecord
): AnnouncementItem[] {
  return page.announcements.map((announcement) => ({
    id: announcement._id.toString(),
    message: announcement.message,
    createdAt: announcement.createdAt.toISOString(),
  }))
}
