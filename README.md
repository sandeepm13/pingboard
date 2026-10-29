# PingBoard

**Know your site is down before your users do.**

PingBoard is an uptime monitor for websites and APIs. You give it a URL, and it
checks that URL every few minutes from the server. It records whether the URL
was up, the HTTP status code and how long it took to answer, keeps the history,
and alerts you by email, Discord, Slack or Telegram when something breaks and
again when it recovers. Each account can publish a public status page, such as
`/status/your-company`, so your users can see what's going on.

Built for indie developers, students and small teams who want monitoring that
is quick to set up and not enterprise-heavy.

> Screenshots: _placeholders, add images to `docs/screenshots/` and link them here._
>
> | Dashboard                        | Monitor page                   | Public status page                 |
> | -------------------------------- | ------------------------------ | ---------------------------------- |
> | `docs/screenshots/dashboard.png` | `docs/screenshots/monitor.png` | `docs/screenshots/status-page.png` |

## Features

- **Monitors:** `GET` / `POST` / `HEAD`, checked every 1, 3, 5, 10, 30 or 60
  minutes, with a timeout, expected status codes (`200-299, 301, 4xx`),
  optional headers and body (encrypted at rest), and an optional keyword that
  must appear in the response.
- **Status logic:** a monitor is **down after 2 failed checks in a row** and
  **back up on the first good check**. A check that is correct but slower than
  2 s counts as up but is marked **degraded** (amber).
- **Dashboard:** every monitor's status, last status code, response time and a
  24-hour uptime bar. It refreshes itself every 30 s.
- **Monitor page:** response-time chart (1 h / 24 h / 7 d / 30 d), uptime for
  24 h, 7 d and 30 d, a 90-day history, recent checks and incidents.
- **Incidents and alerts:** one incident per outage, one DOWN alert and one
  RECOVERED alert per incident (never one per check), optional "still down"
  reminders, and SSL-expiry warnings at 14 and 3 days.
- **Public status pages:** only the names, statuses and uptime you choose to
  show. Never URLs, headers or error details (unless you opt in to URLs).
  Includes a README badge.
- **Plans:** Free (10 monitors, every 5 min, email alerts) and Pro (50
  monitors, every minute, every channel). There is no billing yet; plan
  limits live in `src/lib/shared/plans.ts`.

## How it works

```
             ┌──────────────┐  server actions   ┌──────────┐
 browser ───▶│  Next.js web │──────────────────▶│ MongoDB  │◀─┐
             │ (src/, :3000)│                   └──────────┘  │ results,
             └──────┬───────┘                                 │ incidents
                    │ add/remove one schedule per monitor     │
                    ▼                                         │
               ┌─────────┐   due checks    ┌──────────────────┴┐
               │  Redis  │────────────────▶│ worker (worker/)  │──▶ your URLs
               │ BullMQ  │◀────────────────│ checks, incidents,│──▶ email / Discord /
               └─────────┘  next schedule  │ alerts, rollups   │    Slack / Telegram
                                           └───────────────────┘
```

PingBoard has two processes that share one database:

1. **The web app** (`src/`, Next.js) holds every page, the login and the
   server actions. Creating, editing, pausing or deleting a monitor writes
   it to MongoDB and adds, changes or removes that monitor's **schedule** in
   Redis (one BullMQ job scheduler per monitor).
2. **The worker** (`worker/`, plain Node.js) picks up each check when it's
   due. It reloads the monitor, makes the HTTP request and saves the result.
   It then moves the monitor between up, degraded and down, opens or closes
   the incident, and queues alerts. Alerts go out through a separate queue,
   so a slow mail server never delays a check. Every night it rolls raw
   checks up into daily stats; raw checks are deleted after 30 days, daily
   stats are kept for a year. On start-up, and every 10 minutes, it compares
   Redis with MongoDB and repairs any schedule the web app couldn't update.

Code both processes need, such as database models, validation schemas, the
check runner, the SSRF guard and the uptime maths, lives once in
`src/lib/shared/` (imported as `@shared/*`).

**Safety.** Users type URLs that our server then requests, so every request
goes through one guard (`src/lib/shared/security/`). It allows only
http/https and rejects private, loopback, link-local (cloud metadata) and
other internal addresses. The guard checks every IP the DNS returns,
connects to the IP it checked (which defeats DNS rebinding), and re-checks
every redirect. Alert webhooks are limited to the real Discord, Slack and
Telegram hosts. Header values, bodies, webhook URLs and bot tokens are
encrypted with AES-256-GCM and are never sent back to the browser.

## Run it locally

You need **Node.js 22+**, and **Docker** (for MongoDB and Redis), or your own
MongoDB and Redis.

```bash
npm install
cp .env.example .env          # then fill it in, see below
npm run services:up           # MongoDB + Redis in Docker (docker compose)
npm run dev:all               # web on http://localhost:3000 + the worker
```

`npm run services:up` (`docker-compose.services.yml`) runs **MongoDB and Redis
only**, bound to 127.0.0.1. The web app and the worker run on your machine
with `npm`. To run the whole app in Docker (or deploy it), see
[DEPLOYMENT.md](DEPLOYMENT.md).
`npm run services:down` stops the containers; your data stays in Docker volumes.

With the compose services, your `.env` needs at least:

```bash
NODE_ENV=development
APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000
MONGO_INITDB_ROOT_USERNAME=pingboard
MONGO_INITDB_ROOT_PASSWORD=<a password>
MONGODB_URI=mongodb://pingboard:<that password>@127.0.0.1:27018/pingboard?authSource=admin
MONGODB_DB=pingboard
REDIS_PASSWORD=<another password>
REDIS_URL=redis://:<that password>@127.0.0.1:6379
AUTH_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
ENCRYPTION_KEY=<openssl rand -base64 32>
```

