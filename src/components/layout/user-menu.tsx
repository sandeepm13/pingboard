"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Loader2Icon, LogOutIcon, SettingsIcon } from "lucide-react"

import { logoutAction } from "@/actions/auth"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type MenuUser = {
  name: string
  email: string
  image: string | null
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

export function UserMenu({ user }: { user: MenuUser }) {
  const [loggingOut, startLogout] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Named by sr-only text, not aria-label: an aria-label without the
            visible initials fails WCAG 2.5.3 (label in name). */}
        <Button variant="ghost" size="icon" className="rounded-full">
          <span className="sr-only">Account menu for {user.name}</span>
          {user.image ? (
            // OAuth avatars come from many hosts; a plain img avoids
            // configuring next/image remote patterns for each provider.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              referrerPolicy="no-referrer"
              className="size-7 rounded-full border object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full border bg-muted text-xs font-medium"
            >
              {initials(user.name)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/settings">
            <SettingsIcon /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={loggingOut}
          onSelect={(event) => {
            event.preventDefault()
            startLogout(() => logoutAction())
          }}
        >
          {loggingOut ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <LogOutIcon />
          )}
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
