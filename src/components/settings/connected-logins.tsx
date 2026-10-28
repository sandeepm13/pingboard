"use client"

import { useTransition } from "react"
import { KeyRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { OAUTH_PROVIDERS } from "@shared/constants"
import type { OAuthProvider } from "@shared/types"
import {
  connectProviderAction,
  disconnectProviderAction,
} from "@/actions/account"
import { GitHubIcon, GoogleIcon } from "@/components/auth/provider-icons"
import { LoadingButton } from "@/components/common/loading-button"

const PROVIDERS = {
  google: { label: "Google", Icon: GoogleIcon },
  github: { label: "GitHub", Icon: GitHubIcon },
} as const

/** Ways to log in: password + each OAuth provider configured on the server. */
export function ConnectedLogins({
  hasPassword,
  linked,
  available,
}: {
  hasPassword: boolean
  linked: OAuthProvider[]
  available: OAuthProvider[]
}) {
  const loginCount = linked.length + (hasPassword ? 1 : 0)
  // Linked providers stay listed even if the server's keys were removed.
  const shown = OAUTH_PROVIDERS.filter(
    (provider) => available.includes(provider) || linked.includes(provider)
  )

  return (
    <ul className="divide-y rounded-lg border">
      <li className="flex items-center gap-3 px-3 py-3">
        <KeyRoundIcon aria-hidden="true" className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Email and password</p>
          <p className="text-xs text-muted-foreground">
            {hasPassword ? "Set" : "Not set — use the form above to add one"}
          </p>
        </div>
      </li>
      {shown.map((provider) => (
        <ProviderRow
          key={provider}
          provider={provider}
          connected={linked.includes(provider)}
          canConnect={available.includes(provider)}
          isLastLogin={loginCount <= 1}
        />
      ))}
      {shown.length === 0 && (
        <li className="px-3 py-3 text-sm text-muted-foreground">
          Google and GitHub login aren&apos;t set up on this server.
        </li>
      )}
    </ul>
  )
}

function ProviderRow({
  provider,
  connected,
  canConnect,
  isLastLogin,
}: {
  provider: OAuthProvider
  connected: boolean
  canConnect: boolean
  isLastLogin: boolean
}) {
  const [pending, startTransition] = useTransition()
  const { label, Icon } = PROVIDERS[provider]

  function connect() {
    // Redirects to the provider and back to Settings.
    startTransition(() => connectProviderAction(provider))
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectProviderAction(provider)
      if ("error" in result) toast.error(result.error)
      else toast.success(result.message ?? `${label} disconnected`)
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-3">
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {connected ? "Connected" : "Not connected"}
        </p>
      </div>
      {connected ? (
        <LoadingButton
          variant="outline"
          size="sm"
          loading={pending}
          disabled={isLastLogin}
          title={isLastLogin ? "Your only way to log in" : undefined}
          onClick={disconnect}
        >
          Disconnect
        </LoadingButton>
      ) : (
        canConnect && (
          <LoadingButton
            variant="outline"
            size="sm"
            loading={pending}
            onClick={connect}
          >
            Connect
          </LoadingButton>
        )
      )}
    </li>
  )
}
