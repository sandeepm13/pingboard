import { randomBytes } from "node:crypto"

import { defineConfig, devices } from "@playwright/test"

// End-to-end tests against a production build (`npm run build` first, with
// APP_URL=http://localhost:3200) plus the built worker (`npm run
// build:worker`), on their own MongoDB database and Redis db so nothing real
// is touched. Run them with `npm run test:e2e` (scripts/e2e.ts), which empties
// that database and Redis db before and after. See README → Tests.
//
// E2E_MONGODB_URI   default mongodb://127.0.0.1:27017 (database pingboard_e2e)
// E2E_REDIS_URL     default redis://127.0.0.1:6379/1 (must be empty or an
//                   earlier e2e run's: the reset refuses anything else)
//
// The golden path monitors https://example.com, so it needs internet access.

export const E2E = {
  baseURL: "http://localhost:3200",
  mongoUri: process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  mongoDb: "pingboard_e2e",
  redisUrl: process.env.E2E_REDIS_URL ?? "redis://127.0.0.1:6379/1",
  workerHealth: "http://127.0.0.1:3201/health",
}

// Generated per run. Playwright loads this file in every process, but only
// the main one starts the servers, so they all share the same values.
const secrets = {
  AUTH_SECRET:
    process.env.E2E_AUTH_SECRET ?? randomBytes(32).toString("base64"),
  ENCRYPTION_KEY:
    process.env.E2E_ENCRYPTION_KEY ?? randomBytes(32).toString("base64"),
}
process.env.E2E_AUTH_SECRET = secrets.AUTH_SECRET
process.env.E2E_ENCRYPTION_KEY = secrets.ENCRYPTION_KEY

const serverEnv = {
  ...secrets,
  MONGODB_URI: E2E.mongoUri,
  MONGODB_DB: E2E.mongoDb,
  REDIS_URL: E2E.redisUrl,
  APP_URL: E2E.baseURL,
  AUTH_URL: E2E.baseURL,
  AUTH_TRUST_HOST: "true",
  EMAIL_PROVIDER: "console",
  SSRF_ALLOW_PRIVATE: "false",
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: E2E.baseURL,
    // The installed Chrome: no browser download needed.
    ...devices["Desktop Chrome"],
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npx next start -p 3200",
      url: `${E2E.baseURL}/`,
      env: serverEnv,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "node worker/dist/index.mjs",
      url: E2E.workerHealth,
      env: {
        ...serverEnv,
        NODE_ENV: "production",
        LOG_LEVEL: "warn",
        WORKER_HEALTH_PORT: "3201",
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
