import type { Types } from "mongoose"

import { Incident, type IncidentDoc } from "./models/incident"
import type { IncidentResolution } from "./types"

// Incident writes shared by the worker (recovery, reconcile) and the app
// (pausing a monitor or changing its URL ends its outage).

export type ClosedIncident = IncidentDoc & { _id: Types.ObjectId }

/**
 * Closes the monitor's open incident, if any. Race-safe: the update is
 * filtered on `open: true`, so of two concurrent closers only one gets the
 * incident back (and only that one sends the recovery alert).
 */
export async function closeOpenIncident(
  monitorId: Types.ObjectId | string,
  resolution: IncidentResolution,
  resolvedAt: Date
): Promise<ClosedIncident | null> {
  const open = await Incident.findOne({ monitorId, open: true })
    .select("startedAt")
    .lean()
  if (!open) return null
  // A check result older than the incident start can't end it (clock skew).
  const end = resolvedAt < open.startedAt ? open.startedAt : resolvedAt
  return Incident.findOneAndUpdate(
    { _id: open._id, open: true },
    {
      $set: {
        open: false,
        resolvedAt: end,
        resolution,
        durationSeconds: Math.round(
          (end.getTime() - open.startedAt.getTime()) / 1000
        ),
        nextReminderAt: null,
      },
    },
    { returnDocument: "after" }
  ).lean<ClosedIncident>()
}
