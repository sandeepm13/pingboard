"use client"

import { useTransition } from "react"
import { BellOffIcon } from "lucide-react"
import { toast } from "sonner"

import { acknowledgeIncidentAction } from "@/actions/incidents"
import { LoadingButton } from "@/components/common/loading-button"

export function AcknowledgeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  function acknowledge() {
    startTransition(async () => {
      const result = await acknowledgeIncidentAction(id)
      if ("error" in result) toast.error(result.error)
      else
        toast.success("Incident acknowledged", {
          description: "Reminders for this outage are off.",
        })
    })
  }

  return (
    <LoadingButton loading={pending} onClick={acknowledge}>
      {!pending && <BellOffIcon aria-hidden="true" />}
      Acknowledge
    </LoadingButton>
  )
}
