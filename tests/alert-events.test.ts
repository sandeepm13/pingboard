import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  alertEventKey,
  deliveryKey,
  nextReminderAt,
  sslAlertThreshold,
} from "../src/lib/shared/alerts/events"
import {
  nextCurrentFailure,
  nextSlowStreak,
} from "../src/lib/shared/checks/monitor-state"
import { buildTimeline } from "../src/lib/incident-timeline"

describe("alert event keys", () => {
  it("are stable and valid BullMQ job ids (no ':')", () => {
    const keys = [
      alertEventKey({ kind: "down", incidentId: "a1" }),
      alertEventKey({ kind: "recovered", incidentId: "a1" }),
      alertEventKey({ kind: "reminder", incidentId: "a1", reminder: 2 }),
      alertEventKey({
        kind: "ssl",
        monitorId: "m1",
        expiresAt: "2026-11-08T05:20:00.000Z",
        thresholdDays: 14,
      }),
      alertEventKey({
        kind: "degraded",
        monitorId: "m1",
        checkedAt: "2026-10-26T05:20:00.000Z",
        responseTimeMs: 2500,
      }),
    ]
    for (const key of keys) assert.ok(!key.includes(":"), key)
    assert.equal(new Set(keys).size, keys.length)
    assert.equal(keys[0], "down-a1")
    assert.equal(deliveryKey(keys[0]!, "c1"), "down-a1-c1")
    // Same event → same key (dedupe).
    assert.equal(alertEventKey({ kind: "down", incidentId: "a1" }), keys[0])
  })
})

describe("sslAlertThreshold", () => {
  it("14 days, then 3 days, expired counts as 3", () => {
    assert.equal(sslAlertThreshold(30), null)
    assert.equal(sslAlertThreshold(15), null)
    assert.equal(sslAlertThreshold(14), 14)
    assert.equal(sslAlertThreshold(4), 14)
    assert.equal(sslAlertThreshold(3), 3)
    assert.equal(sslAlertThreshold(0), 3)
    assert.equal(sslAlertThreshold(-2), 3)
  })
})

describe("nextReminderAt", () => {
  it("is null when reminders are off", () => {
    const from = new Date("2026-10-26T05:00:00Z")
    assert.equal(nextReminderAt(from, 0), null)
    assert.equal(
      nextReminderAt(from, 30)?.toISOString(),
      "2026-10-26T05:30:00.000Z"
    )
  })
})

describe("failure streak bookkeeping", () => {
  const t1 = new Date("2026-10-26T05:00:00Z")
  const t2 = new Date("2026-10-26T05:01:00Z")
  const fail = (
    checkedAt: Date,
    statusCode: number | null,
    errorMessage: string
  ) => ({
    status: "down" as const,
    checkedAt,
    statusCode,
    errorMessage,
  })

  it("keeps the first failure of a streak (incident start + cause)", () => {
    const first = nextCurrentFailure(
      { consecutiveFailures: 0 },
      fail(t1, 503, "Unexpected status 503")
    )
    assert.deepEqual(first, {
      startedAt: t1,
      statusCode: 503,
      errorMessage: "Unexpected status 503",
    })
    const second = nextCurrentFailure(
      { consecutiveFailures: 1, currentFailure: first },
      fail(t2, null, "Timeout after 10s")
    )
    assert.deepEqual(second, first)
  })

  it("a success clears it; a stale value isn't reused after a reset", () => {
    const first = nextCurrentFailure(
      { consecutiveFailures: 0 },
      fail(t1, 500, "x")
    )
    assert.equal(
      nextCurrentFailure(
        { consecutiveFailures: 1, currentFailure: first },
        { status: "up", checkedAt: t2, statusCode: 200, errorMessage: null }
      ),
      null
    )
    const fresh = nextCurrentFailure(
      { consecutiveFailures: 0, currentFailure: first },
      fail(t2, 502, "y")
    )
    assert.equal(fresh?.startedAt, t2)
  })

  it("counts slow checks in a row", () => {
    let streak = 0
    for (const check of [
      "degraded",
      "degraded",
      "up",
      "degraded",
      "degraded",
      "degraded",
    ] as const) {
      streak = nextSlowStreak(streak, check)
    }
    assert.equal(streak, 3)
    assert.equal(nextSlowStreak(4, "down"), 0)
  })
})

describe("buildTimeline", () => {
  it("orders events and words alerts and resolution", () => {
    const events = buildTimeline({
      startedAt: "2026-10-26T05:00:00.000Z",
      confirmedAt: "2026-10-26T05:01:00.000Z",
      checksAtConfirm: 2,
      cause: "503 Service Unavailable",
      acknowledgedAt: "2026-10-26T05:03:00.000Z",
      resolvedAt: "2026-10-26T05:07:12.000Z",
      resolution: "recovered",
      durationSeconds: 432,
      alerts: [
        {
          kind: "recovered",
          status: "sent",
          channelType: "email",
          channelName: "Me",
          error: null,
          createdAt: "2026-10-26T05:07:13.000Z",
          sentAt: "2026-10-26T05:07:14.000Z",
        },
        {
          kind: "down",
          status: "failed",
          channelType: "discord",
          channelName: "#ops",
          error: "Discord says this webhook doesn't exist any more.",
          createdAt: "2026-10-26T05:01:01.000Z",
          sentAt: null,
        },
      ],
    })
    assert.deepEqual(
      events.map((e) => e.title),
      [
        "First failed check",
        "Marked down",
        "Down alert failed · Discord",
        "Acknowledged",
        "Recovered — back up",
        "Recovered alert sent · Email",
      ]
    )
    assert.equal(events[4]!.detail, "Lasted 7m 12s")
    assert.equal(events[2]!.tone, "down")
  })
})
