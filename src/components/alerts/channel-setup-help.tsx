import type { AlertChannelType } from "@shared/types"

// Step-by-step setup notes shown inside the "Add channel" dialog.

const STEPS: Record<
  AlertChannelType,
  { summary: string; steps: React.ReactNode[] }
> = {
  email: {
    summary: "Where do emails come from?",
    steps: [
      "Alerts are sent from the address configured on the server (EMAIL_FROM).",
      "Add the sender to your contacts so alerts don't land in spam.",
    ],
  },
  discord: {
    summary: "How do I get a Discord webhook URL?",
    steps: [
      "In Discord, open the server and hover the channel that should get alerts.",
      <>
        Click the gear (<b>Edit Channel</b>) → <b>Integrations</b> →{" "}
        <b>Webhooks</b> → <b>New Webhook</b>.
      </>,
      'Name it (e.g. "PingBoard"), then click Copy Webhook URL.',
      <>
        Paste it here. It looks like{" "}
        <code className="font-mono text-xs break-all">
          https://discord.com/api/webhooks/123…/abc…
        </code>
      </>,
    ],
  },
  slack: {
    summary: "How do I get a Slack webhook URL?",
    steps: [
      <>
        Go to <b>api.slack.com/apps</b> → <b>Create New App</b> → From scratch,
        and pick your workspace.
      </>,
      <>
        Open <b>Incoming Webhooks</b>, switch it on, then{" "}
        <b>Add New Webhook to Workspace</b> and choose the channel.
      </>,
      <>
        Copy the URL. It looks like{" "}
        <code className="font-mono text-xs break-all">
          https://hooks.slack.com/services/T…/B…/…
        </code>
      </>,
    ],
  },
  telegram: {
    summary: "How do I set up a Telegram bot?",
    steps: [
      <>
        In Telegram, message <b>@BotFather</b>, send{" "}
        <code className="font-mono">/newbot</code> and follow the prompts. Copy
        the token it gives you (
        <code className="font-mono text-xs">123456:ABC…</code>).
      </>,
      "Open a chat with your new bot and press Start (or add the bot to a group).",
      <>
        Get the chat id: open{" "}
        <code className="font-mono text-xs break-all">
          https://api.telegram.org/bot&lt;token&gt;/getUpdates
        </code>{" "}
        in a browser after sending the bot a message and copy{" "}
        <code className="font-mono text-xs">chat.id</code> (group ids start with
        −100).
      </>,
      "Paste the token and chat id here, then send a test alert.",
    ],
  },
}

export function ChannelSetupHelp({ type }: { type: AlertChannelType }) {
  const help = STEPS[type]
  return (
    <details className="group rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-medium marker:text-muted-foreground">
        {help.summary}
      </summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
        {help.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
    </details>
  )
}
