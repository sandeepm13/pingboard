"use client"

import { useId, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/** Read-only value + copy button (status link, badge Markdown). */
export function CopyField({ label, value }: { label: string; value: string }) {
  const id = useId()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy. Select the text and copy it instead.")
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          readOnly
          value={value}
          onFocus={(event) => event.target.select()}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? (
            <CheckIcon aria-hidden="true" className="text-up" />
          ) : (
            <CopyIcon aria-hidden="true" />
          )}
        </Button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </p>
    </div>
  )
}
