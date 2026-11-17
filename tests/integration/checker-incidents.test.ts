import assert from "node:assert/strict"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import mongoose, { Types } from "mongoose"
import { pino } from "pino"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"

import { Incident } from "../../src/lib/shared/models/incident"
import { Monitor } from "../../src/lib/shared/models/monitor"
import { CheckResult } from "../../src/lib/shared/models/check-result"
import type { AlertsQueue } from "../../worker/src/alerts/queue"
import { processCheck, type CheckerDeps } from "../../worker/src/checker"
import type { WorkerEnv } from "../../worker/src/env"
import { reconcileIncidents } from "../../worker/src/incidents"

// The real checker against a real MongoDB and a local HTTP server: status
// logic (2 failures → down), incident open/extend/close and the alerts they
// queue. Needs TEST_MONGODB_URI (never the app's MONGODB_URI); each run uses
// its own database and drops it afterwards.

const MONGO_URI = process.env.TEST_MONGODB_URI

type QueuedAlert = { name: string; data: { kind: string }; jobId: string }

/** Stand-in for the BullMQ alerts queue: same job id = same job, like BullMQ. */
function fakeAlertsQueue() {
  const jobs = new Map<string, QueuedAlert>()
  const queue = {
    add: async (
      name: string,
      data: { kind: string },
      opts: { jobId: string }
    ) => {
      if (!jobs.has(opts.jobId))
        jobs.set(opts.jobId, { name, data, jobId: opts.jobId })
    },
  }
  return {
    queue: queue as unknown as AlertsQueue,
    kinds: () => [...jobs.values()].map((j) => j.data.kind),
  }
}

