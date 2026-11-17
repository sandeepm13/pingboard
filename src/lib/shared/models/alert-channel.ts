import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { ALERT_CHANNEL_TYPES, ALERT_LIMITS } from "../constants"

// Where a user's alerts go. Secrets (webhook URLs, bot tokens) are encrypted
// with ENCRYPTION_KEY and never sent back to the browser in full.

const alertChannelSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ALERT_CHANNEL_TYPES, required: true },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ALERT_LIMITS.channelNameMax,
    },
    enabled: { type: Boolean, default: true },
    /** email: the address (plain, it's shown to its owner). */
    email: { type: String, default: null },
    /** discord / slack: the webhook URL, encrypted. */
    webhookUrl: { type: String, default: null },
    /** telegram: the bot token, encrypted. */
    botToken: { type: String, default: null },
    /** telegram: numeric chat id or @channel username (not secret on its own). */
    chatId: { type: String, default: null },
    /** Non-secret hint shown in the UI, e.g. "discord.com/…/webhooks/1234…". */
    maskedTarget: { type: String, required: true },
  },
  { timestamps: true }
)

alertChannelSchema.index({ userId: 1, createdAt: 1 })

export type AlertChannelDoc = InferSchemaType<typeof alertChannelSchema>

export const AlertChannel: Model<AlertChannelDoc> =
  (mongoose.models.AlertChannel as Model<AlertChannelDoc> | undefined) ??
  mongoose.model<AlertChannelDoc>("AlertChannel", alertChannelSchema)
