import assert from "node:assert/strict"
import { setTimeout as sleep } from "node:timers/promises"

import { Queue, Worker } from "bullmq"
import { Redis } from "ioredis"
import { afterAll, beforeAll, describe, it } from "vitest"

import {
  scheduleMonitor,
  unscheduleMonitor,
  type CheckJobData,
} from "../../src/lib/shared/scheduler"
import { dueAt } from "../../worker/src/schedule-lag"

// Our scheduler helpers against a real Redis + BullMQ, with a 1-second
// interval standing in for 1 minute: every slot runs exactly once, re-syncing
// doesn't add runs, and a worker restart catches up once instead of replaying
// (or skipping) slots. Needs TEST_REDIS_URL pointing at an empty, throwaway
// database (e.g. redis://127.0.0.1:6379/15); keys use their own prefix.

const REDIS_URL = process.env.TEST_REDIS_URL
const EVERY_MS = 1_000
const MONITOR = {
  id: "monitor-1",
  status: "up" as const,
  intervalMinutes: EVERY_MS / 60_000,
}

type Run = { slot: number; startedAt: number }

describe.skipIf(!REDIS_URL)("job schedulers (Redis)", () => {
  const prefix = `pbtest${Date.now()}`
  let connection: Redis
  let queue: Queue<CheckJobData>
  const runs: Run[] = []

  function startWorker() {
    return new Worker<CheckJobData>(
      "checks",
      async (job) => {
        runs.push({
          slot: dueAt(job),
          startedAt: job.processedOn ?? Date.now(),
        })
      },
      { connection, prefix, concurrency: 5 }
    )
  }

  beforeAll(async () => {
    connection = new Redis(REDIS_URL!, { maxRetriesPerRequest: null })
    queue = new Queue<CheckJobData>("checks", { connection, prefix })
  })

  afterAll(async () => {
    await queue?.obliterate({ force: true })
    await queue?.close()
    connection?.disconnect()
  })

  it("runs every slot once, survives re-syncs and catches up once after a restart", async () => {
    let worker = startWorker()
    await scheduleMonitor(queue, MONITOR)
    const [scheduler] = await queue.getJobSchedulers()
    assert.equal(scheduler?.every, EVERY_MS)

    // The app and the reconcile re-sync the same interval: no extra runs.
    await sleep(1_500)
    await scheduleMonitor(queue, MONITOR)
    await scheduleMonitor(queue, MONITOR)
    await sleep(2_000)
    await worker.close()

    const beforeRestart = runs.length
    assert.ok(beforeRestart >= 3 && beforeRestart <= 5, `ran ${beforeRestart}×`)
    const slots = runs.map((run) => run.slot)
    assert.equal(new Set(slots).size, slots.length, "a slot ran twice")
    for (let i = 1; i < slots.length; i++) {
      assert.equal(slots[i]! - slots[i - 1]!, EVERY_MS, "a slot was skipped")
    }

    // Worker down for ~3 slots.
    await sleep(3_200)
    const restartedAt = Date.now()
    worker = startWorker()
    await sleep(2_600)
    await worker.close()

    const after = runs.slice(beforeRestart)
    // The slot that was already queued when the worker stopped runs once,
    // right away; the slots missed after it aren't replayed.
    const overdue = after.filter((run) => run.slot < restartedAt)
    assert.equal(overdue.length, 1, `${overdue.length} overdue runs`)
    assert.equal(overdue[0]!.slot, slots.at(-1)! + EVERY_MS)
    assert.ok(overdue[0]!.startedAt - restartedAt < 1_000, "catch-up was late")
    assert.ok(
      after.length >= 2 && after.length <= 4,
      `ran ${after.length}× after restart`
    )
    const allSlots = runs.map((run) => run.slot)
    assert.equal(new Set(allSlots).size, allSlots.length, "a slot ran twice")
    // Afterwards it's back on a whole-interval rhythm.
    const later = after.slice(1).map((run) => run.slot)
    for (let i = 1; i < later.length; i++) {
      assert.equal(later[i]! - later[i - 1]!, EVERY_MS)
    }

    await unscheduleMonitor(queue, MONITOR.id)
    assert.equal((await queue.getJobSchedulers()).length, 0)
    assert.equal(await queue.getDelayedCount(), 0)
  }, 20_000)
})
