// Shared by the Next.js app and the worker. No React/Next imports in this folder.

/** "pending" = created or resumed, not checked yet. */
export const MONITOR_STATUSES = [
  "up",
  "down",
  "degraded",
  "paused",
  "pending",
] as const

export const HTTP_METHODS = ["GET", "POST", "HEAD"] as const

export const CHECK_INTERVALS_MINUTES = [1, 3, 5, 10, 30, 60] as const

export const DEFAULT_CHECK_INTERVAL_MINUTES = 5

/** Outcome of one check. "degraded" = up, but slower than the slow threshold. */
export const CHECK_STATUSES = ["up", "degraded", "down"] as const

/** Consecutive failed checks before a monitor is declared down. */
export const DEFAULT_FAILURE_THRESHOLD = 2

/** An up check slower than this is "degraded" (worker: SLOW_THRESHOLD_MS). */
export const DEFAULT_SLOW_THRESHOLD_MS = 2_000

/**
 * Response-time bands used for colouring (ResponseTimeText) and for the
 * "degraded" state. Below FAST is green, at or above SLOW is red, in between amber.
 */
export const RESPONSE_TIME_MS = {
  fast: 500,
  slow: 1500,
} as const

/** Per-check timeout. The form offers TIMEOUT_OPTIONS_MS; the schema accepts min–max. */
export const CHECK_TIMEOUT_MS = {
  default: 10_000,
  min: 1_000,
  max: 30_000,
} as const

export const TIMEOUT_OPTIONS_MS = [
  3_000, 5_000, 10_000, 15_000, 20_000, 30_000,
] as const

export const DEFAULT_EXPECTED_STATUS_CODES = "200-299"

/** Field limits for monitors (also enforced by the Mongoose model). */
export const MONITOR_LIMITS = {
  nameMax: 80,
  urlMax: 2048,
  headersMax: 20,
  headerNameMax: 100,
  headerValueMax: 2_000,
  bodyMax: 10_000,
  keywordMax: 200,
  tagsMax: 10,
  tagMax: 24,
  statusRangesMax: 20,
} as const

/** Redirect hops followed per check; every hop is re-validated by the SSRF guard. */
export const CHECK_MAX_REDIRECTS = 5

/** Response bytes read per check (only needed for keyword search). */
export const CHECK_MAX_BODY_BYTES = 1024 * 1024

export const CHECK_USER_AGENT = "PingBoardBot/1.0 (+uptime monitor)"

/** Single region for the MVP; stored so multi-region can be added later. */
export const DEFAULT_CHECK_REGION = "default"

/** Raw CheckResults are removed by a TTL index after this many days. */
export const CHECK_RESULT_RETENTION_DAYS = 30

/** DailyStat rows are removed by a TTL index after this many days. */
export const DAILY_STAT_RETENTION_DAYS = 365

/** Complete UTC days the rollup recomputes each run (covers missed runs). */
export const ROLLUP_LOOKBACK_DAYS = 3

/** The certificate expiry of https monitors is re-read at most this often. */
export const SSL_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

/** A certificate expiring within this many days gets an amber warning. */
export const SSL_WARN_DAYS = 14

/** SSL expiry alerts: one when ≤ 14 days are left, another at ≤ 3 (largest first). */
export const SSL_ALERT_DAYS = [14, 3] as const

/** Slow ("degraded") checks in a row before an opt-in degraded alert. */
export const DEGRADED_ALERT_STREAK = 5

export const ALERT_CHANNEL_TYPES = [
  "email",
  "discord",
  "slack",
  "telegram",
] as const

/** Kinds of alert messages. "test" comes from the "Send test alert" button. */
export const ALERT_KINDS = [
  "down",
  "recovered",
  "reminder",
  "ssl",
  "degraded",
  "test",
] as const

export const ALERT_DELIVERY_STATUSES = [
  "queued",
  "retrying",
  "sent",
  "failed",
  "skipped",
] as const

/** "Still down" reminders while an incident is open and not acknowledged. 0 = off. */
export const ALERT_REMINDER_MINUTES = [0, 30, 60] as const

/** How an incident ended. */
export const INCIDENT_RESOLUTIONS = ["recovered", "paused", "changed"] as const

export const ALERT_LIMITS = {
  channelsMax: 10,
  channelNameMax: 60,
  incidentNotesMax: 2_000,
  /** Delivery attempts per alert and channel: the first try + 3 retries. */
  deliveryAttempts: 4,
  /** First retry after this; doubles each time (30 s, 1 min, 2 min). */
  retryDelayMs: 30_000,
  /** Outbound request timeout for webhooks and the Resend API. */
  requestTimeoutMs: 10_000,
} as const

/** AlertLog rows are removed by a TTL index after this many days. */
export const ALERT_LOG_RETENTION_DAYS = 365

/** How often an open dashboard re-fetches its data. */
export const DASHBOARD_REFRESH_MS = 30_000

/** Colour scheme of a public status page. "auto" follows the visitor's system. */
export const STATUS_PAGE_THEMES = ["auto", "light", "dark"] as const

export const STATUS_PAGE_LIMITS = {
  slugMin: 3,
  slugMax: 40,
  titleMax: 80,
  descriptionMax: 500,
  displayNameMax: 60,
  announcementMax: 500,
  announcementsMax: 5,
  logoMaxBytes: 256 * 1024,
  /** Resolved incidents shown on the public page. */
  incidentDays: 14,
  /** Longest a cached public page (and badge) may be served for. */
  cacheMaxAgeSec: 60,
} as const

/** Addresses nobody can claim, so a page can't pass itself off as ours. */
export const RESERVED_STATUS_SLUGS = [
  "admin",
  "api",
  "app",
  "billing",
  "demo",
  "docs",
  "help",
  "login",
  "new",
  "pingboard",
  "security",
  "signup",
  "status",
  "support",
  "www",
] as const

/** Days shown in the long-term uptime bar on the monitor page. */
export const UPTIME_HISTORY_DAYS = 90

export const PLANS = ["free", "pro"] as const

export const OAUTH_PROVIDERS = ["google", "github"] as const

export const PASSWORD_MIN_LENGTH = 8

/** bcrypt ignores everything after 72 bytes, so longer passwords are rejected. */
export const PASSWORD_MAX_BYTES = 72

export const QUEUE_NAMES = {
  checks: "checks",
  /** Daily rollup and other housekeeping. */
  maintenance: "maintenance",
  /** Alert fan-out and delivery, so a slow email never delays a check. */
  alerts: "alerts",
} as const

/** BullMQ job names. Check jobs come from one job scheduler per monitor. */
export const JOB_NAMES = {
  check: "check",
  rollup: "daily-rollup",
  /** One alert event → one deliver job per channel. */
  alertDispatch: "dispatch",
  alertDeliver: "deliver",
  /** Every minute: "still down" reminders that are due. */
  reminderTick: "reminder-tick",
} as const
