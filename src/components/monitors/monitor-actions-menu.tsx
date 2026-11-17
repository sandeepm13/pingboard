"use client"

import { useState } from "react"
import Link from "next/link"
import {
  EllipsisIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { DeleteMonitorDialog } from "./delete-monitor-dialog"
import { usePauseMonitor } from "./use-pause-monitor"

export function MonitorActionsMenu({
  id,
  name,
  paused,
}: {
  id: string
  name: string
  paused: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { setPaused, pending } = usePauseMonitor(id, name)

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${name}`}
            disabled={pending}
          >
            <EllipsisIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem asChild>
            <Link
              href={`/app/monitors/${id}/edit`}
              onNavigate={() => setMenuOpen(false)}
            >
              <PencilIcon aria-hidden="true" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPaused(!paused)}>
            {paused ? (
              <PlayIcon aria-hidden="true" />
            ) : (
              <PauseIcon aria-hidden="true" />
            )}
            {paused ? "Resume" : "Pause"}
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
      <DeleteMonitorDialog
        id={id}
        name={name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
