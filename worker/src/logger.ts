import { pino, type Logger } from "pino"

import type { WorkerEnv } from "./env"

export type { Logger }

/**
 * Structured JSON logs (one object per line) for production; readable,
 * coloured lines in development. Never log header values, request bodies or
 * full monitor URLs (they can carry tokens): log ids and hostnames instead.
 */
export function createLogger(env: WorkerEnv): Logger {
  const dev = env.NODE_ENV === "development"
  return pino({
    name: "worker",
    level: env.LOG_LEVEL ?? (dev ? "debug" : "info"),
    base: { service: "worker" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ["*.headers", "*.body", "*.authorization", "*.url"],
      censor: "[redacted]",
    },
    ...(dev && {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,service,name",
        },
      },
    }),
  })
}
