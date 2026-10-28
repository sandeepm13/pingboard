import type { AlertMessage } from "@shared/alerts/types"
import { LogoMark } from "@/components/brand/logo"

/** An inbox view of PingBoard's alert email (subject = message title). */
export function EmailPreview({ message }: { message: AlertMessage }) {
  return (
    <figure className="overflow-hidden rounded-xl border bg-card">
      <figcaption className="space-y-1 border-b px-4 py-3 text-sm">
        <p className="flex items-center justify-between gap-2">
          <span className="font-medium">{message.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">Email</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          From PingBoard alerts · to you@acme.dev
        </p>
      </figcaption>
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-md rounded-lg border bg-background p-5">
          <LogoMark className="size-7" />
          <p className="mt-4 text-lg font-semibold text-down">
            {message.title}
          </p>
          <p className="mt-2 text-sm break-words text-muted-foreground">
            {message.text}
          </p>
          <table className="mt-4 w-full text-sm">
            <tbody className="divide-y">
              {message.fields.map((field) => (
                <tr key={field.label}>
                  <th
                    scope="row"
                    className="py-2 pr-4 text-left align-top font-medium whitespace-nowrap"
                  >
                    {field.label}
                  </th>
                  <td className="py-2 font-mono text-xs break-all text-muted-foreground">
                    {field.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <span className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            {message.linkLabel}
          </span>
        </div>
      </div>
    </figure>
  )
}
