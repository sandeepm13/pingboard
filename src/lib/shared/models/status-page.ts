import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { STATUS_PAGE_LIMITS, STATUS_PAGE_THEMES } from "../constants"

// A public page (/status/<slug>) listing monitors the owner picked, under
// names the owner chose. Only what's on this document and the monitors'
// status/history is ever shown publicly (see src/lib/public-status.ts).

const pageMonitorSchema = new Schema(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    /** Public name, so the monitor's own name and URL can stay private. */
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: STATUS_PAGE_LIMITS.displayNameMax,
    },
  },
  { _id: false }
)

const announcementSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      maxlength: STATUS_PAGE_LIMITS.announcementMax,
    },
    createdAt: { type: Date, required: true },
  },
  { _id: true }
)

const statusPageSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Lowercase, unique across all users: /status/<slug>. */
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: STATUS_PAGE_LIMITS.slugMax,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: STATUS_PAGE_LIMITS.titleMax,
    },
    description: {
      type: String,
      default: "",
      maxlength: STATUS_PAGE_LIMITS.descriptionMax,
    },
    /** Our own versioned logo route (uploads only), or null. */
    logoUrl: { type: String, default: null },
    /** In display order. */
    monitors: { type: [pageMonitorSchema], default: [] },
    showResponseTimes: { type: Boolean, default: false },
    /** Show each monitor's URL under its name. Off: URLs never leave the server. */
    showUrls: { type: Boolean, default: false },
    /** false = only the owner can see it (preview). */
    isPublic: { type: Boolean, default: false },
    theme: { type: String, enum: STATUS_PAGE_THEMES, default: "auto" },
    /** Newest first. */
    announcements: { type: [announcementSchema], default: [] },
  },
  { timestamps: true }
)

statusPageSchema.index({ slug: 1 }, { unique: true })
statusPageSchema.index({ userId: 1, createdAt: -1 })
// "Which pages show this monitor" when a monitor is deleted.
statusPageSchema.index({ "monitors.monitorId": 1 })

export type StatusPageDoc = InferSchemaType<typeof statusPageSchema>

export const StatusPage: Model<StatusPageDoc> =
  (mongoose.models.StatusPage as Model<StatusPageDoc> | undefined) ??
  mongoose.model<StatusPageDoc>("StatusPage", statusPageSchema)
