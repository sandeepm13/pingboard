import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  degradedMessage,
  describeCause,
  downMessage,
  formatAlertTime,
  recoveredMessage,
  reminderMessage,
  sslMessage,
  zoneAbbreviation,
  type AlertContext,
  type AlertIncident,
} from "../src/lib/shared/alerts/format"
import { formatDuration } from "../src/lib/shared/time"

const monitor = {
  id: "m1",
  name: "Checkout API",
  url: "https://api.example.com/health",
}
// 10:42 IST = 05:12 UTC
const startedAt = new Date("2026-10-26T05:12:00Z")
const ctx: AlertContext = {
  appUrl: "https://pingboard.example",
  timeZone: "Asia/Kolkata",
  now: new Date("2026-10-26T05:20:00Z"),
}
const incident: AlertIncident = {
  id: "i1",
  startedAt,
  resolvedAt: null,
  durationSeconds: null,
  cause: { statusCode: 503, errorMessage: "Unexpected status 503" },
  checksFailed: 2,
}

describe("formatDuration", () => {
  it("uses at most two units", () => {
    assert.equal(formatDuration(0), "0s")
    assert.equal(formatDuration(45), "45s")
    assert.equal(formatDuration(432), "7m 12s")
    assert.equal(formatDuration(600), "10m")
    assert.equal(formatDuration(2 * 3600 + 5 * 60 + 9), "2h 5m")
    assert.equal(formatDuration(3 * 86_400 + 4 * 3600), "3d 4h")
    assert.equal(formatDuration(-5), "0s")
  })
})

describe("describeCause", () => {
  it("turns 'Unexpected status 503' into the status line", () => {
    assert.equal(describeCause(incident.cause), "503 Service Unavailable")
  })
  it("keeps other errors and adds the code", () => {
    assert.equal(
      describeCause({ statusCode: 200, errorMessage: "Keyword not found" }),
      "Keyword not found (200 OK)"
    )
  })
  it("uses the error when there was no response", () => {
    assert.equal(
      describeCause({ statusCode: null, errorMessage: "Timeout after 10s" }),
      "Timeout after 10s"
    )
    assert.equal(
      describeCause({ statusCode: null, errorMessage: null }),
      "Unknown error"
    )
  })
  it("handles unknown codes", () => {
    assert.equal(describeCause({ statusCode: 599, errorMessage: null }), "599")
  })
})

describe("time in the user's zone", () => {
  it("names IST and other zones", () => {
    assert.equal(zoneAbbreviation(startedAt, "Asia/Kolkata"), "IST")
    assert.equal(zoneAbbreviation(startedAt, "UTC"), "UTC")
    assert.equal(
      zoneAbbreviation(new Date("2026-07-01T12:00:00Z"), "America/New_York"),
      "EDT"
    )
    // No English short name: falls back to the offset.
    assert.equal(zoneAbbreviation(startedAt, "Asia/Kathmandu"), "GMT+5:45")
  })
  it("formats 24-hour time, with the date only when not recent", () => {
    assert.equal(
      formatAlertTime(startedAt, "Asia/Kolkata", ctx.now),
      "10:42 IST"
    )
    const old = new Date("2026-10-24T05:12:00Z")
    assert.equal(
      formatAlertTime(old, "Asia/Kolkata", ctx.now),
      "Oct 24, 10:42 IST"
    )
  })
})

describe("alert messages", () => {
  it("DOWN matches the agreed wording", () => {
    const message = downMessage(monitor, incident, ctx)
    assert.equal(
      message.text,
      "🔴 Checkout API is DOWN — 503 Service Unavailable — https://api.example.com/health — since 10:42 IST"
    )
    assert.equal(message.title, "🔴 Checkout API is DOWN")
    assert.equal(message.url, "https://pingboard.example/app/incidents/i1")
    assert.equal(message.tone, "down")
  })

  it("RECOVERED gives the duration", () => {
    const message = recoveredMessage(
      monitor,
      {
        ...incident,
        resolvedAt: new Date("2026-10-26T05:19:12Z"),
        durationSeconds: 432,
      },
      ctx
    )
    assert.equal(message.text, "🟢 Checkout API is back UP after 7m 12s")
    assert.equal(message.tone, "up")
  })

  it("reminder says how long it has been down", () => {
    const message = reminderMessage(monitor, incident, ctx)
    assert.match(
      message.text,
      /^🔴 Checkout API is still DOWN after 8m — 503 Service Unavailable/
    )
  })

  it("SSL counts days and names the host", () => {
    const message = sslMessage(monitor, new Date("2026-11-08T05:20:00Z"), ctx)
    assert.match(message.title, /expires in 13 days$/)
    assert.match(message.text, /api\.example\.com/)
    assert.equal(
      sslMessage(monitor, new Date("2026-10-25T00:00:00Z"), ctx).title.endsWith(
        "has expired"
      ),
      true
    )
    assert.equal(message.url, "https://pingboard.example/app/monitors/m1")
  })

  it("degraded mentions the streak and threshold", () => {
    const message = degradedMessage(
      monitor,
      { responseTimeMs: 2430, thresholdMs: 2000 },
      ctx
    )
    assert.match(message.text, /5 checks in a row over 2\.0 s \(last: 2\.4 s\)/)
  })
})
