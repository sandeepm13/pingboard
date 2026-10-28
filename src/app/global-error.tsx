"use client"

import { useEffect } from "react"

import "./globals.css"

// Replaces the root layout when it fails, so no providers or theme class:
// the "auto" theme scope follows the visitor's system colour scheme.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <title>Something went wrong · PingBoard</title>
        <main
          data-theme-scope="auto"
          className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-4 text-center font-sans text-foreground"
        >
          <h1 className="text-xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            PingBoard couldn&apos;t load this page. It&apos;s on our side, not
            yours; try again in a moment.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => retry()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Try again
            </button>
            {/* A full page load on purpose: the app shell itself failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Go to the home page
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
