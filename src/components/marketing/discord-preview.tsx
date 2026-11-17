import { cn } from "cn"

import type { AlertMessage, AlertTone } from "@shared/alerts/types"
import { LogoMark } from "@/components/brand/logo"

const TONE_BORDER: Record<AlertTone, string> = {
  down: "border-l-down",
  up: "border-l-up",
  warning: "border-l-degraded",
  info: "border-l-info",
}

/** A Discord channel with PingBoard's webhook messages (embed per message). */
export function DiscordPreview({ messages }: { messages: AlertMessage[] }) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card">
      <figcaption className="flex items-center gap-2 border-b px-4 py-2.5 text-sm">
        <span aria-hidden="true" className="font-mono text-muted-foreground">
          #
        </span>
        <span className="font-medium">alerts</span>
        <span className="ml-auto text-xs text-muted-foreground">Discord</span>
      </figcaption>
      <ol className="space-y-5 p-4">
        {messages.map((message) => (
          <li key={message.title} className="flex gap-3">
            <LogoMark className="mt-0.5 size-9 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="font-semibold">PingBoard</span>
                <span className="rounded bg-info/20 px-1 text-[0.6rem] font-semibold text-info uppercase">
                  App
                </span>
              </p>
              <p className="mt-0.5 text-sm">{message.title}</p>
              <div
                className={cn(
                  "mt-2 rounded-md border border-l-4 bg-muted/40 p-3",
                  TONE_BORDER[message.tone]
                )}
              >
                <p className="text-sm font-semibold text-info">
                  {message.title}
                </p>
                <p className="mt-1 text-sm break-words text-muted-foreground">
                  {message.text}
                </p>
                <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                  {message.fields.map((field) => (
                    <div key={field.label} className="min-w-0">
                      <dt className="text-xs font-semibold">{field.label}</dt>
                      <dd className="mt-0.5 font-mono text-xs break-words text-muted-foreground">
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  )
}
