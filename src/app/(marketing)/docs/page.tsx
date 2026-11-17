import type { Metadata } from "next"
import Link from "next/link"

import { DEFAULT_FAILURE_THRESHOLD } from "@shared/constants"
import { PLAN_LIMITS } from "@shared/plans"
import {
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

const HREF = "/docs"

export const metadata: Metadata = pageMetadata({
  title: docPage(HREF).title,
  description: docPage(HREF).description,
  path: HREF,
})

const { free, pro } = PLAN_LIMITS

export default function Page() {
  return (
    <>
      <DocHeader href={HREF} />

      <H2 id="quick-start">Quick start</H2>
      <List ordered>
        <li>
          <Link href="/signup" className="text-foreground underline">
            Create an account
          </Link>{" "}
          with your email and a password, or with Google or GitHub.
        </li>
        <li>
          Paste the URL you care about most. PingBoard saves it as your first
          monitor and checks it right away.
        </li>
        <li>
          Open <strong className="text-foreground">Alerts</strong>, add your
          email (or Discord, Slack or Telegram on Pro) and press{" "}
          <strong className="text-foreground">Send test alert</strong>.
        </li>
        <li>
          Optional: publish a{" "}
          <Link href="/docs/status-pages" className="text-foreground underline">
            status page
          </Link>{" "}
          so your users can see what&apos;s up without asking you.
        </li>
      </List>

      <H2 id="what-happens">What happens next</H2>
      <P>
        Every monitor is checked on its own schedule from our servers. Each
        check stores up or down, the HTTP status code, the response time and,
        when it fails, a plain-word reason such as “Timeout after 10s” or
        “Unexpected status 503”.
      </P>
      <List>
        <li>
          After {DEFAULT_FAILURE_THRESHOLD} failed checks in a row the monitor
          is <strong className="text-foreground">down</strong>: an incident
          opens and you get one alert.
        </li>
        <li>
          The first successful check closes the incident and sends a recovery
          alert with the downtime.
        </li>
        <li>
          A check that succeeds but takes longer than 2 seconds is{" "}
          <strong className="text-foreground">degraded</strong>. It still counts
          as up.
        </li>
      </List>
      <Note>
        One failed check is not an outage: networks blip. Waiting for a second
        failure keeps alerts meaningful.
      </Note>

      <H2 id="plans">Plans</H2>
      <FieldTable
        head={["", "Free · Pro"]}
        rows={[
          ["Monitors", `${free.maxMonitors} · ${pro.maxMonitors}`],
          [
            "Shortest interval",
            `${free.minIntervalMinutes} minutes · ${pro.minIntervalMinutes} minute`,
          ],
          ["Alert channels", "Email · Email, Discord, Slack, Telegram"],
          ["Status pages", `${free.maxStatusPages} · ${pro.maxStatusPages}`],
        ]}
      />
      <P>
        Pro isn&apos;t on sale yet; see{" "}
        <Link href="/pricing" className="text-foreground underline">
          pricing
        </Link>
        .
      </P>
      <DocPager href={HREF} />
    </>
  )
}
