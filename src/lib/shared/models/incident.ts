import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { ALERT_LIMITS, INCIDENT_RESOLUTIONS } from "../constants"

// One outage of one monitor: opened when the monitor turns "down" (2 failed
// checks in a row), closed by the first successful check. At most one open
// incident per monitor, enforced by a unique partial index.

const causeSchema = new Schema(
  {
    statusCode: { type: Number, default: null },
    errorMessage: { type: String, default: null },
  },
  { _id: false }
)

const incidentSchema = new Schema(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** true until resolved; the unique index below is built on it. */
    open: { type: Boolean, required: true, default: true },
    /** Time of the first failed check of the outage. */
    startedAt: { type: Date, required: true },
    /** When the monitor was declared down (the failure that crossed the threshold). */
    confirmedAt: { type: Date, required: true },
    resolvedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    resolution: { type: String, enum: INCIDENT_RESOLUTIONS, default: null },
    /** The first failed check's result. */
    cause: { type: causeSchema, required: true },
    checksFailed: { type: Number, required: true, default: 0 },
    lastFailureAt: { type: Date, default: null },
    acknowledgedAt: { type: Date, default: null },
    notes: {
      type: String,
      default: "",
      maxlength: ALERT_LIMITS.incidentNotesMax,
    },
    /** Next "still down" reminder; null when reminders are off or acknowledged. */
    nextReminderAt: { type: Date, default: null },
    remindersSent: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Never two open incidents for one monitor, even if two checks race.
incidentSchema.index(
  { monitorId: 1 },
  {
    unique: true,
    partialFilterExpression: { open: true },
    name: "one_open_per_monitor",
  }
)
incidentSchema.index({ monitorId: 1, startedAt: -1 })
// The incidents page: a user's incidents, ongoing first, newest first.
incidentSchema.index({ userId: 1, open: -1, startedAt: -1 })
// The reminder tick.
incidentSchema.index(
  { nextReminderAt: 1 },
  { partialFilterExpression: { open: true } }
)

export type IncidentDoc = InferSchemaType<typeof incidentSchema>

export const Incident: Model<IncidentDoc> =
  (mongoose.models.Incident as Model<IncidentDoc> | undefined) ??
  mongoose.model<IncidentDoc>("Incident", incidentSchema)
