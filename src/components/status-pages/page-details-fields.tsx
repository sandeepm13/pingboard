"use client"

import { useFormContext } from "react-hook-form"

import { STATUS_PAGE_THEMES } from "@shared/constants"
import { slugify, type StatusPageFormValues } from "@shared/schemas/status-page"
import type { StatusPageTheme } from "@shared/types"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Textarea } from "@/components/ui/textarea"

const THEME_LABELS: Record<StatusPageTheme, string> = {
  auto: "Match visitor's system",
  light: "Light",
  dark: "Dark",
}

/** Title, address, description and colour scheme. */
export function PageDetailsFields({
  host,
  autoSlug,
}: {
  /** "pingboard.app", shown in front of the slug. */
  host: string
  /** Fill the slug from the title until the user edits it (new pages). */
  autoSlug: boolean
}) {
  const form = useFormContext<StatusPageFormValues>()

  return (
    <div className="grid items-start gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input
                placeholder="Acme"
                {...field}
                onChange={(event) => {
                  field.onChange(event)
                  if (autoSlug && !form.getFieldState("slug").isDirty) {
                    form.setValue("slug", slugify(event.target.value))
                  }
                }}
              />
            </FormControl>
            <FormDescription>
              Shown at the top and in search results.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText className="font-mono text-xs">
                  {host}/status/
                </InputGroupText>
              </InputGroupAddon>
              <FormControl>
                <InputGroupInput
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="acme"
                  className="font-mono"
                  {...field}
                />
              </FormControl>
            </InputGroup>
            <FormDescription>
              Lowercase letters, numbers and dashes. Changing it breaks old
              links.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                rows={2}
                placeholder="Live status of the Acme website and API."
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="theme"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Theme</legend>
              {/* Native radios styled as tiles: arrow keys work as usual. */}
              <div className="grid gap-2 sm:grid-cols-3">
                {STATUS_PAGE_THEMES.map((theme) => (
                  <label
                    key={theme}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-checked:border-foreground has-checked:bg-secondary has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={theme}
                      checked={field.value === theme}
                      onChange={() => field.onChange(theme)}
                      className="sr-only"
                    />
                    {THEME_LABELS[theme]}
                  </label>
                ))}
              </div>
            </fieldset>
          </FormItem>
        )}
      />
    </div>
  )
}
