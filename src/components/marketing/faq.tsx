import { ChevronDownIcon } from "lucide-react"

import { SectionHeading } from "./section-heading"

export type FaqItem = { question: string; answer: string }

/**
 * Native <details>: keyboard and screen-reader support without JavaScript.
 * Also emits FAQPage structured data for search engines.
 */
export function Faq({
  items,
  title = "Questions, answered.",
}: {
  items: FaqItem[]
  title?: string
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  }

  return (
    <section
      aria-labelledby="faq-heading"
      className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24"
    >
      <SectionHeading id="faq-heading" eyebrow="FAQ" title={title} />
      <div className="mt-10 divide-y rounded-xl border bg-card">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-4 font-medium select-none hover:bg-muted/40 sm:px-5 [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-5">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
      <script
        type="application/ld+json"
        // Our own static strings; "<" is escaped so the JSON can't close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  )
}
