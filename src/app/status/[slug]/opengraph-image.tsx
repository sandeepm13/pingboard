import { ImageResponse } from "next/og"

import { OVERALL_STATUS_LABELS, type OverallStatus } from "@shared/status-page"
import { getPublicStatusSummary, parseSlug } from "@/lib/public-status"

// Share preview for /status/<slug>: page title + current overall status.
// Rendered to PNG by Satori, which can't read CSS variables, so the colours
// are literal values matching the dark theme tokens.

export const alt = "Current status"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BG = "#0b0c0e"
const FG = "#f4f5f7"
const MUTED = "#9ca0a8"

const STATUS_COLORS: Record<OverallStatus, string> = {
  operational: "#3fb950",
  degraded: "#e3b341",
  partial: "#e3b341",
  major: "#f85149",
  unknown: "#8b949e",
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const slug = parseSlug((await params).slug)
  const summary = slug ? await getPublicStatusSummary(slug) : null
  const overall = summary?.overall ?? "unknown"
  const color = STATUS_COLORS[overall]
  const title = summary?.title ?? "Status page"

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: BG,
        color: FG,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 32, color: MUTED }}>Status</div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            // Long titles wrap to two lines at most.
            display: "block",
            lineClamp: 2,
          }}
        >
          {title}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "28px 36px",
          borderRadius: 24,
          border: `2px solid ${color}55`,
          background: `${color}1f`,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            background: color,
          }}
        />
        <div style={{ fontSize: 48, fontWeight: 600 }}>
          {summary ? OVERALL_STATUS_LABELS[overall] : "Not found"}
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
        {slug ? `/status/${slug}` : ""}
      </div>
    </div>,
    size
  )
}
