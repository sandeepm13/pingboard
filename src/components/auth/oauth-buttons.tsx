"use client"

import { useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"

import type { OAuthProvider } from "@shared/types"
import { oauthSignInAction } from "@/actions/auth"
import { LoadingButton } from "@/components/common/loading-button"

import { GitHubIcon, GoogleIcon } from "./provider-icons"

const PROVIDERS = {
  google: { label: "Google", Icon: GoogleIcon },
  github: { label: "GitHub", Icon: GitHubIcon },
} as const

export function OAuthButtons({ providers }: { providers: OAuthProvider[] }) {
  const callbackUrl = useSearchParams().get("callbackUrl") ?? undefined
  const [active, setActive] = useState<OAuthProvider | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="grid gap-2">
      {providers.map((provider) => {
        const { label, Icon } = PROVIDERS[provider]
        const loading = pending && active === provider
        return (
          <LoadingButton
            key={provider}
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={pending}
            onClick={() => {
              setActive(provider)
              startTransition(() => oauthSignInAction(provider, callbackUrl))
            }}
          >
            {!loading && <Icon className="size-4" />}
            Continue with {label}
          </LoadingButton>
        )
      })}
    </div>
  )
}