Emails, including password resets, are printed to the terminal until you set
`EMAIL_PROVIDER`.

Useful scripts:

| Command                                                  | What it does                          |
| -------------------------------------------------------- | ------------------------------------- |
| `npm run dev` / `npm run dev:worker` / `npm run dev:all` | Web, worker, or both, with reload     |
| `npm run build:all` then `npm run start:all`             | Production build and run of both      |
| `npm run lint` · `npm run typecheck` · `npm run format`  | Checks                                |
| `npm test`                                               | Unit tests (Vitest)                   |
| `npm run test:e2e`                                       | Browser tests (Playwright), see below |
| `npm run load-test`                                      | Worker load test, see below           |

## Environment variables

Every variable is documented in [`.env.example`](.env.example). The important ones:

| Variable                                         | Used by     | Required       | Notes                                                                                                       |
| ------------------------------------------------ | ----------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `APP_URL`                                        | web, worker | yes            | Public base URL. Links in emails and alerts; baked into static pages at build time                          |
| `AUTH_URL`                                       | web         | yes            | Same as `APP_URL`; used for OAuth callbacks                                                                 |
| `AUTH_SECRET`                                    | web         | yes            | ≥ 32 random characters; signs the session cookie                                                            |
| `AUTH_TRUST_HOST`                                | web         | behind a proxy | `true` behind nginx/Caddy/Docker                                                                            |
| `MONGODB_URI`, `MONGODB_DB`                      | web, worker | yes            | Atlas or local MongoDB                                                                                      |
| `REDIS_URL`                                      | web, worker | yes            | Queues and rate limits (`maxmemory-policy noeviction`)                                                      |
| `ENCRYPTION_KEY`                                 | web, worker | yes            | 32 bytes, base64. Encrypts headers, bodies and webhook secrets. **Losing it makes them unreadable**         |
| `AUTH_GOOGLE_ID/SECRET`, `AUTH_GITHUB_ID/SECRET` | web         | no             | Shows the Google/GitHub buttons when set                                                                    |
| `EMAIL_PROVIDER`                                 | web, worker | in production  | `console` (dev only), `resend` (+ `RESEND_API_KEY`) or `smtp` (+ `SMTP_*`); `EMAIL_FROM`                    |
| `WORKER_CONCURRENCY`                             | worker      | no             | Checks run in parallel (default 50)                                                                         |
| `WORKER_HEALTH_HOST/PORT`                        | worker      | no             | `GET /health` (default `127.0.0.1:3001`)                                                                    |
| `SLOW_THRESHOLD_MS`                              | worker      | no             | Above this, an up check is "degraded" (default 2000)                                                        |
| `SSRF_ALLOW_PRIVATE`                             | web, worker | no             | **Development only:** lets monitors reach `localhost`. Both processes refuse to start with it in production |

## Tests

```bash
npm test                       # unit tests, no services needed
```

Covers the check runner, the 2-failures state machine, the uptime and
percentile maths, time zones (including +5:30, +5:45 and DST changes), the
SSRF guard (including DNS answers and redirects to private addresses), the
schemas, alert formatting and delivery, and the status-page whitelist.

**Integration tests** run the real checker against MongoDB and BullMQ against
Redis. They are skipped unless you point them at **throwaway** services.
Each run creates its own database and key prefix and removes them afterwards:

```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 TEST_REDIS_URL=redis://127.0.0.1:6379/15 npm test
```

**End-to-end tests** (Playwright, using your installed Chrome) run against a
production build, plus the built worker on its own database and Redis db.
They cover the golden path (sign up → add monitor → first check → down →
incident → public status page shows the outage), SSRF in every form, ownership,
rate limits, security headers, and every page at 375/768/1024/1440 px with
axe (WCAG 2.1 AA) in dark and light. They need internet access, because the
golden path monitors `https://example.com`.

```bash
APP_URL=http://localhost:3200 npm run build && npm run build:worker
E2E_MONGODB_URI=mongodb://127.0.0.1:27017 E2E_REDIS_URL=redis://127.0.0.1:6379/1 npm run test:e2e
```

`test:e2e` empties the `pingboard_e2e` database and that Redis db before and
after the run. It refuses to start if the Redis db holds keys that an earlier
e2e run didn't create.

**Load test:** seeds 300 monitors that are checked every minute, runs the
built worker against a local test site for 10 minutes, and reports duplicates,
gaps and schedule lag:

```bash
npm run build:worker
LOADTEST_MONGODB_URI=mongodb://127.0.0.1:27017 LOADTEST_REDIS_URL=redis://127.0.0.1:6379/2 npm run load-test
```

The worker also logs `schedule lag` (avg / p95 / max delay between when a
check was due and when it started) once a minute, and `GET /health` reports
the latest figures.

## Project layout

```
src/app/            pages and route handlers (marketing, auth, /app, /status/[slug], api)
src/components/     UI (shadcn/ui primitives in ui/, PingBoard components by feature)
src/actions/        server actions (each checks the session and ownership)
src/lib/            server-only helpers (auth, env, rate limits, read models)
src/lib/shared/     models, schemas, check runner, SSRF guard, stats; used by web AND worker
worker/src/         the worker: scheduling, checks, incidents, alerts, rollups
tests/              Vitest unit (+ integration/) tests
e2e/                Playwright tests
scripts/            e2e runner and load test
```

`CLAUDE.md` holds the coding rules and design system; `PROGRESS.md` holds
decisions and known issues.
