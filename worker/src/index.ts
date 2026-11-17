import type { Server } from "node:http"

import { Queue, Worker, type Job } from "bullmq"
import { Redis } from "ioredis"
import mongoose from "mongoose"

import type { AlertDeliverJob, AlertEvent } from "@shared/alerts/types"
import { JOB_NAMES, QUEUE_NAMES } from "@shared/constants"
import { connectMongo, disconnectMongo } from "@shared/db"
import { AlertChannel } from "@shared/models/alert-channel"
import { AlertLog } from "@shared/models/alert-log"
import { CheckResult } from "@shared/models/check-result"
import { DailyStat } from "@shared/models/daily-stat"
import { Incident } from "@shared/models/incident"
import { Monitor } from "@shared/models/monitor"
import type { CheckJobData } from "@shared/scheduler"
import { parseEncryptionKey } from "@shared/security/secrets"

import { processDelivery } from "./alerts/deliver"
import { dispatchAlert } from "./alerts/dispatch"
import type { AlertsJobData, AlertsQueue } from "./alerts/queue"
import { REMINDER_TICK_MS, runReminderTick } from "./alerts/reminders"
import { processCheck } from "./checker"
import { loadWorkerEnv, type WorkerEnv } from "./env"
import { startHealthServer } from "./health"
import { reconcileIncidents } from "./incidents"
import { createLogger } from "./logger"
import { runDailyRollup } from "./rollup"
import {
  dueAt,
  LAG_REPORT_INTERVAL_MS,
  LagStats,
  type LagSummary,
} from "./schedule-lag"
import { RECONCILE_INTERVAL_MS, reconcileSchedules } from "./scheduler"

/** Longest check (30 s timeout + DNS + TLS probe) fits well inside this. */
const JOB_LOCK_MS = 90_000
/** Grace period for in-flight checks on SIGTERM before forcing exit. */
const SHUTDOWN_TIMEOUT_MS = 45_000

let env: WorkerEnv
try {
  env = loadWorkerEnv()
} catch (error) {
  console.error(`[worker] ${errorMessage(error)}`)
  process.exit(1)
}
const logger = createLogger(env)

