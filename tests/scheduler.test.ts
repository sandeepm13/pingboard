import assert from "node:assert/strict"

import { describe, it } from "vitest"

import { planReconcile } from "../src/lib/shared/scheduler"

describe("planReconcile", () => {
  it("adds missing schedulers and removes ones for deleted/paused monitors", () => {
    const plan = planReconcile(
      [
        { id: "a", status: "up", intervalMinutes: 1 },
        { id: "b", status: "paused", intervalMinutes: 5 },
        { id: "c", status: "pending", intervalMinutes: 5 },
      ],
      [
        { key: "a", every: 60_000 },
        { key: "b", every: 300_000 },
        { key: "deleted", every: 60_000 },
      ]
    )
    assert.deepEqual(
      plan.upsert.map((monitor) => monitor.id),
      ["c"]
    )
    assert.deepEqual(plan.remove.sort(), ["b", "deleted"])
  })

  it("updates a scheduler whose interval no longer matches", () => {
    const plan = planReconcile(
      [{ id: "a", status: "down", intervalMinutes: 10 }],
      [{ key: "a", every: 60_000 }]
    )
    assert.deepEqual(
      plan.upsert.map((monitor) => monitor.id),
      ["a"]
    )
    assert.deepEqual(plan.remove, [])
  })

  it("does nothing when everything matches", () => {
    const plan = planReconcile(
      [{ id: "a", status: "up", intervalMinutes: 3 }],
      [{ key: "a", every: 180_000 }]
    )
    assert.deepEqual(plan, { upsert: [], remove: [] })
  })
})
