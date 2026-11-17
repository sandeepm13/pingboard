import { DEFAULT_FAILURE_THRESHOLD } from "../constants"
import type { CheckStatus, MonitorStatus } from "../types"

// The monitor status state machine (CLAUDE.md §7). Pure, so the worker and
// the tests share exactly one definition.

export type MonitorState = {
  status: MonitorStatus
  consecutiveFailures: number
}

export type MonitorTransition = MonitorState & {
  previousStatus: MonitorStatus
  /** True when `status` differs from `previousStatus` ("status-changed"). */
  changed: boolean
}

/**
 * - A failed check adds one to `consecutiveFailures`; the monitor turns "down"
 *   only when it reaches `failureThreshold` (one blip is not an outage).
 *   Below that the status stays what it was, e.g. "up" or "pending".
 * - Any successful check resets the count and sets "up" or "degraded".
 * - "paused" never changes here: paused monitors aren't checked.
 */
export function nextMonitorState(
  previous: MonitorState,
  check: CheckStatus,
  failureThreshold: number = DEFAULT_FAILURE_THRESHOLD
): MonitorTransition {
  let next: MonitorState
  if (previous.status === "paused") {
    next = previous
  } else if (check === "down") {
    const consecutiveFailures = previous.consecutiveFailures + 1
    next = {
      consecutiveFailures,
      status:
        consecutiveFailures >= failureThreshold ? "down" : previous.status,
    }
  } else {
    next = { status: check, consecutiveFailures: 0 }
  }
  return {
    ...next,
    previousStatus: previous.status,
    changed: next.status !== previous.status,
  }
}

/** The first failed check of the current failure streak. */
export type CurrentFailure = {
  startedAt: Date
  statusCode: number | null
  errorMessage: string | null
}

/**
 * Remembers the first failure of a streak (an incident's start and cause);
 * any success clears it.
 */
export function nextCurrentFailure(
  previous: {
    currentFailure?: (Partial<CurrentFailure> & { startedAt: Date }) | null
    consecutiveFailures: number
  },
  check: {
    status: CheckStatus
    checkedAt: Date
    statusCode: number | null
    errorMessage: string | null
  }
): CurrentFailure | null {
  if (check.status !== "down") return null
  const kept = previous.currentFailure
  if (kept && previous.consecutiveFailures > 0) {
    return {
      startedAt: kept.startedAt,
      statusCode: kept.statusCode ?? null,
      errorMessage: kept.errorMessage ?? null,
    }
  }
  return {
    startedAt: check.checkedAt,
    statusCode: check.statusCode,
    errorMessage: check.errorMessage,
  }
}

/** Slow checks in a row; any up-and-fast or failed check resets it. */
export function nextSlowStreak(previous: number, check: CheckStatus): number {
  return check === "degraded" ? previous + 1 : 0
}
