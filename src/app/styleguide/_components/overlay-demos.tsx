"use client"

import { useEffect, useState } from "react"
import {
  ActivityIcon,
  BellIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { FAKE_MONITORS } from "../_data"
import { DemoLabel } from "./section"

export function OverlayDemos() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-wrap items-start gap-2 rounded-xl border bg-card p-5">
        <DemoLabel>
          Dialog · Sheet · DropdownMenu · Popover · Tooltip · Toast
        </DemoLabel>
        <div className="flex w-full flex-wrap gap-2">
          <DeleteDialogDemo />
          <SheetDemo />
          <RowMenuDemo />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 text-sm">
              <p className="font-medium">Expected status codes</p>
              <p className="mt-1 text-muted-foreground">
                Default <span className="font-mono">200–299</span>. Add ranges
                like <span className="font-mono">200-299, 301</span>.
              </p>
            </PopoverContent>
          </Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Tooltip</Button>
            </TooltipTrigger>
            <TooltipContent>Checked 32 seconds ago</TooltipContent>
          </Tooltip>
          <Button
            variant="secondary"
            onClick={() =>
              toast.error("Checkout is down", {
                description: "503 Service Unavailable · 2 failed checks",
              })
            }
          >
            Toast
          </Button>
        </div>
      </div>
      <CommandDemo />
    </div>
  )
}

function DeleteDialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2Icon /> Delete monitor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “Checkout”?</DialogTitle>
          <DialogDescription>
            This removes the monitor and its check history. This can’t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant="destructive"
              onClick={() => toast.success("Monitor deleted")}
            >
              Delete
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SheetDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Check details</SheetTitle>
          <SheetDescription>GET https://api.acme.dev/health</SheetDescription>
        </SheetHeader>
        <dl className="grid grid-cols-2 gap-y-2 px-4 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-mono">200</dd>
          <dt className="text-muted-foreground">Response</dt>
          <dd className="font-mono text-degraded">1.18 s</dd>
          <dt className="text-muted-foreground">Checked</dt>
          <dd className="font-mono">14:32:07 UTC</dd>
        </dl>
      </SheetContent>
    </Sheet>
  )
}

function RowMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Monitor actions">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <PencilIcon /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem>
          <PauseIcon /> Pause
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CopyIcon /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2Icon /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Lives in a dialog: an inline cmdk list scrolls its first item into view on
// mount, which jumps the whole page.
function CommandDemo() {
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function pick(name: string) {
    setPicked(name)
    setOpen(false)
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <DemoLabel>Command · quick switcher</DemoLabel>
      <Button
        variant="outline"
        className="w-full justify-between text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <SearchIcon /> Jump to a monitor…
        </span>
        <kbd className="rounded border bg-muted px-1.5 font-mono text-[0.7rem]">
          Ctrl K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Quick switcher"
        description="Search monitors and settings"
      >
        <Command>
          <CommandInput placeholder="Jump to a monitor…" />
          <CommandList>
            <CommandEmpty>No monitors found.</CommandEmpty>
            <CommandGroup heading="Monitors">
              {FAKE_MONITORS.map((monitor) => (
                <CommandItem
                  key={monitor.id}
                  onSelect={() => pick(monitor.name)}
                >
                  <ActivityIcon /> {monitor.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Settings">
              <CommandItem onSelect={() => pick("Alert channels")}>
                <BellIcon /> Alert channels
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
        {picked ? `Selected: ${picked}` : "Type to filter, Enter to select."}
      </p>
    </div>
  )
}
