"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { useFieldArray, useFormContext } from "react-hook-form"

import { MONITOR_LIMITS } from "@shared/constants"
import type { MonitorFormValues } from "@shared/schemas/monitor"
import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"

export function HeadersField() {
  const form = useFormContext<MonitorFormValues>()
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "headers",
  })

  return (
    <fieldset className="grid gap-2 sm:col-span-2">
      <legend className="mb-1 text-sm font-medium">
        Request headers{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </legend>
      <p className="text-sm text-muted-foreground">
        Stored encrypted. Saved values are never shown again; leave one blank to
        keep it.
      </p>

      {fields.map((item, index) => {
        const kept = item.keepExisting === true
        return (
          <div key={item.id} className="flex items-start gap-2">
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name={`headers.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`Header ${index + 1} name`}
                        placeholder="Authorization"
                        className="font-mono"
                        readOnly={kept}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`headers.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        aria-label={`Header ${index + 1} value`}
                        placeholder={
                          kept ? "•••••• saved (type to replace)" : "Bearer …"
                        }
                        autoComplete="off"
                        spellCheck={false}
                        className="font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove header ${index + 1}`}
              onClick={() => remove(index)}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </div>
        )
      })}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MONITOR_LIMITS.headersMax}
          onClick={() => append({ name: "", value: "" })}
        >
          <PlusIcon aria-hidden="true" />
          Add header
        </Button>
      </div>
    </fieldset>
  )
}
