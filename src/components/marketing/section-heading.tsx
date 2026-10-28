import { cn } from "cn"

/** Eyebrow + h2 + intro for a landing-page section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  className,
}: {
  /** id of the h2, for the section's aria-labelledby. */
  id: string
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("mx-auto max-w-2xl text-center", className)}>
      {eyebrow && (
        <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-base text-pretty text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  )
}
