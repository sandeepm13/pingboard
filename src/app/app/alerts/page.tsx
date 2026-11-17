import { Suspense } from "react"
import type { Metadata } from "next"
import { BellIcon } from "lucide-react"

import { ALERT_LIMITS } from "@shared/constants"
import { planLimits } from "@shared/plans"
import { safeTimeZone } from "@shared/time"
import { AddChannelButton } from "@/components/alerts/add-channel-button"
import { AlertLogCard } from "@/components/alerts/alert-log-card"
import { ChannelRow } from "@/components/alerts/channel-row"
import { ReminderSettings } from "@/components/alerts/reminder-settings"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { TimeZoneProvider } from "@/components/common/time-zone"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getReminderMinutes,
  listAlertChannels,
  listRecentAlerts,
} from "@/lib/alert-channels"
import { requireUser } from "@/lib/auth/require-user"

export const metadata: Metadata = { title: "Alerts" }

export default function Page() {
  return (
    <>
      <PageHeader
        title="Alerts"
        description="Where PingBoard tells you when something breaks, and when it's fixed."
      />
      <Suspense fallback={<AlertsSkeleton />}>
        <Alerts />
      </Suspense>
    </>
  )
}

async function Alerts() {
  const user = await requireUser()
  const [channels, recent, reminderMinutes] = await Promise.all([
    listAlertChannels(user.id),
    listRecentAlerts(user.id),
    getReminderMinutes(user.id),
  ])
  const atLimit = channels.length >= ALERT_LIMITS.channelsMax
  const { alertChannelTypes } = planLimits(user.plan)

  return (
    <TimeZoneProvider timeZone={safeTimeZone(user.timezone)}>
      <div className="space-y-6">
        <section
          aria-labelledby="channels-heading"
          className="rounded-xl border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:px-5">
            <div>
              <h2 id="channels-heading" className="text-lg font-semibold">
                Channels
              </h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {channels.length} / {ALERT_LIMITS.channelsMax}
                </span>{" "}
                · monitors alert all channels unless you pick some in the
                monitor’s settings.
              </p>
            </div>
            {channels.length > 0 && (
              <AddChannelButton
                accountEmail={user.email}
                allowedTypes={alertChannelTypes}
                disabled={atLimit}
                variant="outline"
              />
            )}
          </div>
          {channels.length === 0 ? (
            <EmptyState
              icon={BellIcon}
              title="No alert channels yet"
              description={
                alertChannelTypes.length > 1
                  ? "Add your email, a Discord or Slack webhook, or a Telegram bot to hear about outages the moment they start."
                  : "Add your email to hear about outages the moment they start. Discord, Slack and Telegram come with Pro."
              }
              action={
                <AddChannelButton
                  accountEmail={user.email}
                  allowedTypes={alertChannelTypes}
                />
              }
              className="m-4 border-none sm:m-5"
            />
          ) : (
            <ul className="divide-y">
              {channels.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  accountEmail={user.email}
                  allowedByPlan={alertChannelTypes.includes(channel.type)}
                />
              ))}
            </ul>
          )}
        </section>
        <ReminderSettings value={reminderMinutes} />
        <AlertLogCard rows={recent} />
      </div>
    </TimeZoneProvider>
  )
}

function AlertsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}
