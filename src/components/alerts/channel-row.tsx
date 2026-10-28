"use client"

import { useState, useTransition } from "react"
import {
  EllipsisIcon,
  LockIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"

import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import {
  sendTestAlertAction,
  setAlertChannelEnabledAction,
} from "@/actions/alert-channels"
import { LoadingButton } from "@/components/common/loading-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import type { AlertChannelItem } from "@/lib/alert-channels"

import { ChannelDialog } from "./channel-dialog"
import { ChannelIcon } from "./channel-icon"
import { DeleteChannelDialog } from "./delete-channel-dialog"

export function ChannelRow({
  channel,
  accountEmail,
  allowedByPlan,
}: {
  channel: AlertChannelItem
  accountEmail: string
  /** false: the user's plan doesn't deliver to this type (no alerts are sent). */
  allowedByPlan: boolean
}) {
  const [testing, startTest] = useTransition()
  const [toggling, startToggle] = useTransition()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const switchId = `channel-enabled-${channel.id}`

  function sendTest() {
    startTest(async () => {
      const result = await sendTestAlertAction(channel.id)
      if ("error" in result) {
        toast.error(`Test alert to ${channel.name} failed`, {
          description: result.error,
        })
      } else {
        toast.success(result.message ?? "Test alert sent")
      }
    })
  }

  function setEnabled(enabled: boolean) {
    startToggle(async () => {
      const result = await setAlertChannelEnabledAction(channel.id, enabled)
      if ("error" in result) toast.error(result.error)
    })
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <ChannelIcon type={channel.type} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "truncate font-medium",
              !channel.enabled && "text-muted-foreground"
            )}
          >
            {channel.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {CHANNEL_TYPE_LABELS[channel.type]} ·{" "}
            <span className="font-mono">{channel.maskedTarget}</span>
          </p>
          {!allowedByPlan && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-degraded">
              <LockIcon aria-hidden="true" className="size-3" />
              Needs the Pro plan: no alerts are sent here.
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <div className="mr-auto flex items-center gap-2 sm:mr-2">
          <Switch
            id={switchId}
            checked={channel.enabled && allowedByPlan}
            disabled={toggling || !allowedByPlan}
            onCheckedChange={setEnabled}
          />
          <label htmlFor={switchId} className="text-xs text-muted-foreground">
            {channel.enabled && allowedByPlan ? "On" : "Off"}
          </label>
        </div>
        <LoadingButton
          variant="outline"
          size="sm"
          loading={testing}
          disabled={!channel.enabled || !allowedByPlan}
          onClick={sendTest}
        >
          {!testing && <SendIcon aria-hidden="true" />}
          Send test alert
        </LoadingButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Actions for ${channel.name}`}
            >
              <EllipsisIcon aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <PencilIcon aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2Icon aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {editOpen && (
        <ChannelDialog
          channel={channel}
          accountEmail={accountEmail}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}
      <DeleteChannelDialog
        id={channel.id}
        name={channel.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </li>
  )
}
