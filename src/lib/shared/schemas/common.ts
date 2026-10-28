import { z } from "zod"

import {
  CHECK_INTERVALS_MINUTES,
  HTTP_METHODS,
  MONITOR_STATUSES,
} from "../constants"

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id")

export const monitorStatusSchema = z.enum(MONITOR_STATUSES)

export const httpMethodSchema = z.enum(HTTP_METHODS)

export const checkIntervalSchema = z.literal(CHECK_INTERVALS_MINUTES, {
  error: "Pick a check interval",
})
