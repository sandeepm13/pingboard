"use client"

import { CHANNEL_TYPE_LABELS } from "@shared/alerts/events"
import { ALERT_CHANNEL_TYPES } from "@shared/constants"
import type { AlertChannelType } from "@shared/types"

import { ChannelIcon } from "./channel-icon"

/**
 * Native radios styled as tiles: arrow keys and screen readers work as usual.
 * Types outside the user's plan stay visible but disabled, marked "Pro".
 */
export function ChannelTypePicker({
  value,
  onChange,
  allowedTypes,
}: {
  value: AlertChannelType
  onChange: (type: AlertChannelType) => void
  allowedTypes: readonly AlertChannelType[]
}) {
  const someBlocked = allowedTypes.length < ALERT_CHANNEL_TYPES.length
  return (
    <fieldset aria-describedby={someBlocked ? "channel-plan-note" : undefined}>
      <legend className="mb-2 text-sm font-medium">Type</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ALERT_CHANNEL_TYPES.map((type) => {
          const allowed = allowedTypes.includes(type)
          return (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/50 has-checked:border-foreground has-checked:bg-secondary has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:bg-transparent"
            >
              <input
                type="radio"
                name="channel-type"
                value={type}
                checked={value === type}
                disabled={!allowed}
                onChange={() => onChange(type)}
                className="sr-only"
              />
              <ChannelIcon type={type} />
              {CHANNEL_TYPE_LABELS[type]}
              {!allowed && (
                <span className="ml-auto rounded border px-1 text-[0.65rem] font-medium text-muted-foreground uppercase">
                  Pro
                </span>
              )}
            </label>
          )
        })}
      </div>
      {someBlocked && (
        <p
          id="channel-plan-note"
          className="mt-2 text-xs text-muted-foreground"
        >
          Discord, Slack and Telegram alerts are part of the Pro plan.
        </p>
      )}
    </fieldset>
  )
}
