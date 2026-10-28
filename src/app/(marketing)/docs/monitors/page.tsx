import type { Metadata } from "next"

import {
  CHECK_INTERVALS_MINUTES,
  CHECK_MAX_REDIRECTS,
  DEFAULT_EXPECTED_STATUS_CODES,
  DEFAULT_FAILURE_THRESHOLD,
} from "@shared/constants"
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

const HREF = "/docs/monitors"

export const metadata: Metadata = pageMetadata({
  title: docPage(HREF).title,
  description: docPage(HREF).description,
  path: HREF,
})

export default function Page() {
  return (
    <>
      <DocHeader href={HREF} />

      <H2 id="add">Add a monitor</H2>
      <P>
        In the app, press{" "}
        <strong className="text-foreground">New monitor</strong>. Only the URL
        is required; the name fills in from the hostname. Press{" "}
        <strong className="text-foreground">Test now</strong> to run one check
        from our server before saving — nothing is stored.
      </P>

      <H2 id="basic">Basic settings</H2>
      <FieldTable
        rows={[
          [
            "URL",
            <>
              A public <Code>http://</Code> or <Code>https://</Code> address. A
              bare host like <Code>example.com/health</Code> is saved as https.
            </>,
          ],
          ["Name", "Shown in the dashboard and in alerts."],
          [
            "Check every",
            `${CHECK_INTERVALS_MINUTES.join(", ")} minutes. Free starts at ${PLAN_LIMITS.free.minIntervalMinutes}, Pro at ${PLAN_LIMITS.pro.minIntervalMinutes}.`,
          ],
          ["Tags", "Comma-separated, for filtering the dashboard."],
        ]}
      />

      <H2 id="advanced">Advanced settings</H2>
      <FieldTable
        rows={[
          [
            "Method",
            <>
              <Code>GET</Code>, <Code>POST</Code> or <Code>HEAD</Code>.
            </>,
          ],
          [
            "Timeout",
            "How long to wait for a response (3–30 s, default 10 s).",
          ],
          [
            "Expected status codes",
            <>
              Codes and ranges that mean “up”, e.g.{" "}
              <Code>{DEFAULT_EXPECTED_STATUS_CODES}</Code> (default),{" "}
              <Code>200-299, 301</Code> or <Code>2xx, 401</Code>.
            </>,
          ],
          [
            "Keyword",
            "Text that must appear in the response (case-insensitive, first 1 MB). Not available with HEAD.",
          ],
          [
            "Headers",
            "Sent with every check, e.g. an Authorization token. Values are encrypted and never shown again; leave a value blank when editing to keep it.",
          ],
          ["Body", "Sent with POST only."],
          [
            "Follow redirects",
            `Up to ${CHECK_MAX_REDIRECTS} hops; each one is checked like the original URL. Your headers aren't sent to a different site after a redirect.`,
          ],
        ]}
      />

      <H2 id="statuses">Statuses</H2>
      <FieldTable
        head={["Status", "Meaning"]}
        rows={[
          [
            "Up",
            "The last check got an expected status code (and the keyword).",
          ],
          ["Degraded", "Up, but slower than 2 seconds."],
          [
            "Down",
            `${DEFAULT_FAILURE_THRESHOLD} failed checks in a row. One success brings it back up.`,
          ],
          [
            "Pending",
            "Just created or resumed; the first check is on its way.",
          ],
          ["Paused", "Not checked until you resume it."],
        ]}
      />

      <H2 id="failures">What counts as a failed check</H2>
      <List>
        <li>No response in time (“Timeout after 10s”)</li>
        <li>DNS, connection or SSL errors</li>
        <li>
          A status code outside the expected ones (“Unexpected status 503”)
        </li>
        <li>The keyword is missing (“Keyword not found”)</li>
      </List>

      <H2 id="manage">Pause, edit, delete</H2>
      <P>
        Pausing stops checks and closes an ongoing incident without a recovery
        alert. Changing the URL starts the monitor fresh. Deleting removes the
        monitor with its checks, history and incidents.
      </P>
      <Note>
        PingBoard only checks public addresses. Private, internal and
        cloud-metadata addresses are refused — also when a public hostname
        resolves to one, or a redirect points to one.
      </Note>
      <DocPager href={HREF} />
    </>
  )
}
