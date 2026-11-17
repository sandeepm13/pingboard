import assert from "node:assert/strict"

import { describe, it } from "vitest"

import {
  nextMonitorState,
  type MonitorState,
} from "../src/lib/shared/checks/monitor-state"
import type { CheckStatus } from "../src/lib/shared/types"

function run(start: MonitorState, checks: CheckStatus[]) {
  let state = start
  const changes: string[] = []
  for (const check of checks) {
    const next = nextMonitorState(state, check)
    if (next.changed) changes.push(`${next.previousStatus}->${next.status}`)
    state = {
      status: next.status,
      consecutiveFailures: next.consecutiveFailures,
    }
  }
  return { state, changes }
}

const up: MonitorState = { status: "up", consecutiveFailures: 0 }

describe("nextMonitorState", () => {
  it("one failure doesn't take an up monitor down", () => {
    const next = nextMonitorState(up, "down")
    assert.equal(next.status, "up")
    assert.equal(next.consecutiveFailures, 1)
    assert.equal(next.changed, false)
  })

  it("two failures in a row → down, changed once", () => {
    const { state, changes } = run(up, ["down", "down", "down"])
    assert.equal(state.status, "down")
    assert.equal(state.consecutiveFailures, 3)
    assert.deepEqual(changes, ["up->down"])
  })

  it("a success between failures resets the count (blips never alert)", () => {
    const { state, changes } = run(up, ["down", "up", "down", "up"])
    assert.equal(state.status, "up")
    assert.deepEqual(changes, [])
  })

  it("one success recovers a down monitor", () => {
    const down: MonitorState = { status: "down", consecutiveFailures: 4 }
    const next = nextMonitorState(down, "up")
    assert.equal(next.status, "up")
    assert.equal(next.consecutiveFailures, 0)
    assert.equal(next.changed, true)
  })

  it("a slow success sets degraded (and recovers from down)", () => {
    const { state, changes } = run(up, ["down", "down", "degraded", "up"])
    assert.equal(state.status, "up")
    assert.deepEqual(changes, ["up->down", "down->degraded", "degraded->up"])
  })

  it("a new (pending) monitor stays pending after one failure", () => {
    const pending: MonitorState = { status: "pending", consecutiveFailures: 0 }
    assert.equal(nextMonitorState(pending, "down").status, "pending")
    const { state } = run(pending, ["down", "down"])
    assert.equal(state.status, "down")
  })

  it("pending → up on the first success", () => {
    const next = nextMonitorState(
      { status: "pending", consecutiveFailures: 0 },
      "up"
    )
    assert.equal(next.status, "up")
    assert.equal(next.changed, true)
  })

  it("never changes a paused monitor", () => {
    const paused: MonitorState = { status: "paused", consecutiveFailures: 0 }
    const next = nextMonitorState(paused, "down")
    assert.equal(next.status, "paused")
    assert.equal(next.changed, false)
  })

  it("honours a custom threshold", () => {
    assert.equal(nextMonitorState(up, "down", 1).status, "down")
  })
})