describe.skipIf(!MONGO_URI)("checker + incidents (MongoDB)", () => {
  let server: Server
  let siteStatus = 200
  let url = ""
  let alerts: ReturnType<typeof fakeAlertsQueue>
  let deps: CheckerDeps
  const dbName = `pingboard_test_${Date.now()}`

  beforeAll(async () => {
    await mongoose.connect(MONGO_URI!, {
      dbName,
      serverSelectionTimeoutMS: 5_000,
    })
    await Promise.all([Monitor.init(), Incident.init(), CheckResult.init()])
    server = createServer((_req, res) => res.writeHead(siteStatus).end("ok"))
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/health`
  })

  afterAll(async () => {
    server?.close()
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  })

  beforeEach(async () => {
    await Promise.all([
      Monitor.deleteMany({}),
      Incident.deleteMany({}),
      CheckResult.deleteMany({}),
    ])
    siteStatus = 200
    alerts = fakeAlertsQueue()
    deps = {
      env: {
        NODE_ENV: "test",
        SSRF_ALLOW_PRIVATE: true,
        SLOW_THRESHOLD_MS: 2_000,
      } as WorkerEnv,
      logger: pino({ level: "silent" }),
      queue: {
        removeJobScheduler: async () => true,
      } as unknown as CheckerDeps["queue"],
      alerts: alerts.queue,
      encryptionKey: Buffer.alloc(32),
    }
  })

  async function newMonitor() {
    const monitor = await Monitor.create({
      userId: new Types.ObjectId(),
      name: "Local site",
      url,
      intervalMinutes: 1,
      timeoutMs: 5_000,
      status: "pending",
    })
    return monitor._id.toString()
  }

  async function check(id: string, status: number) {
    siteStatus = status
    const outcome = await processCheck(id, deps)
    assert.equal(outcome.kind, "checked")
    return Monitor.findById(id).lean()
  }

  it("1 failure is a blip; 2 in a row → down + one incident + one DOWN alert", async () => {
    const id = await newMonitor()
    assert.equal((await check(id, 200))?.status, "up")

    const afterOne = await check(id, 503)
    assert.equal(afterOne?.status, "up")
    assert.equal(afterOne?.consecutiveFailures, 1)
    assert.equal(await Incident.countDocuments({ monitorId: id }), 0)

    const afterTwo = await check(id, 503)
    assert.equal(afterTwo?.status, "down")
    const incident = await Incident.findOne({ monitorId: id }).lean()
    assert.ok(incident?.open)
    assert.equal(incident.checksFailed, 2)
    // Starts at the first failed check of the streak, not at confirmation.
    assert.equal(
      incident.startedAt.getTime(),
      afterOne?.lastCheckedAt?.getTime()
    )
    assert.equal(incident.cause?.statusCode, 503)
    assert.deepEqual(alerts.kinds(), ["down"])

    // More failures extend the same incident; no second DOWN alert.
    await check(id, 503)
    await check(id, 500)
    assert.equal(await Incident.countDocuments({ monitorId: id }), 1)
    assert.equal(
      (await Incident.findOne({ monitorId: id }).lean())?.checksFailed,
      4
    )
    assert.deepEqual(alerts.kinds(), ["down"])
    assert.equal(await CheckResult.countDocuments({ monitorId: id }), 5)
  })

  it("the first success closes the incident and queues one recovery", async () => {
    const id = await newMonitor()
    await check(id, 503)
    const down = await check(id, 503)
    assert.equal(down?.status, "down")

    const up = await check(id, 200)
    assert.equal(up?.status, "up")
    assert.equal(up?.consecutiveFailures, 0)
    const incident = await Incident.findOne({ monitorId: id }).lean()
    assert.equal(incident?.open, false)
    assert.equal(incident?.resolution, "recovered")
    assert.ok(incident.resolvedAt && incident.resolvedAt >= incident.startedAt)
    assert.equal(
      incident.durationSeconds,
      Math.round(
        (incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 1000
      )
    )
    assert.deepEqual(alerts.kinds(), ["down", "recovered"])

    // Staying up doesn't alert again; a new outage opens a new incident.
    await check(id, 200)
    await check(id, 503)
    await check(id, 503)
    assert.equal(await Incident.countDocuments({ monitorId: id }), 2)
    assert.equal(
      await Incident.countDocuments({ monitorId: id, open: true }),
      1
    )
    assert.deepEqual(alerts.kinds(), ["down", "recovered", "down"])
  })

  it("never allows two open incidents for one monitor (unique index)", async () => {
    const id = await newMonitor()
    const base = {
      monitorId: id,
      userId: new Types.ObjectId(),
      startedAt: new Date(),
      confirmedAt: new Date(),
      cause: { statusCode: 503, errorMessage: "Unexpected status 503" },
    }
    await Incident.create(base)
    await assert.rejects(
      Incident.create(base),
      (error: { code?: number }) => error.code === 11000
    )
  })

  it("reconcile closes an incident whose monitor isn't down any more", async () => {
    const id = await newMonitor()
    await check(id, 503)
    await check(id, 503)
    // Simulate a crash between saving a recovery and closing the incident.
    await Monitor.updateOne(
      { _id: id },
      { $set: { status: "up", consecutiveFailures: 0 } }
    )

    const fixed = await reconcileIncidents({
      alerts: alerts.queue,
      logger: deps.logger,
    })
    assert.equal(fixed, 1)
    const incident = await Incident.findOne({ monitorId: id }).lean()
    assert.equal(incident?.open, false)
    assert.equal(incident?.resolution, "recovered")
    assert.deepEqual(alerts.kinds(), ["down", "recovered"])
  })

  it("skips paused and deleted monitors without saving a result", async () => {
    const id = await newMonitor()
    await Monitor.updateOne({ _id: id }, { $set: { status: "paused" } })
    assert.deepEqual(await processCheck(id, deps), {
      kind: "skipped",
      reason: "paused",
    })
    assert.deepEqual(
      await processCheck(new Types.ObjectId().toString(), deps),
      {
        kind: "skipped",
        reason: "missing",
      }
    )
    assert.equal(await CheckResult.countDocuments({ monitorId: id }), 0)
  })
})
