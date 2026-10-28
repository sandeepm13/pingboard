import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

export type FormNotice = {
  type: "error" | "success" | "info"
  message: string
}

const ICONS = {
  error: CircleAlertIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
} as const

export function FormAlert({ notice }: { notice: FormNotice | null }) {
  if (!notice) return null
  const Icon = ICONS[notice.type]

  return (
    <Alert
      variant={notice.type === "error" ? "destructive" : "default"}
      role={notice.type === "error" ? "alert" : "status"}
      className={notice.type === "success" ? "border-up/30 text-up" : undefined}
    >
      <Icon aria-hidden="true" />
      <AlertDescription
        className={notice.type === "success" ? "text-up" : undefined}
      >
        {notice.message}
      </AlertDescription>
    </Alert>
  )
}
