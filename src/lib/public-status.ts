import "server-only"

import { Types } from "mongoose"
import { cacheLife, cacheTag } from "next/cache"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import { CheckResult } from "@shared/models/check-result"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import { StatusPage, type StatusPageDoc } from "@shared/models/status-page"
import { User } from "@shared/models/user"
import { planLimits } from "@shared/plans"
import { objectIdSchema } from "@shared/schemas/common"
import { statusPageSlugSchema } from "@shared/schemas/status-page"
import {
  overallStatus,
  toPublicStatusView,
  type OverallStatus,
  type PublicStatusView,
} from "@shared/status-page"
import { HOUR_MS } from "@shared/time"
import type { MonitorStatus, StatusPageTheme } from "@shared/types"
import { COUNT_ACCUMULATORS, bucketIndex, roundMs } from "@/lib/check-buckets"
import { connectDb } from "@/lib/db"
import { getDailyHistories, type ResponseSeries } from "@/lib/monitor-stats"

// Read side of the public status page (/status/[slug]), its badge and its
// Open Graph image. Public loaders are cached with "use cache"; the editor's
// server actions call updateTag(statusPageTag(slug)) after every change.

export type PublicView = PublicStatusView<ResponseSeries>

type PageRecord = StatusPageDoc & { _id: Types.ObjectId }

export function statusPageTag(slug: string) {
  return `status-page:${slug}`
}

/** "acme" from a route param, or null for anything that can't be a slug. */
export function parseSlug(value: string): string | null {
  const parsed = statusPageSlugSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

type HourGroup = {
  _id: { monitorId: Types.ObjectId; bucket: number }
  total: number
  up: number
  degraded: number
  avgMs: number | null
}

/** Last 24 h of response times in 1-hour buckets, every monitor in one query. */
async function hourlySeries(
  monitorIds: Types.ObjectId[],
  now: number
): Promise<Map<string, ResponseSeries>> {
  const from = Math.floor((now - 24 * HOUR_MS) / HOUR_MS) * HOUR_MS
  const groups = await CheckResult.aggregate<HourGroup>([
    {
      $match: {
        monitorId: { $in: monitorIds },
        checkedAt: { $gte: new Date(from) },
      },
    },
    {
      $group: {
        _id: {
          monitorId: "$monitorId",
          bucket: bucketIndex(new Date(from), HOUR_MS),
        },
        ...COUNT_ACCUMULATORS,
        avgMs: { $avg: "$responseTimeMs" },
      },
    },
    { $sort: { "_id.bucket": 1 } },
  ])
  const series = new Map<string, ResponseSeries>(
    monitorIds.map((id) => [
      id.toString(),
      { range: "24h", from, to: now, bucketMs: HOUR_MS, points: [] },
    ])
  )
  for (const group of groups) {
    series.get(group._id.monitorId.toString())?.points.push({
      t: from + group._id.bucket * HOUR_MS,
      avgMs: roundMs(group.avgMs),
      p95Ms: null,
      checks: group.total,
      failed: group.total - group.up,
    })
  }
  return series
}

/** Everything the page shows, from the owner's own monitors only. */
async function buildView(page: PageRecord): Promise<PublicView> {
  const now = new Date()
  const ids = page.monitors.map((entry) => entry.monitorId)
  const [monitors, owner] = await Promise.all([
    // Scoped by the page owner: a page can never show someone else's monitor.
    Monitor.find({ _id: { $in: ids }, userId: page.userId })
      .select("status url createdAt")
      .lean(),
    User.findById(page.userId).select("plan").lean(),
  ])
  const monitorIds = monitors.map((monitor) => monitor._id)
  const since = new Date(
    now.getTime() - STATUS_PAGE_LIMITS.incidentDays * 24 * HOUR_MS
  )

  const [histories, incidents, series] = await Promise.all([
    getDailyHistories(
      monitors.map((monitor) => ({
        id: monitor._id.toString(),
        createdAtMs: monitor.createdAt.getTime(),
      }))
    ),
    Incident.find({
      monitorId: { $in: monitorIds },
      userId: page.userId,
      $or: [{ open: true }, { resolvedAt: { $gte: since } }],
    })
      .sort({ startedAt: -1 })
      .limit(100)
      .select("monitorId startedAt resolvedAt durationSeconds open")
      .lean(),
    page.showResponseTimes ? hourlySeries(monitorIds, now.getTime()) : null,
  ])

  return toPublicStatusView({
    page: {
      slug: page.slug,
      title: page.title,
      description: page.description ?? "",
      logoUrl: page.logoUrl ?? null,
      theme: page.theme,
      showUrls: page.showUrls,
      showResponseTimes: page.showResponseTimes,
      monitors: page.monitors.map((entry) => ({
        monitorId: entry.monitorId.toString(),
        displayName: entry.displayName,
      })),
      announcements: page.announcements,
    },
    monitors: new Map(
      monitors.map((monitor) => [
        monitor._id.toString(),
        { status: monitor.status, url: monitor.url },
      ])
    ),
    histories,
    incidents: incidents.map((incident) => ({
      monitorId: incident.monitorId.toString(),
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt ?? null,
      durationSeconds: incident.durationSeconds ?? null,
      open: incident.open,
    })),
    series,
    branding: planLimits(owner?.plan ?? "free").statusPageBranding,
    now,
  })
}

/*
 * Cache lifetime of public data. revalidate 30 + expire 60: a request after
 * 30 s refreshes in the background, and nothing older than 60 s is ever
 * served, so a monitor going down shows within a minute. (expire < 5 min
 * keeps these out of prerendering, which is fine: they're per-slug.)
 */

/** The public view of a published page, or null (unknown, unpublished, bad slug). */
export async function getPublicStatusPage(
  slug: string
): Promise<PublicView | null> {
  "use cache"
  cacheLife({ stale: 30, revalidate: 30, expire: 60 })
  cacheTag(statusPageTag(slug))

  await connectDb()
  const page = await StatusPage.findOne({ slug, isPublic: true }).lean()
  return page ? buildView(page) : null
}

export type StatusSummary = {
  title: string
  description: string
  theme: StatusPageTheme
  overall: OverallStatus
}

/** Just the headline, for the badge, the OG image and <head>. Two small queries. */
export async function getPublicStatusSummary(
  slug: string
): Promise<StatusSummary | null> {
  "use cache"
  cacheLife({ stale: 30, revalidate: 30, expire: 60 })
  cacheTag(statusPageTag(slug))

  await connectDb()
  const page = await StatusPage.findOne({ slug, isPublic: true })
    .select("userId title description theme monitors")
    .lean()
  if (!page) return null
  const monitors = await Monitor.find({
    _id: { $in: page.monitors.map((entry) => entry.monitorId) },
    userId: page.userId,
  })
    .select("status")
    .lean<{ status: MonitorStatus }[]>()
  return {
    title: page.title,
    description: page.description ?? "",
    theme: page.theme,
    overall: overallStatus(monitors.map((monitor) => monitor.status)),
  }
}

/** The owner's preview: any page of theirs, published or not, uncached. */
export async function getStatusPagePreview(
  userId: string,
  id: unknown
): Promise<PublicView | null> {
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return null
  await connectDb()
  const page = await StatusPage.findOne({ _id: parsed.data, userId }).lean()
  return page ? buildView(page) : null
}
