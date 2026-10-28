import { BADGE_MESSAGES, type OverallStatus } from "@shared/status-page"

// Shields-style "status | up" SVG for READMEs. It's a standalone image file
// (GitHub proxies it), so it can't use the app's CSS tokens: the hex colours
// below are the badge's own palette, close to the dark-theme status colours.

const COLORS: Record<OverallStatus, string> = {
  operational: "#2ea043",
  degraded: "#d29922",
  partial: "#d29922",
  major: "#da3633",
  unknown: "#6e7681",
}

const LABEL_BG = "#555"

// Approximate Verdana 11px advance widths; textLength pins the final width,
// so a slightly wrong estimate only squeezes or stretches the text a little.
const NARROW = new Set("fijlrt.,:;!| ")
const WIDE = new Set("mwMW")

function textWidth(text: string): number {
  let width = 0
  for (const char of text) {
    if (NARROW.has(char)) width += 4
    else if (WIDE.has(char)) width += 10
    else if (char >= "A" && char <= "Z") width += 7.5
    else width += 6.6
  }
  return Math.round(width)
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function renderBadge(overall: OverallStatus, label = "status"): string {
  const message = BADGE_MESSAGES[overall]
  const pad = 6
  const labelText = textWidth(label)
  const messageText = textWidth(message)
  const labelWidth = labelText + pad * 2
  const messageWidth = messageText + pad * 2
  const width = labelWidth + messageWidth
  const title = escapeXml(`${label}: ${message}`)
  const l = escapeXml(label)
  const m = escapeXml(message)
  // Coordinates ×10 with scale(.1), as shields.io does, for crisp text.
  const lx = (labelWidth / 2) * 10
  const mx = (labelWidth + messageWidth / 2) * 10

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${title}"><title>${title}</title><linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient><clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath><g clip-path="url(#r)"><rect width="${labelWidth}" height="20" fill="${LABEL_BG}"/><rect x="${labelWidth}" width="${messageWidth}" height="20" fill="${COLORS[overall]}"/><rect width="${width}" height="20" fill="url(#s)"/></g><g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110"><text aria-hidden="true" x="${lx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelText * 10}">${l}</text><text x="${lx}" y="140" transform="scale(.1)" textLength="${labelText * 10}">${l}</text><text aria-hidden="true" x="${mx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${messageText * 10}">${m}</text><text x="${mx}" y="140" transform="scale(.1)" textLength="${messageText * 10}">${m}</text></g></svg>`
}
