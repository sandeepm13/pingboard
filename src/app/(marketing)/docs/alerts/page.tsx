import type { Metadata } from "next"

import {
  DEFAULT_FAILURE_THRESHOLD,
  DEGRADED_ALERT_STREAK,
  SSL_ALERT_DAYS,
} from "@shared/constants"
import {
  Code,
  DocHeader,
  DocPager,
  H2,
  H3,
  List,
  Note,
  P,
} from "@/components/docs/prose"
import { docPage } from "@/lib/docs"
import { pageMetadata } from "@/lib/site"

const HREF = "/docs/alerts"

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

      <H2 id="when">When PingBoard alerts</H2>
      <List>
        <li>
          {b("Down")} — after {DEFAULT_FAILURE_THRESHOLD} failed checks in a
          row. One alert per outage, never one per check.
        </li>
        <li>{b("Recovered")} — on the first good check, with the downtime.</li>
        <li>
          {b("SSL")} — when an https certificate has{" "}
          {SSL_ALERT_DAYS.join(" and ")} days left.
        </li>
        <li>
          {b("Slow")} (opt-in per monitor) — after {DEGRADED_ALERT_STREAK} slow
          checks in a row.
        </li>
      </List>
      <P>
        Add channels under {b("Alerts")} in the app. Every monitor alerts all
        your channels unless you pick some in its settings. After adding one,
        press {b("Send test alert")} to check it works.
      </P>

      <H2 id="email">Email</H2>
      <P>
        Enter any address; your account email is filled in. Alerts come with a
        button to the incident. Add the sender to your contacts so they
        don&apos;t land in spam. Email is included in every plan.
      </P>

      <H2 id="discord">Discord</H2>
      <List ordered>
        <li>Open your server and hover the channel that should get alerts.</li>
        <li>
          Click the gear ({b("Edit Channel")}) → {b("Integrations")} →{" "}
          {b("Webhooks")} → {b("New Webhook")}.
        </li>
        <li>Name it (e.g. “PingBoard”) and press {b("Copy Webhook URL")}.</li>
        <li>
          Paste it into PingBoard. It looks like{" "}
          <Code>https://discord.com/api/webhooks/123…/abc…</Code>
        </li>
      </List>

      <H2 id="slack">Slack</H2>
      <List ordered>
        <li>
          Go to <Code>api.slack.com/apps</Code> → {b("Create New App")} → From
          scratch, and pick your workspace.
        </li>
        <li>
          Open {b("Incoming Webhooks")}, switch it on, then{" "}
          {b("Add New Webhook to Workspace")} and choose the channel.
        </li>
        <li>
          Copy the URL (<Code>https://hooks.slack.com/services/T…/B…/…</Code>)
          and paste it into PingBoard.
        </li>
      </List>

      <H2 id="telegram">Telegram</H2>
      <P>Alerts come from your own bot, so only you control the chat.</P>
      <List ordered>
        <li>
          Message <b>@BotFather</b>, send <Code>/newbot</Code> and follow the
          prompts. Copy the token (<Code>123456:ABC…</Code>).
        </li>
        <li>
          Open a chat with the bot and press {b("Start")}, or add it to a group
          and send a message there.
        </li>
        <li>
          Open <Code>https://api.telegram.org/bot&lt;token&gt;/getUpdates</Code>{" "}
          in a browser and copy <Code>chat.id</Code> (group ids start with
          −100).
        </li>
        <li>Paste the token and chat id into PingBoard.</li>
      </List>
      <Note>
        Discord, Slack and Telegram are part of the Pro plan. Webhook URLs and
        bot tokens are encrypted and never shown again after saving; PingBoard
        only ever sends them to discord.com, hooks.slack.com and
        api.telegram.org.
      </Note>

      <H2 id="reminders">Reminders and acknowledging</H2>
      <P>
        Under {b("Alerts")} → “Still down” reminders (or in Settings), choose to
        repeat the down alert every 30 or 60 minutes while an outage lasts.
        Reminders stop as soon as someone presses {b("Acknowledge")} on the
        incident.
      </P>
      <H3>Choosing channels per monitor</H3>
      <P>
        In a monitor&apos;s settings, turn off {b("Alert all channels")} to pick
        specific ones — for example, the payments API pages your phone via
        Telegram while the blog only emails you.
      </P>
      <DocPager href={HREF} />
    </>
  )
}
