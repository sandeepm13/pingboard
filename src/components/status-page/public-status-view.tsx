import Link from "next/link"
import { cn } from "cn"

import { LogoMark } from "@/components/brand/logo"
import { ThemeScope } from "@/components/common/theme-scope"
import type { PublicView } from "@/lib/public-status"

import { PublicAnnouncements } from "./public-announcements"
import { PublicIncidents } from "./public-incidents"
import { PublicServiceRow } from "./public-service-row"
import { StatusBanner } from "./status-banner"

/**
 * A public status page. Receives only the whitelisted PublicView (see
 * shared/status-page.ts), so nothing private can reach the markup.
 */
export function PublicStatusView({
  view,
  className,
}: {
  view: PublicView
  className?: string
}) {
  return (
    <ThemeScope theme={view.theme} className={cn("flex flex-col", className)}>
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-center gap-3 sm:gap-4">
          {view.logoUrl && (
            // Our own logo route: already small, typed and cached; no optimiser needed.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.logoUrl}
              alt=""
              className="size-12 shrink-0 rounded-lg object-contain sm:size-14"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">
              {view.title}
            </h1>
            {view.description && (
              <p className="mt-1 text-sm break-words whitespace-pre-line text-muted-foreground">
                {view.description}
              </p>
            )}
          </div>
        </header>

        <StatusBanner overall={view.overall} generatedAt={view.generatedAt} />
        <PublicAnnouncements announcements={view.announcements} />

        <section aria-labelledby="services" className="space-y-3">
          <h2 id="services" className="text-lg font-semibold">
            Services
          </h2>
          {view.services.length === 0 ? (
            <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No services listed yet.
            </p>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {view.services.map((service) => (
                <PublicServiceRow key={service.key} service={service} />
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Daily bars are UTC days. Other times are in your time zone.
          </p>
        </section>

        <PublicIncidents incidents={view.incidents} />
      </div>

      {view.branding && (
        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 hover:text-foreground"
          >
            <LogoMark className="size-4" />
            Powered by PingBoard
          </Link>
        </footer>
      )}
    </ThemeScope>
  )
}
