export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 border-t py-10 first:border-t-0 first:pt-0"
    >
      <h2 id={`${id}-title`} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function DemoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 font-mono text-xs text-muted-foreground">{children}</p>
  )
}
