import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import {
  CHECK_INTERVALS_MINUTES,
  CHECK_TIMEOUT_MS,
  DEFAULT_CHECK_INTERVAL_MINUTES,
  HTTP_METHODS,
  MONITOR_LIMITS,
  MONITOR_STATUSES,
} from "../constants"

const headerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: MONITOR_LIMITS.headerNameMax,
    },
    /** Encrypted with ENCRYPTION_KEY (shared/security/secrets.ts). */
    value: { type: String, required: true },
  },
  { _id: false }
)

const statusRangeSchema = new Schema(
  {
    from: { type: Number, required: true, min: 100, max: 599 },
    to: { type: Number, required: true, min: 100, max: 599 },
  },
  { _id: false }
)

/** The first failed check of the current failure streak (cleared on success). */
const currentFailureSchema = new Schema(
  {
    startedAt: { type: Date, required: true },
    statusCode: { type: Number, default: null },
    errorMessage: { type: String, default: null },
  },
  { _id: false }
)

const monitorSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: MONITOR_LIMITS.nameMax,
    },
    url: { type: String, required: true, maxlength: MONITOR_LIMITS.urlMax },
    method: {
      type: String,
      enum: HTTP_METHODS,
      default: "GET",
      required: true,
    },
    intervalMinutes: {
      type: Number,
      required: true,
      default: DEFAULT_CHECK_INTERVAL_MINUTES,
      validate: {
        validator: (value: number) =>
          (CHECK_INTERVALS_MINUTES as readonly number[]).includes(value),
        message: "Invalid check interval",
      },
    },
    timeoutMs: {
      type: Number,
      required: true,
      default: CHECK_TIMEOUT_MS.default,
      min: CHECK_TIMEOUT_MS.min,
      max: CHECK_TIMEOUT_MS.max,
    },
    expectedStatusCodes: {
      type: [statusRangeSchema],
      default: () => [{ from: 200, to: 299 }],
    },
    headers: { type: [headerSchema], default: [] },
    /** Encrypted like header values; only sent for POST. */
    body: { type: String, default: null },
    /** Case-insensitive text that must appear in the response body. */
    keyword: {
      type: String,
      default: null,
      maxlength: MONITOR_LIMITS.keywordMax,
    },
    followRedirects: { type: Boolean, default: true },
    status: {
      type: String,
      enum: MONITOR_STATUSES,
      default: "pending",
      required: true,
    },
    lastCheckedAt: { type: Date, default: null },
    lastStatusCode: { type: Number, default: null },
    lastResponseTimeMs: { type: Number, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    currentFailure: { type: currentFailureSchema, default: null },
    /** Slow ("degraded") checks in a row; drives the opt-in degraded alert. */
    consecutiveSlow: { type: Number, default: 0 },
    /** true = every alert channel of the user, including ones added later. */
    alertAllChannels: { type: Boolean, default: true },
    /** Used when alertAllChannels is false. */
    alertChannelIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "AlertChannel" }],
      default: [],
    },
    /** Alert after DEGRADED_ALERT_STREAK slow checks in a row. */
    alertOnDegraded: { type: Boolean, default: false },
    sslExpiresAt: { type: Date, default: null },
    /** Last time the worker tried to read sslExpiresAt (at most daily). */
    sslCheckedAt: { type: Date, default: null },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
)

// Covers "all monitors of a user" (CLAUDE.md: Monitor {userId}) and its newest-first sort.
monitorSchema.index({ userId: 1, createdAt: -1 })

export type MonitorDoc = InferSchemaType<typeof monitorSchema>

export const Monitor: Model<MonitorDoc> =
  (mongoose.models.Monitor as Model<MonitorDoc> | undefined) ??
  mongoose.model<MonitorDoc>("Monitor", monitorSchema)
