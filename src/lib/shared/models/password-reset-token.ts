import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

const passwordResetTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  /** SHA-256 of the token in the link; the raw token is never stored. */
  tokenHash: { type: String, required: true, unique: true },
  /** TTL index removes the document once this time passes. */
  expiresAt: { type: Date, required: true, expires: 0 },
})

export type PasswordResetTokenDoc = InferSchemaType<
  typeof passwordResetTokenSchema
>

export const PasswordResetToken: Model<PasswordResetTokenDoc> =
  (mongoose.models.PasswordResetToken as
    Model<PasswordResetTokenDoc> | undefined) ??
  mongoose.model<PasswordResetTokenDoc>(
    "PasswordResetToken",
    passwordResetTokenSchema
  )
