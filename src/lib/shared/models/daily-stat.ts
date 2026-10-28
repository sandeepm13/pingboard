import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { DAILY_STAT_RETENTION_DAYS } from "../constants"

// One row per monitor per UTC day, written by the worker's rollup job. Outlives
// the raw CheckResults (30 days) so 30d+ uptime stays available.

const dailyStatSchema = new Schema(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Midnight UTC that starts the day. */
    day: { type: Date, required: true },
    totalChecks: { type: Number, required: true },
    upChecks: { type: Number, required: true },
    degradedChecks: { type: Number, required: true },
    /** shared/stats.ts uptimePercent(upChecks, totalChecks). */
    uptimePct: { type: Number, default: null },
    avgResponseMs: { type: Number, default: null },
    minResponseMs: { type: Number, default: null },
    maxResponseMs: { type: Number, default: null },
    p95ResponseMs: { type: Number, default: null },
    computedAt: { type: Date, required: true },
  },
  { versionKey: false }
)

// Re-running the rollup for a day upserts on this key instead of duplicating.
dailyStatSchema.index({ monitorId: 1, day: -1 }, { unique: true })
dailyStatSchema.index(
  { day: 1 },
  { expireAfterSeconds: DAILY_STAT_RETENTION_DAYS * 24 * 60 * 60 }
)

export type DailyStatDoc = InferSchemaType<typeof dailyStatSchema>

export const DailyStat: Model<DailyStatDoc> =
  (mongoose.models.DailyStat as Model<DailyStatDoc> | undefined) ??
  mongoose.model<DailyStatDoc>("DailyStat", dailyStatSchema)
