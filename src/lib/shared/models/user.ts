import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { ALERT_REMINDER_MINUTES, OAUTH_PROVIDERS, PLANS } from "../constants"

const linkedAccountSchema = new Schema(
  {
    provider: { type: String, enum: OAUTH_PROVIDERS, required: true },
    providerAccountId: { type: String, required: true },
  },
  { _id: false }
)

/** First URL captured during onboarding; turned into a real monitor in Stage 3. */
const draftMonitorSchema = new Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    /** Set when a provider (or, from Stage 6, an email link) proves ownership. */
    emailVerified: { type: Date, default: null },
    /** null for OAuth-only accounts. Never selected unless asked for. */
    passwordHash: { type: String, default: null, select: false },
    image: { type: String, default: null },
    plan: { type: String, enum: PLANS, default: "free", required: true },
    timezone: { type: String, default: "UTC" },
    accounts: { type: [linkedAccountSchema], default: [] },
    onboardedAt: { type: Date, default: null },
    draftMonitor: { type: draftMonitorSchema, default: null },
    /** Bumped on password change; sessions carrying an older value are rejected. */
    sessionVersion: { type: Number, default: 0 },
    /** "Still down" reminder interval while an incident is open; 0 = off. */
    alertReminderMinutes: {
      type: Number,
      enum: ALERT_REMINDER_MINUTES,
      default: 0,
    },
  },
  { timestamps: true }
)

userSchema.index(
  { "accounts.provider": 1, "accounts.providerAccountId": 1 },
  {
    unique: true,
    partialFilterExpression: { "accounts.provider": { $exists: true } },
  }
)

export type UserDoc = InferSchemaType<typeof userSchema>

// Reuse the compiled model across Next.js hot reloads.
export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc> | undefined) ??
  mongoose.model<UserDoc>("User", userSchema)
