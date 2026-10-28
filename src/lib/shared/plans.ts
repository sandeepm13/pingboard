import { ALERT_CHANNEL_TYPES } from "./constants"
import type { AlertChannelType, CheckIntervalMinutes, Plan } from "./types"

// The single source of truth for what each plan allows. Enforced on the server
// (create/update/resume) and mirrored in the UI (disabled intervals, counters,
// the pricing page).

export type PlanLimits = {
  label: string
  maxMonitors: number
  minIntervalMinutes: CheckIntervalMinutes
  maxStatusPages: number
  /** "Powered by PingBoard" in the status page footer. */
  statusPageBranding: boolean
  /** Alert channel types the plan can add, enable, test and receive. */
  alertChannelTypes: readonly AlertChannelType[]
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    label: "Free",
    maxMonitors: 10,
    minIntervalMinutes: 5,
    maxStatusPages: 1,
    statusPageBranding: true,
    alertChannelTypes: ["email"],
  },
  pro: {
    label: "Pro",
    maxMonitors: 50,
    minIntervalMinutes: 1,
    maxStatusPages: 5,
    statusPageBranding: false,
    alertChannelTypes: ALERT_CHANNEL_TYPES,
  },
}

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan]
}

export function isIntervalAllowed(plan: Plan, minutes: number): boolean {
  return minutes >= PLAN_LIMITS[plan].minIntervalMinutes
}

export function isChannelTypeAllowed(
  plan: Plan,
  type: AlertChannelType
): boolean {
  return PLAN_LIMITS[plan].alertChannelTypes.includes(type)
}
