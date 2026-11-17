"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { deleteMonitorAction } from "@/actions/monitors"
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

export function DeleteMonitorDialog({
  id,
  name,
  open,
  onOpenChange,
  onDeleted,
}: {
  id: string
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}) {
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await deleteMonitorAction(id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      onOpenChange(false)
      toast.success(`Deleted ${name}`)
      onDeleted?.()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this monitor?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{name}</span> and its
            check history will be permanently deleted. This can&apos;t be
            undone.
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
            Delete monitor
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
