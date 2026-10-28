"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"

import type { AlertChannelType } from "@shared/types"
import { Button } from "@/components/ui/button"

import { ChannelDialog } from "./channel-dialog"

export function AddChannelButton({
  accountEmail,
  allowedTypes,
  disabled,
  variant = "default",
}: {
  accountEmail: string
  allowedTypes: readonly AlertChannelType[]
  disabled?: boolean
  variant?: "default" | "outline"
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant={variant}
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <PlusIcon aria-hidden="true" />
        Add channel
      </Button>
      {/* Mounted only while open, so every "Add" starts from a clean form. */}
      {open && (
        <ChannelDialog
          accountEmail={accountEmail}
          allowedTypes={allowedTypes}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
