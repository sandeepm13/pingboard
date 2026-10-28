import type { Metadata } from "next"
import Link from "next/link"

import { STATUS_PAGE_LIMITS } from "@shared/constants"
import { PLAN_LIMITS } from "@shared/plans"
import {
  Code,
  DocHeader,
  DocPager,
  FieldTable,
  H2,
  List,
  Note,
  P,
} from "@/components/docs/prose"
import { docPage } from "@/lib/docs"
import { pageMetadata } from "@/lib/site"

const HREF = "/docs/status-pages"

export const metadata: Metadata = pageMetadata({
  title: docPage(HREF).title,
  description: docPage(HREF).description,
  path: HREF,
})

const b = (text: string) => <strong className="text-foreground">{text}</strong>

export default function Page() {
  return (
    <>
      <DocHeader href={HREF} />
      <P>
        A status page is a public page at <Code>/status/your-name</Code> that
        tells your users whether your services work, without them having to ask.
        See the{" "}
        <Link href="/demo" className="text-foreground underline">
          live demo
        </Link>
        .
      </P>

      <H2 id="create">Create one</H2>
      <List ordered>
        <li>
          In the app, open {b("Status pages")} → {b("New status page")}.
        </li>
        <li>
          Pick a title and an address (letters, digits and dashes,{" "}
          {STATUS_PAGE_LIMITS.slugMin}–{STATUS_PAGE_LIMITS.slugMax} characters).
        </li>
        <li>
          Choose the monitors to show, their order and the name visitors see —
          “Checkout” instead of “prod-checkout-eu-1”.
        </li>
        <li>
          Check the {b("Preview")}, then switch {b("Public")} on and save.
        </li>
      </List>
      <Note>
        New pages are private until you publish them. Free includes{" "}
        {PLAN_LIMITS.free.maxStatusPages} page, Pro{" "}
        {PLAN_LIMITS.pro.maxStatusPages} without the “Powered by PingBoard”
        footer.
      </Note>

      <H2 id="what-visitors-see">What visitors see</H2>
      <List>
        <li>
          An overall banner: operational, degraded, partial or major outage
        </li>
        <li>Each service with its status and a 90-day uptime bar</li>
        <li>
          Incidents of the last {STATUS_PAGE_LIMITS.incidentDays} days, with
          duration
        </li>
        <li>
          Your announcements (up to {STATUS_PAGE_LIMITS.announcementsMax})
        </li>
      </List>
      <P>
        Never shown: monitor URLs (unless you turn {b("Show monitored URLs")}{" "}
        on), request headers and bodies, status codes and error messages. The
        page updates within a minute of a change.
      </P>

      <H2 id="options">Options</H2>
      <FieldTable
        head={["Option", "What it does"]}
        rows={[
          ["Theme", "Auto (follows the visitor's system), light or dark."],
          [
            "Logo",
            `PNG, JPEG or WebP, up to ${STATUS_PAGE_LIMITS.logoMaxBytes / 1024} KB.`,
          ],
          [
            "Show response times",
            "Adds a 24-hour response-time chart per service.",
          ],
          [
            "Show monitored URLs",
            "Lists each monitor's URL under its name. Off by default.",
          ],
          [
            "Announcements",
            `Plain-text notes at the top, e.g. planned maintenance (max ${STATUS_PAGE_LIMITS.announcementMax} characters).`,
          ],
        ]}
      />
      <DocPager href={HREF} />
    </>
  )
}
