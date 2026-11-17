import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { planLimits } from "@shared/plans"
import { currentZoneName } from "@shared/time"
import { ReminderSettings } from "@/components/alerts/reminder-settings"
import { PageHeader } from "@/components/common/page-header"
import { ConnectedLogins } from "@/components/settings/connected-logins"
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog"
import { LinkResultNotice } from "@/components/settings/link-result-notice"
import { PasswordForm } from "@/components/settings/password-form"
import { ProfileForm } from "@/components/settings/profile-form"
import { SettingsCard } from "@/components/settings/settings-card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getAccountSettings } from "@/lib/account"
import { requireUser } from "@/lib/auth/require-user"
import { listTimeZones } from "@/lib/time-zones"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile and account." />
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </>
  )
}

async function Settings() {
  const user = await requireUser()
  const settings = await getAccountSettings(user.id)
  if (!settings) return null
  const limits = planLimits(user.plan)

  return (
    <div className="max-w-3xl space-y-6">
      <LinkResultNotice />
      <SettingsCard id="profile" title="Profile">
        <ProfileForm
          name={settings.name}
          email={settings.email}
          emailVerified={settings.emailVerified}
          timezone={currentZoneName(settings.timezone)}
          timeZones={listTimeZones()}
        />
      </SettingsCard>

      <SettingsCard
        id="password"
        title={settings.hasPassword ? "Password" : "Set a password"}
        description={
          settings.hasPassword
            ? "Changing it signs you out on every other device."
            : "You log in with Google or GitHub. Add a password to also log in with your email."
        }
      >
        <PasswordForm hasPassword={settings.hasPassword} />
      </SettingsCard>

      <SettingsCard
        id="logins"
        title="Connected logins"
        description="Ways to log in to this account. You always keep at least one."
      >
        <ConnectedLogins
          hasPassword={settings.hasPassword}
          linked={settings.linked}
          available={settings.available}
        />
      </SettingsCard>

      <ReminderSettings value={settings.reminderMinutes} />

      <SettingsCard
        id="plan"
        title="Plan"
        description={`${limits.label}: ${limits.maxMonitors} monitors, checks every ${limits.minIntervalMinutes} min or slower, ${limits.maxStatusPages} status page${limits.maxStatusPages === 1 ? "" : "s"}.`}
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/alerts">
              Alert channels
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pricing">Compare plans</Link>
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        id="danger"
        title="Delete account"
        tone="danger"
        description="Deletes your monitors and their scheduled checks, check results and history, incidents, alert channels and log, and status pages. You are signed out."
      >
        <DeleteAccountDialog
          email={settings.email}
          hasPassword={settings.hasPassword}
        />
      </SettingsCard>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-80 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
