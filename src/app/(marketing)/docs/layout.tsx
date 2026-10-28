import { DocsNav } from "@/components/docs/docs-nav"

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-12 md:py-16">
      <aside className="md:sticky md:top-20 md:self-start">
        <DocsNav />
      </aside>
      <article className="max-w-2xl min-w-0">{children}</article>
    </div>
  )
}