async function main() {
  const encryptionKey = parseEncryptionKey(env.ENCRYPTION_KEY)

  const db = await connectMongo(env.MONGODB_URI, { dbName: env.MONGODB_DB })
  // Make sure the TTL, unique and lookup indexes exist before writing.
  await Promise.all([
    Monitor.init(),
    CheckResult.init(),
    DailyStat.init(),
    Incident.init(),
    AlertChannel.init(),
    AlertLog.init(),
  ])
  logger.info({ db: db.connection.db?.databaseName }, "mongodb connected")

  // BullMQ requires maxRetriesPerRequest: null on worker connections.
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  redis.on("error", (error) =>
    logger.error({ err: error.message }, "redis error")
  )
  await withTimeout(
    redis.ping(),
    5_000,
    `Redis at ${new URL(env.REDIS_URL).host} did not answer PING. Is Redis running? (see REDIS_URL)`
  )
  logger.info({ host: new URL(env.REDIS_URL).host }, "redis connected")

  const checksQueue = new Queue<CheckJobData>(QUEUE_NAMES.checks, {
    connection: redis,
  })
  const maintenanceQueue = new Queue(QUEUE_NAMES.maintenance, {
    connection: redis,
  })
  const alertsQueue: AlertsQueue = new Queue<AlertsJobData>(
    QUEUE_NAMES.alerts,
    {
      connection: redis,
    }
  )
  const lag = new LagStats()
  let lastLag: LagSummary | null = null
  let lastCheckAt: Date | null = null
  let workerForProbe: Worker<CheckJobData> | null = null

  // Before the workers, so a taken port fails the boot before any job runs.
  const health: Server = await startHealthServer(
    () => ({
      mongo: mongoose.connection.readyState === 1,
      redis: redis.status === "ready",
      worker: workerForProbe?.isRunning() ?? false,
      lastCheckAt,
      scheduleLag: lastLag,
    }),
    { host: env.WORKER_HEALTH_HOST, port: env.WORKER_HEALTH_PORT }
  )

  const checksWorker = new Worker<CheckJobData>(
    QUEUE_NAMES.checks,
    async (job) => {
      lag.record((job.processedOn ?? Date.now()) - dueAt(job))
      const outcome = await processCheck(job.data.monitorId, {
        env,
        logger,
        queue: checksQueue,
        alerts: alertsQueue,
        encryptionKey,
      })
      lastCheckAt = new Date()
      return outcome.kind === "checked" ? outcome.result.status : outcome.reason
    },
    {
      connection: redis,
      concurrency: env.WORKER_CONCURRENCY,
      lockDuration: JOB_LOCK_MS,
    }
  )
  workerForProbe = checksWorker
  checksWorker.on("failed", (job, error) =>
    logger.error(
      { monitorId: job?.data.monitorId, err: error.message },
      "check job failed"
    )
  )
  checksWorker.on("error", (error) =>
    logger.error({ err: error.message }, "checks worker error")
  )

  const maintenanceWorker = new Worker(
    QUEUE_NAMES.maintenance,
    async (job) => {
      if (job.name === JOB_NAMES.rollup) await runDailyRollup(logger)
    },
    { connection: redis, concurrency: 1, lockDuration: 10 * 60_000 }
  )
  maintenanceWorker.on("failed", (job, error) =>
    logger.error(
      { job: job?.name, err: error.message },
      "maintenance job failed"
    )
  )
  maintenanceWorker.on("error", (error) =>
    logger.error({ err: error.message }, "maintenance worker error")
  )

  // 00:15 UTC: yesterday is complete; also re-does the 2 days before (idempotent).
  await maintenanceQueue.upsertJobScheduler(
    JOB_NAMES.rollup,
    { pattern: "15 0 * * *", tz: "UTC" },
    {
      name: JOB_NAMES.rollup,
      opts: { attempts: 3, backoff: { type: "exponential", delay: 60_000 } },
    }
  )
  // Catch up on boot in case the worker was down at 00:15.
  await maintenanceQueue.add(JOB_NAMES.rollup, {}, { removeOnComplete: true })

  const alertsWorker = new Worker<AlertsJobData>(
    QUEUE_NAMES.alerts,
    async (job) => {
      switch (job.name) {
        case JOB_NAMES.alertDispatch:
          return dispatchAlert(job.data as AlertEvent, {
            queue: alertsQueue,
            logger,
            appUrl: env.APP_URL,
            slowThresholdMs: env.SLOW_THRESHOLD_MS,
          })
        case JOB_NAMES.alertDeliver:
          return processDelivery(job as Job<AlertDeliverJob>, {
            logger,
            encryptionKey,
            email: env.email,
            production: env.NODE_ENV === "production",
          })
        case JOB_NAMES.reminderTick:
          return runReminderTick(alertsQueue, logger)
      }
    },
    { connection: redis, concurrency: env.ALERT_CONCURRENCY }
  )
  alertsWorker.on("failed", (job, error) =>
    logger.warn(
      { job: job?.name, attempt: job?.attemptsMade, err: error.message },
      "alert job failed"
    )
  )
  alertsWorker.on("error", (error) =>
    logger.error({ err: error.message }, "alerts worker error")
  )
  await alertsQueue.upsertJobScheduler(
    JOB_NAMES.reminderTick,
    { every: REMINDER_TICK_MS },
    {
      name: JOB_NAMES.reminderTick,
      data: { tick: true },
      opts: { removeOnComplete: true, removeOnFail: { count: 100 } },
    }
  )

  const lagTimer = setInterval(() => {
    lastLag = lag.flush()
    if (lastLag) logger.info(lastLag, "schedule lag")
  }, LAG_REPORT_INTERVAL_MS)

  // Incidents follow the stored monitor state (see incidents.ts); the
  // reconcile below is the safety net.
  const reconcileAll = async () => {
    await reconcileSchedules(checksQueue, logger)
    await reconcileIncidents({ alerts: alertsQueue, logger })
  }
  await reconcileAll()
  const reconcileTimer = setInterval(() => {
    reconcileAll().catch((error: unknown) =>
      logger.error({ err: errorMessage(error) }, "reconcile failed")
    )
  }, RECONCILE_INTERVAL_MS)

  logger.info(
    {
      concurrency: env.WORKER_CONCURRENCY,
      slowThresholdMs: env.SLOW_THRESHOLD_MS,
      health: `http://${env.WORKER_HEALTH_HOST}:${env.WORKER_HEALTH_PORT}/health`,
    },
    "worker ready"
  )

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info({ signal }, "shutting down: finishing in-flight checks")
    setTimeout(() => {
      logger.error("shutdown timed out; exiting")
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS).unref()

    clearInterval(reconcileTimer)
    clearInterval(lagTimer)
    health.close()
    // close() stops taking new jobs and waits for the active ones.
    await Promise.allSettled([
      checksWorker.close(),
      maintenanceWorker.close(),
      alertsWorker.close(),
    ])
    await Promise.allSettled([
      checksQueue.close(),
      maintenanceQueue.close(),
      alertsQueue.close(),
    ])
    await Promise.allSettled([redis.quit(), disconnectMongo()])
    logger.info("bye")
    logger.flush()
    process.exit(0)
  }
  process.on("SIGINT", () => void shutdown("SIGINT"))
  process.on("SIGTERM", () => void shutdown("SIGTERM"))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms).unref()
    ),
  ])
}

main().catch((error: unknown) => {
  logger.fatal({ err: errorMessage(error) }, "worker failed to start")
  logger.flush()
  // Give the pretty-print transport a moment to write the line.
  setTimeout(() => process.exit(1), 200)
})
