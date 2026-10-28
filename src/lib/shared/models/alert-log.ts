import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import {
  ALERT_CHANNEL_TYPES,
  ALERT_DELIVERY_STATUSES,
  ALERT_KINDS,
  ALERT_LOG_RETENTION_DAYS,
} from "../constants"
import { ALERT_TONES } from "../alerts/types"

// One alert to one channel. Created when the alert is queued, updated by each
// delivery attempt. `dedupeKey` (event + channel) makes delivery idempotent:
// a retried or duplicated event never sends the same alert twice.

const fieldSchema = new Schema(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
)

/** The rendered, channel-agnostic message (see shared/alerts/types.ts). */
const messageSchema = new Schema(
  {
    title: { type: String, required: true },
    text: { type: String, required: true },
    fields: { type: [fieldSchema], default: [] },
    url: { type: String, required: true },
    linkLabel: { type: String, required: true },
    tone: { type: String, enum: ALERT_TONES, required: true },
  },
  { _id: false }
)

const alertLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", default: null },
    incidentId: { type: Schema.Types.ObjectId, ref: "Incident", default: null },
    channelId: {
      type: Schema.Types.ObjectId,
      ref: "AlertChannel",
      required: true,
    },
    /** Snapshots, so the log still reads well after a channel is renamed or deleted. */
    channelType: { type: String, enum: ALERT_CHANNEL_TYPES, required: true },
    channelName: { type: String, required: true },
    kind: { type: String, enum: ALERT_KINDS, required: true },
    dedupeKey: { type: String, required: true },
    status: {
      type: String,
      enum: ALERT_DELIVERY_STATUSES,
      required: true,
      default: "queued",
    },
    attempts: { type: Number, default: 0 },
    /** Last delivery error, user-facing wording (never contains secrets). */
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
    message: { type: messageSchema, required: true },
  },
  { timestamps: true }
)

alertLogSchema.index({ dedupeKey: 1 }, { unique: true })
alertLogSchema.index({ userId: 1, createdAt: -1 })
alertLogSchema.index({ incidentId: 1, createdAt: 1 })
alertLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: ALERT_LOG_RETENTION_DAYS * 24 * 60 * 60 }
)

export type AlertLogDoc = InferSchemaType<typeof alertLogSchema>

export const AlertLog: Model<AlertLogDoc> =
  (mongoose.models.AlertLog as Model<AlertLogDoc> | undefined) ??
  mongoose.model<AlertLogDoc>("AlertLog", alertLogSchema)
