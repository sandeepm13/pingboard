import type { Metadata } from "next"

import {
  Code,
  DocHeader,
  DocPager,
  FieldTable,
  H2,
  Note,
  P,
  Pre,
} from "@/components/docs/prose"
import { docPage } from "@/lib/docs"
import { absoluteUrl, pageMetadata } from "@/lib/site"

const HREF = "/docs/status-badge"

export const metadata: Metadata = pageMetadata({
  title: docPage(HREF).title,
  description: docPage(HREF).description,
  path: HREF,
})

export default function Page() {
  const badge = absoluteUrl("/api/badge/your-page.svg")
  const page = absoluteUrl("/status/your-page")
  return (
    <>
      <DocHeader href={HREF} />
      <P>
        Every published status page has a small SVG badge with its current
        overall status. Put it in a README, your docs or your site&apos;s
        footer; it links to the full status page.
      </P>

      <H2 id="url">Badge URL</H2>
      <Pre>{badge}</Pre>
      <P>
        Replace <Code>your-page</Code> with your status page address. The{" "}
        <strong className="text-foreground">Share</strong> card in the status
        page editor has a copy button with the Markdown filled in.
      </P>

      <H2 id="markdown">Markdown (GitHub README)</H2>
      <Pre>{`[![Status](${badge})](${page})`}</Pre>

      <H2 id="html">HTML</H2>
      <Pre>{`<a href="${page}">\n  <img src="${badge}" alt="Status" />\n</a>`}</Pre>

      <H2 id="states">What it shows</H2>
      <FieldTable
        head={["Badge", "When"]}
        rows={[
          ["up (green)", "Every service on the page is up."],
          ["degraded (amber)", "Something is slow, nothing is down."],
          ["partial outage (amber)", "Some services are down."],
          ["down (red)", "More than half of the services are down."],
          [
            "unknown (grey)",
            "No checks yet, all paused, or the page isn't public.",
          ],
        ]}
      />
      <Note>
        The badge is cached for 30 seconds. GitHub caches images through its own
        proxy, so a README badge can lag a few minutes behind.
      </Note>
      <DocPager href={HREF} />
    </>
  )
}
