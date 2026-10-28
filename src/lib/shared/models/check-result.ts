import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose"

import {
  CHECK_RESULT_RETENTION_DAYS,
  CHECK_STATUSES,
  DEFAULT_CHECK_REGION,
} from "../constants"

const checkResultSchema = new Schema(
  {
    monitorId: { type: Schema.Types.ObjectId, ref: "Monitor", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    checkedAt: { type: Date, required: true, default: Date.now },
    /** up | degraded (up but slow) | down. */
    status: { type: String, enum: CHECK_STATUSES, required: true },
    /** true for "up" and "degraded"; what uptime % counts. */
    isUp: { type: Boolean, required: true },
    statusCode: { type: Number, default: null },
    responseTimeMs: { type: Number, default: null },
    errorMessage: { type: String, default: null },
    region: { type: String, default: DEFAULT_CHECK_REGION },
  },
  { versionKey: false }
)

checkResultSchema.index({ monitorId: 1, checkedAt: -1 })
// Raw results expire; DailyStat keeps the long-term history.
checkResultSchema.index(
  { checkedAt: 1 },
  { expireAfterSeconds: CHECK_RESULT_RETENTION_DAYS * 24 * 60 * 60 }
)

export type CheckResultDoc = InferSchemaType<typeof checkResultSchema>

export const CheckResult: Model<CheckResultDoc> =
  (mongoose.models.CheckResult as Model<CheckResultDoc> | undefined) ??
  mongoose.model<CheckResultDoc>("CheckResult", checkResultSchema)
