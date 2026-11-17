import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import { STATUS_PAGE_LIMITS } from "../constants"

// Uploaded status page logos, kept out of StatusPage so loading a page never
// pulls the image bytes. One per page; replaced on re-upload.

const statusPageLogoSchema = new Schema(
  {
    statusPageId: {
      type: Schema.Types.ObjectId,
      ref: "StatusPage",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    /** Sniffed from the bytes, never taken from the upload. PNG, JPEG or WebP. */
    contentType: { type: String, required: true },
    data: {
      type: Buffer,
      required: true,
      validate: {
        // A Buffer on save; in update validators Mongoose has already cast
        // it to a BSON Binary, whose length is a method.
        validator: (value: Buffer | { length(): number }) =>
          (typeof value.length === "function"
            ? value.length()
            : value.length) <= STATUS_PAGE_LIMITS.logoMaxBytes,
        message: "Logo is too large",
      },
    },
    /** First 16 hex chars of the SHA-256: the cache-busting version in logoUrl. */
    hash: { type: String, required: true },
  },
  { timestamps: true }
)

statusPageLogoSchema.index({ statusPageId: 1 }, { unique: true })

export type StatusPageLogoDoc = InferSchemaType<typeof statusPageLogoSchema>

export const StatusPageLogo: Model<StatusPageLogoDoc> =
  (mongoose.models.StatusPageLogo as Model<StatusPageLogoDoc> | undefined) ??
  mongoose.model<StatusPageLogoDoc>("StatusPageLogo", statusPageLogoSchema)
