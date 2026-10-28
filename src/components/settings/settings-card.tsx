import { cn } from "cn"

/** One settings section: heading, help text, content. */
export function SettingsCard({
  id,
  title,
  description,
  children,
  tone = "default",
}: {
  id: string
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  tone?: "default" | "danger"
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn(
        "rounded-xl border bg-card",
        tone === "danger" && "border-destructive/40"
      )}
    >
      <div className="border-b p-4 sm:px-5">
        <h2
          id={`${id}-heading`}
          className={cn(
            "text-lg font-semibold",
            tone === "danger" && "text-destructive"
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
