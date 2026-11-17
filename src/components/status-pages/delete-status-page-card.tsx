"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { deleteStatusPageAction } from "@/actions/status-pages"
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

export function DeleteStatusPageCard({
  id,
  title,
  slug,
}: {
  id: string
  title: string
  slug: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await deleteStatusPageAction(id)
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      setOpen(false)
      toast.success(`Deleted ${title}`)
      router.push("/app/status-pages")
    })
  }

  return (
    <section
      aria-labelledby="delete-page-heading"
      className="space-y-3 rounded-xl border border-destructive/30 p-4 sm:p-5"
    >
      <h2 id="delete-page-heading" className="text-sm font-semibold">
        Delete page
      </h2>
      <p className="text-sm text-muted-foreground">
        The link and badge stop working. Your monitors aren&apos;t affected.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete status page
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this status page?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{title}</span> (
              <span className="font-mono">/status/{slug}</span>) will stop
              working for everyone. This can&apos;t be undone.
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
              Delete page
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
