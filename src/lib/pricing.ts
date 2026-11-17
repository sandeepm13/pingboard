import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { UPTIME_HISTORY_DAYS } from "@shared/constants"
import { PLAN_LIMITS, type PlanLimits } from "@shared/plans"
import type { Plan } from "@shared/types"

// What the pricing page says about each plan. Limits come from PLAN_LIMITS so
// the page can't promise something the server doesn't enforce.

/** Placeholder prices: billing isn't built yet (see PROGRESS.md). */
export const PLAN_PRICES: Record<Plan, { amount: string; period: string }> = {
  free: { amount: "$0", period: "forever" },
  pro: { amount: "$9", period: "per month" },
}

export const PLAN_TAGLINES: Record<Plan, string> = {
  free: "For side projects and your first production site.",
  pro: "For startups and small teams that can't afford to miss a minute.",
}

function channels(limits: PlanLimits): string {
  const names = limits.alertChannelTypes.map(
    (type) => CHANNEL_TYPE_LABELS[type]
  )
  if (names.length === 1) return `${names[0]} alerts`
  return `${names.slice(0, -1).join(", ")} & ${names.at(-1)} alerts`
}

function every(minutes: number): string {
  return minutes === 1
    ? "Checks every minute"
    : `Checks every ${minutes} minutes`
}

export function planFeatures(plan: Plan): string[] {
  const limits = PLAN_LIMITS[plan]
  const pages = limits.maxStatusPages
  return [
    `${limits.maxMonitors} monitors`,
    every(limits.minIntervalMinutes),
    channels(limits),
    `${pages} public status page${pages === 1 ? "" : "s"}${limits.statusPageBranding ? "" : ", no PingBoard branding"}`,
    "SSL expiry warnings",
    `${UPTIME_HISTORY_DAYS}-day uptime history`,
  ]
}

export type ComparisonRow = {
  label: string
  values: Record<Plan, string | boolean>
}

export function comparisonRows(): ComparisonRow[] {
  const { free, pro } = PLAN_LIMITS
  const has = (limits: PlanLimits, type: "discord" | "slack" | "telegram") =>
    limits.alertChannelTypes.includes(type)
  return [
    {
      label: "Monitors",
      values: { free: String(free.maxMonitors), pro: String(pro.maxMonitors) },
    },
    {
      label: "Shortest check interval",
      values: {
        free: `${free.minIntervalMinutes} min`,
        pro: `${pro.minIntervalMinutes} min`,
      },
    },
    { label: "Email alerts", values: { free: true, pro: true } },
    {
      label: "Discord alerts",
      values: { free: has(free, "discord"), pro: has(pro, "discord") },
    },
    {
      label: "Slack alerts",
      values: { free: has(free, "slack"), pro: has(pro, "slack") },
    },
    {
      label: "Telegram alerts",
      values: { free: has(free, "telegram"), pro: has(pro, "telegram") },
    },
    {
      label: "Public status pages",
      values: {
        free: String(free.maxStatusPages),
        pro: String(pro.maxStatusPages),
      },
    },
    {
      label: "Remove “Powered by PingBoard”",
      values: { free: !free.statusPageBranding, pro: !pro.statusPageBranding },
    },
    { label: "SSL expiry warnings", values: { free: true, pro: true } },
    { label: "Status badge", values: { free: true, pro: true } },
    {
      label: "History",
      values: {
        free: `${UPTIME_HISTORY_DAYS} days`,
        pro: `${UPTIME_HISTORY_DAYS} days`,
      },
    },
  ]
}
