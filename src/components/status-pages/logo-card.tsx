"use client"

import { useId, useRef, useState, useTransition } from "react"
import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import {
  removeStatusPageLogoAction,
  uploadStatusPageLogoAction,
} from "@/actions/status-pages"
import { LoadingButton } from "@/components/common/loading-button"

const MAX_KB = STATUS_PAGE_LIMITS.logoMaxBytes / 1024

export function LogoCard({
  id,
  logoUrl,
}: {
  id: string
  logoUrl: string | null
}) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, startUpload] = useTransition()
  const [removing, startRemove] = useTransition()

  function upload(file: File) {
    setError(null)
    // Checked again on the server, which also sniffs the real type.
    if (file.size > STATUS_PAGE_LIMITS.logoMaxBytes) {
      setError(`The logo can be at most ${MAX_KB} KB.`)
      return
    }
    const data = new FormData()
    data.set("logo", file)
    startUpload(async () => {
      const result = await uploadStatusPageLogoAction(id, data)
      if ("error" in result) setError(result.error)
      else toast.success("Logo uploaded")
      if (input.current) input.current.value = ""
    })
  }

  function remove() {
    startRemove(async () => {
      const result = await removeStatusPageLogoAction(id)
      if ("error" in result) toast.error(result.error)
    })
  }

  return (
    <section
      aria-labelledby="logo-heading"
      className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
    >
      <h2 id="logo-heading" className="text-sm font-semibold">
        Logo
      </h2>
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Current logo"
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          PNG, JPEG or WebP, up to {MAX_KB} KB. Square works best.
        </p>
      </div>
      <input
        ref={input}
        id={inputId}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        // Opened by the upload button; not a second tab stop.
        tabIndex={-1}
        aria-label="Logo image"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload(file)
        }}
      />
      <div className="flex flex-wrap gap-2">
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          disabled={removing}
          onClick={() => input.current?.click()}
        >
          {!uploading && <UploadIcon aria-hidden="true" />}
          {logoUrl ? "Replace logo" : "Upload logo"}
        </LoadingButton>
        {logoUrl && (
          <LoadingButton
            type="button"
            variant="ghost"
            size="sm"
            loading={removing}
            disabled={uploading}
            onClick={remove}
          >
            {!removing && <Trash2Icon aria-hidden="true" />}
            Remove
          </LoadingButton>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
