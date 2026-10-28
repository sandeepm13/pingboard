import assert from "node:assert/strict"

import { Types } from "mongoose"
import { describe, it } from "vitest"

import { formatUptime } from "../src/components/common/stat-card"
import {
  dailySlots,
  percentile,
  slotStatus,
  startOfUtcDay,
  sumCounts,
  summarizeResponseTimes,
  uptimePercent,
} from "../src/lib/shared/stats"
import { summarizeDay } from "../worker/src/rollup"

describe("uptimePercent", () => {
  it("is null without checks, not 0 or 100", () => {
    assert.equal(uptimePercent(0, 0), null)
  })

  it("rounds to 3 decimals", () => {
    assert.equal(uptimePercent(1439, 1440), 99.931)
    assert.equal(uptimePercent(10, 10), 100)
    assert.equal(uptimePercent(0, 5), 0)
  })

  it("counts degraded as up: it's the caller's up count (isUp)", () => {
    // 1 440 checks a day: 1 down, 10 slow → 1 439 up.
    assert.equal(uptimePercent(1439, 1440), 99.931)
  })

  it("is never 100 while a check failed, nor 0 while one passed", () => {
    // 90 days of 1-minute checks with one failure rounds to 100.000.
    assert.equal(uptimePercent(129_599, 129_600), 99.999)
    assert.equal(uptimePercent(299_999, 300_000), 99.999)
    assert.equal(uptimePercent(1, 300_000), 0.001)
  })

  it("30 days = summed counts, not an average of daily percentages", () => {
    // A quiet day (1 check, down) must not weigh like a full day.
    const days = [
      { total: 1440, up: 1440, degraded: 0 },
      { total: 1, up: 0, degraded: 0 },
    ]
    const total = sumCounts(days)
    assert.equal(uptimePercent(total.up, total.total), 99.931)
  })
})

describe("formatUptime (display)", () => {
  it("floors to 2 decimals so a failure never shows 100.00%", () => {
    assert.equal(formatUptime(99.999), "99.99%")
    assert.equal(formatUptime(99.996), "99.99%")
    assert.equal(formatUptime(100), "100%")
    assert.equal(formatUptime(99.931), "99.93%")
    assert.equal(formatUptime(null), "—")
  })
})

describe("dailySlots", () => {
  it("has one slot per UTC day ending today, oldest first, gaps = no data", () => {
    const now = new Date("2026-03-10T23:59:00Z")
    const day = (iso: string) => Date.parse(iso)
    const slots = dailySlots(
      [
        { day: day("2026-03-08T00:00:00Z"), total: 10, up: 9, degraded: 0 },
        { day: day("2026-03-10T00:00:00Z"), total: 4, up: 4, degraded: 1 },
      ],
      3,
      now
    )
    assert.deepEqual(
      slots.map((s) => [s.start, s.status, s.uptime, s.checks]),
      [
        ["2026-03-08T00:00:00.000Z", "down", 90, 10],
        ["2026-03-09T00:00:00.000Z", null, null, 0],
        ["2026-03-10T00:00:00.000Z", "degraded", 100, 4],
      ]
    )
  })
})

describe("percentile / summarizeResponseTimes", () => {
  it("uses nearest rank", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1)
    assert.equal(percentile(values, 95), 95)
    assert.equal(percentile([42], 95), 42)
    assert.equal(percentile([], 95), null)
  })

  it("summarizes unsorted input", () => {
    assert.deepEqual(summarizeResponseTimes([300, 100, 200]), {
      avgResponseMs: 200,
      minResponseMs: 100,
      maxResponseMs: 300,
      p95ResponseMs: 300,
    })
  })
})

describe("startOfUtcDay", () => {
  it("is midnight UTC whatever the local timezone", () => {
    assert.equal(
      startOfUtcDay(new Date("2026-10-25T23:59:59.999Z")).toISOString(),
      "2026-10-25T00:00:00.000Z"
    )
  })
})

describe("summarizeDay (rollup)", () => {
  it("ignores checks without a response time and counts degraded as up", () => {
    const monitorId = new Types.ObjectId()
    const userId = new Types.ObjectId()
    const day = new Date("2026-10-25T00:00:00Z")
    const stat = summarizeDay(
      {
        _id: monitorId,
        userId,
        totalChecks: 4,
        upChecks: 3,
        degradedChecks: 1,
        responseTimes: [120, null, 2_400, 80],
      },
      day,
      day
    )
    assert.equal(stat.monitorId, monitorId)
    assert.equal(stat.uptimePct, 75)
    assert.equal(stat.degradedChecks, 1)
    assert.equal(stat.avgResponseMs, 867)
    assert.equal(stat.minResponseMs, 80)
    assert.equal(stat.maxResponseMs, 2_400)
    assert.equal(stat.p95ResponseMs, 2_400)
  })
})

describe("slotStatus (uptime bar colour)", () => {
  it("is null without checks", () => {
    assert.equal(slotStatus({ total: 0, up: 0, degraded: 0 }), null)
  })

  it("is down as soon as one check failed", () => {
    assert.equal(slotStatus({ total: 60, up: 59, degraded: 0 }), "down")
    assert.equal(slotStatus({ total: 3, up: 0, degraded: 0 }), "down")
  })

  it("is degraded when all checks passed but some were slow", () => {
    assert.equal(slotStatus({ total: 12, up: 12, degraded: 1 }), "degraded")
    assert.equal(slotStatus({ total: 12, up: 12, degraded: 0 }), "up")
  })
})

describe("sumCounts", () => {
  it("adds rows and handles none", () => {
    assert.deepEqual(sumCounts([]), { total: 0, up: 0, degraded: 0 })
    assert.deepEqual(
      sumCounts([
        { total: 10, up: 9, degraded: 1 },
        { total: 5, up: 5, degraded: 0 },
      ]),
      { total: 15, up: 14, degraded: 1 }
    )
  })
})
