"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteAlertChannelAction } from "@/actions/alert-channels"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function DeleteChannelDialog({
  id,
  name,
  open,
  onOpenChange,
}: {
  id: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await deleteAlertChannelAction(id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      onOpenChange(false)
      toast.success(`Deleted ${name}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this channel?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{name}</span> will
            stop getting alerts, and monitors that picked it will no longer use
            it. The alert history keeps its name.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <LoadingButton
            variant="destructive"
            loading={pending}
            onClick={confirm}
          >
            Delete channel
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
