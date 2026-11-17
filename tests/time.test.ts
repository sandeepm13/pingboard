import assert from "node:assert/strict"

import { describe, it } from "vitest"

import { formatRelative } from "../src/components/monitors/format"
import { daysUntil, safeTimeZone, startOfHourIn } from "../src/lib/shared/time"

describe("startOfHourIn", () => {
  const now = new Date("2026-10-26T10:47:13.250Z")

  it("truncates to the UTC hour for whole-hour zones", () => {
    assert.equal(
      startOfHourIn(now, "UTC").toISOString(),
      "2026-10-26T10:00:00.000Z"
    )
    assert.equal(
      startOfHourIn(now, "Europe/Berlin").toISOString(),
      "2026-10-26T10:00:00.000Z"
    )
  })

  it("follows :30 and :45 offsets", () => {
    // 10:47 UTC = 16:17 in Kolkata (+5:30), whose hour began at 10:30 UTC.
    assert.equal(
      startOfHourIn(now, "Asia/Kolkata").toISOString(),
      "2026-10-26T10:30:00.000Z"
    )
    // +5:45: 16:32 local, hour began at 10:15 UTC.
    assert.equal(
      startOfHourIn(now, "Asia/Kathmandu").toISOString(),
      "2026-10-26T10:15:00.000Z"
    )
  })

  it("handles negative half-hour offsets (St John's, -2:30 in summer)", () => {
    // 10:47 UTC = 08:17 NDT; the local hour began at 10:30 UTC.
    assert.equal(
      startOfHourIn(now, "America/St_Johns").toISOString(),
      "2026-10-26T10:30:00.000Z"
    )
  })

  it("stays on local hour boundaries across a DST change", () => {
    // New York leaves DST on 2026-11-01 at 06:00 UTC (02:00 EDT → 01:00 EST):
    // 01:30 local happens twice, an hour apart, each in its own hour.
    const zone = "America/New_York"
    assert.equal(
      startOfHourIn(new Date("2026-11-01T05:30:00Z"), zone).toISOString(),
      "2026-11-01T05:00:00.000Z"
    )
    assert.equal(
      startOfHourIn(new Date("2026-11-01T06:30:00Z"), zone).toISOString(),
      "2026-11-01T06:00:00.000Z"
    )
    // Lord Howe shifts by 30 minutes (+11 → +10:30 on 2026-04-05 at 15:00 UTC).
    assert.equal(
      startOfHourIn(
        new Date("2026-04-05T15:10:00Z"),
        "Australia/Lord_Howe"
      ).toISOString(),
      "2026-04-05T14:30:00.000Z"
    )
  })
})

describe("safeTimeZone", () => {
  it("keeps known zones and falls back to UTC", () => {
    assert.equal(safeTimeZone("Asia/Kolkata"), "Asia/Kolkata")
    assert.equal(safeTimeZone("Mars/Olympus"), "UTC")
    assert.equal(safeTimeZone(null), "UTC")
  })
})

describe("daysUntil", () => {
  const now = Date.parse("2026-10-26T12:00:00Z")

  it("counts whole days and goes negative after the date", () => {
    assert.equal(daysUntil(new Date("2026-11-09T11:00:00Z"), now), 13)
    assert.equal(daysUntil(new Date("2026-10-26T18:00:00Z"), now), 0)
    assert.equal(daysUntil(new Date("2026-10-25T12:00:00Z"), now), -1)
  })
})

describe("formatRelative", () => {
  const now = Date.parse("2026-10-26T12:00:00Z")
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString()

  it("shows seconds under a minute, in steps of 10", () => {
    assert.equal(formatRelative(ago(4), now), "just now")
    assert.equal(formatRelative(ago(43), now), "40s ago")
    assert.equal(formatRelative(ago(90), now), "2 min ago")
    assert.equal(formatRelative(ago(3 * 3600), now), "3 h ago")
  })
})
