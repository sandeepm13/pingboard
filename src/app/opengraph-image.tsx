import { ImageResponse } from "next/og"

import { SITE_OG_IMAGE } from "@/lib/site"

// Default share preview, linked from every marketing page by pageMetadata()
// (status pages have their own). Satori can't read CSS variables, so colours
// are literal values that match the dark theme tokens.

export const alt = SITE_OG_IMAGE.alt
export const size = { width: SITE_OG_IMAGE.width, height: SITE_OG_IMAGE.height }
export const contentType = "image/png"

const BG = "#0b0c0e"
const CARD = "#131417"
const BORDER = "#25272c"
const FG = "#f4f5f7"
const MUTED = "#9ca0a8"
const UP = "#3fb950"
const DOWN = "#f85149"

const ROWS = [
  { name: "Marketing site", status: "Up", color: UP, detail: "200 · 142 ms" },
  { name: "Public API", status: "Up", color: UP, detail: "200 · 88 ms" },
  { name: "Checkout", status: "Down", color: DOWN, detail: "503 · 2 checks" },
]

export default function Image() {
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
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg viewBox="0 0 32 32" width="56" height="56" fill="none">
          <rect width="32" height="32" rx="8" fill={FG} />
          <path
            d="M5 17h4.5l2.5-6.5 4 12 3-9 1.5 3.5H22"
            stroke={BG}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="25.5" cy="17" r="2.5" fill={UP} />
        </svg>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
          PingBoard
        </div>
      </div>

      <div style={{ display: "flex", gap: 56, alignItems: "flex-end" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
            }}
          >
            Know your site is down before your users do.
          </div>
          <div style={{ fontSize: 28, color: MUTED }}>
            Uptime checks every minute · alerts by email, Discord, Slack and
            Telegram
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 400,
            borderRadius: 20,
            border: `2px solid ${BORDER}`,
            background: CARD,
          }}
        >
          {ROWS.map((row, index) => (
            <div
              key={row.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "22px 26px",
                borderTop: index === 0 ? "none" : `2px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: row.color,
                }}
              />
              <div
                style={{ display: "flex", flexDirection: "column", flex: 1 }}
              >
                <div style={{ fontSize: 24, fontWeight: 600 }}>{row.name}</div>
                <div style={{ fontSize: 20, color: MUTED }}>{row.detail}</div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: row.color }}>
                {row.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    size
  )
}
