import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { PLANS } from "../constants"

/** "Join waitlist" on the pricing page, until billing exists. Email only. */
const waitlistEntrySchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    plan: { type: String, enum: PLANS, default: "pro", required: true },
  },
  { timestamps: true }
)

export type WaitlistEntryDoc = InferSchemaType<typeof waitlistEntrySchema>

export const WaitlistEntry: Model<WaitlistEntryDoc> =
  (mongoose.models.WaitlistEntry as Model<WaitlistEntryDoc> | undefined) ??
  mongoose.model<WaitlistEntryDoc>("WaitlistEntry", waitlistEntrySchema)
