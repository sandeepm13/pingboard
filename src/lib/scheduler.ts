import "server-only"

import { Queue } from "bullmq"

import { QUEUE_NAMES } from "@shared/constants"
import {
  scheduleMonitor,
  unscheduleMonitor,
  type ChecksQueue,
  type SchedulableMonitor,
} from "@shared/scheduler"

import { getRedis } from "./redis"

// Keeps BullMQ in step with monitor changes made in the app. Best effort: if
// Redis is unreachable the change is still saved, and the worker's reconcile
// (on boot and every few minutes) creates/removes the scheduler later.

const SCHEDULER_TIMEOUT_MS = 3_000

const globalForQueue = globalThis as typeof globalThis & {
  __checksQueue?: ChecksQueue
}

function checksQueue(): ChecksQueue {
  globalForQueue.__checksQueue ??= new Queue(QUEUE_NAMES.checks, {
    connection: getRedis(),
  })
  return globalForQueue.__checksQueue
}

async function bestEffort(action: string, task: () => Promise<void>) {
  try {
    await Promise.race([
      task(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("timed out")),
          SCHEDULER_TIMEOUT_MS
        ).unref()
      ),
    ])
  } catch (error) {
    console.error(
      `[scheduler] couldn't ${action}; the worker will reconcile it:`,
      error instanceof Error ? error.message : error
    )
  }
}

export function syncMonitorSchedule(
  monitor: SchedulableMonitor,
  options: { restart?: boolean } = {}
): Promise<void> {
  return bestEffort(`schedule monitor ${monitor.id}`, () =>
    scheduleMonitor(checksQueue(), monitor, options)
  )
}

export function removeMonitorSchedule(monitorId: string): Promise<void> {
  return bestEffort(`unschedule monitor ${monitorId}`, () =>
    unscheduleMonitor(checksQueue(), monitorId)
  )
}
