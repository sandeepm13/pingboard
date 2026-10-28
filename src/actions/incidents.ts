"use server"

import { revalidatePath } from "next/cache"

import { Incident } from "@shared/models/incident"
import { incidentNotesSchema } from "@shared/schemas/alert-channel"
import { objectIdSchema } from "@shared/schemas/common"
import { requireUser } from "@/lib/auth/require-user"
import { connectDb } from "@/lib/db"

// requireUser() → Zod → queries scoped by { _id, userId }.

export type IncidentActionResult = { ok: true } | { error: string }

const NOT_FOUND = { error: "Incident not found." } as const

function revalidateIncident(id: string) {
  revalidatePath(`/app/incidents/${id}`)
  revalidatePath("/app/incidents")
}

/** "I'm on it": stops the "still down" reminders for this outage. */
export async function acknowledgeIncidentAction(
  id: unknown
): Promise<IncidentActionResult> {
  const user = await requireUser()
  const parsed = objectIdSchema.safeParse(id)
  if (!parsed.success) return NOT_FOUND
  await connectDb()
  const filter = { _id: parsed.data, userId: user.id }
  const update = await Incident.updateOne(
    { ...filter, open: true, acknowledgedAt: null },
    { $set: { acknowledgedAt: new Date(), nextReminderAt: null } }
  )
  if (update.matchedCount === 0) {
    const incident = await Incident.findOne(filter).select("open").lean()
    if (!incident) return NOT_FOUND
    // Already acknowledged or resolved meanwhile: nothing left to do.
  }
  revalidateIncident(parsed.data)
  return { ok: true }
}

export async function saveIncidentNotesAction(
  id: unknown,
  notes: unknown
): Promise<IncidentActionResult> {
  const user = await requireUser()
  const parsedId = objectIdSchema.safeParse(id)
  if (!parsedId.success) return NOT_FOUND
  const parsedNotes = incidentNotesSchema.safeParse(notes)
  if (!parsedNotes.success) {
    return { error: parsedNotes.error.issues[0]?.message ?? "Invalid notes." }
  }
  await connectDb()
  const update = await Incident.updateOne(
    { _id: parsedId.data, userId: user.id },
    { $set: { notes: parsedNotes.data } }
  )
  if (update.matchedCount === 0) return NOT_FOUND
  revalidateIncident(parsedId.data)
  return { ok: true }
}
