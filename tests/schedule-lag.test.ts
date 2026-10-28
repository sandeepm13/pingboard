import assert from "node:assert/strict"

import { describe, it } from "vitest"

import { dueAt, LagStats } from "../worker/src/schedule-lag"

describe("dueAt", () => {
  it("reads the slot from a scheduler job id", () => {
    const job = {
      id: "repeat:65f0c0ffee:1761580800000",
      timestamp: 1,
      delay: 5,
    }
    assert.equal(dueAt(job), 1761580800000)
  })

  it("falls back to creation time + delay for other jobs", () => {
    assert.equal(dueAt({ id: "42", timestamp: 1_000, delay: 250 }), 1_250)
    assert.equal(dueAt({ timestamp: 1_000 }), 1_000)
  })
})

describe("LagStats", () => {
  it("summarises and resets", () => {
    const stats = new LagStats()
    for (const ms of [10, 20, 30, 40, 1_000]) stats.record(ms)
    stats.record(-5) // clock skew never reports negative lag
    assert.deepEqual(stats.flush(), {
      checks: 6,
      avgLagMs: 183,
      p95LagMs: 1_000,
      maxLagMs: 1_000,
    })
    assert.equal(stats.flush(), null)
  })
})
