import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon, InfoIcon } from "lucide-react"
import { cn } from "cn"

import { docNeighbours, docPage } from "@/lib/docs"

// Building blocks for the /docs guides (no MDX: plain components, styled with
// the design tokens).

export function DocHeader({ href }: { href: string }) {
  const page = docPage(href)
  return (
    <header className="border-b pb-6">
      <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">
        Docs
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-3xl">
        {page.title}
      </h1>
      <p className="mt-2 text-muted-foreground">{page.description}</p>
    </header>
  )
}

export function H2({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="group mt-10 scroll-mt-20 text-lg font-semibold tracking-tight"
    >
      {children}
      <a
        href={`#${id}`}
        className="ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Link to this section"
      >
        #
      </a>
    </h2>
  )
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-medium">{children}</h3>
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border bg-muted/60 px-1 py-0.5 font-mono text-[0.8em] break-words text-foreground">
      {children}
    </code>
  )
}

export function Pre({ children }: { children: string }) {
  return (
    // Focusable so keyboard users can scroll long lines sideways.
    <pre
      tabIndex={0}
      className="mt-3 overflow-x-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <code>{children}</code>
    </pre>
  )
}

export function List({
  ordered = false,
  children,
}: {
  ordered?: boolean
  children: React.ReactNode
}) {
  const Tag = ordered ? "ol" : "ul"
  return (
    <Tag
      className={cn(
        "mt-3 space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-muted-foreground",
        ordered ? "list-decimal" : "list-disc"
      )}
    >
      {children}
    </Tag>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex gap-3 rounded-lg border bg-card p-3 text-sm text-muted-foreground">
      <InfoIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-info"
      />
      <div>{children}</div>
    </div>
  )
}

/** Two-column reference table (term → explanation). */
export function FieldTable({
  rows,
  head = ["Field", "What it does"],
}: {
  rows: [React.ReactNode, React.ReactNode][]
  head?: [string, string]
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {head[0]}
            </th>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {head[1]}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([term, text], index) => (
            <tr key={index}>
              <th
                scope="row"
                className="px-3 py-2 text-left align-top font-medium whitespace-nowrap"
              >
                {term}
              </th>
              <td className="px-3 py-2 text-muted-foreground">{text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DocPager({ href }: { href: string }) {
  const { previous, next } = docNeighbours(href)
  return (
    <nav
      aria-label="Previous and next guide"
      className="mt-12 grid gap-3 border-t pt-6 sm:grid-cols-2"
    >
      {previous ? (
        <Link
          href={previous.href}
          className="rounded-lg border p-3 text-sm hover:bg-muted/40"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeftIcon aria-hidden="true" className="size-3" /> Previous
          </span>
          <span className="mt-1 block font-medium">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={next.href}
          className="rounded-lg border p-3 text-right text-sm hover:bg-muted/40"
        >
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            Next <ArrowRightIcon aria-hidden="true" className="size-3" />
          </span>
          <span className="mt-1 block font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  )
}
