import { ImageResponse } from "next/og"

// Home-screen icon (iOS ignores SVG favicons). Same mark as icon.svg, with
// literal colours because Satori can't read CSS variables.

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#f5f6f8",
      }}
    >
      <svg viewBox="0 0 32 32" width="180" height="180" fill="none">
        <path
          d="M5 17h4.5l2.5-6.5 4 12 3-9 1.5 3.5H22"
          stroke="#0b0c0e"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25.5" cy="17" r="2.5" fill="#22c55e" />
      </svg>
    </div>,
    size
  )
}
