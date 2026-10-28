# PROGRESS.md — PingBoard

Update after every stage. A stage is done only when it meets the Definition of Done in `CLAUDE.md` (lint + build pass, works in the browser, this file updated).

Current stage: **9 — Quality pass (done and verified on an isolated stack; waiting for your OK)**. Stages 3, 5, 6, 7 and 8 are also still waiting for your OK. Stages 3 and 4 were built by two sessions in the same tree at the same time (see Known issues).

## Stages

- [ ] **1. Setup & design system** — everything verified except `docker compose up` (see Known issues)
  - [x] Next.js 16 + TS strict (`noUncheckedIndexedAccess`) + Tailwind v4 + ESLint + `src/`
  - [x] `/worker` with its own tsconfig importing `@shared/*` from `src/lib/shared`
  - [x] shadcn/ui (Radix, nova): all 21 requested components (`form` hand-written)
  - [x] Dark-first tokens incl. up/down/degraded/paused, Inter + JetBrains Mono, documented in CLAUDE.md → Design system
  - [x] next-themes toggle (dark default, light, system)
  - [x] MarketingLayout + AppLayout (sidebar → drawer on mobile), placeholder pages
  - [x] Logo, StatusDot, StatusBadge, ResponseTimeText, UptimeBar, EmptyState, PageHeader, skeletons
  - [x] `/styleguide` with fake data
  - [x] Worker env validated with Zod (`worker/src/env.ts`); hot-reload-safe Mongo helper (`src/lib/shared/db.ts`)
  - [ ] docker-compose for local MongoDB + Redis — file written, **not yet started** (Docker engine down)
  - [x] npm scripts `dev`, `dev:worker`, `dev:all`, `services:up/down/logs`, `typecheck`, `format`
  - [x] Prettier (+ Tailwind class sorting), `git init`, `.gitignore` excludes `.env*` except `.env.example`
  - [x] `npm run lint`, `npm run typecheck`, `npm run build` pass
  - [x] Browser check (headless Chrome, 1280px + 375px, dark + light): no horizontal scroll, no console/hydration errors, drawer closes on navigate, uptime tooltips, form validation errors, theme toggle persists
- [ ] **2. Auth** — done except: live Redis rate-limit test (Docker down) and real Google/GitHub login (needs your keys)
  - [x] Shared Mongo connection helper (`src/lib/shared/db.ts`, now with `dbName`) used by app (`src/lib/db.ts`) and worker
  - [x] `User` model: name, email (unique, lowercased), passwordHash (bcrypt, never selected by default), image, plan (free|pro), timezone, createdAt/updatedAt, + emailVerified, linked accounts, onboardedAt, draftMonitor, sessionVersion
  - [x] Auth.js v5: email+password (bcryptjs, cost 12), Google, GitHub (buttons shown only when keys are set); session has `id` + `plan`
  - [x] Pages: `/signup`, `/login`, `/forgot-password` (dev logs link), `/reset-password`, `/onboarding` (first URL saved as draft, or skip)
  - [x] `src/proxy.ts`: `/app/*` + `/onboarding` need login; logged-in users on `/login`/`/signup`/`/forgot-password` go to `/app` (or `/onboarding` if not finished)
  - [x] `requireUser()` / `requireApiUser()`; used by onboarding actions and the app shell
  - [x] Forms: react-hook-form + shared Zod schemas, field errors, server errors in alerts, loading buttons
  - [x] Redis rate limits on login, signup, forgot-password (fail-open + logged when Redis is down)
  - [x] Rate limits verified against a live Redis (2026-10-26: signup 5/h per IP answered "Too many attempts. Try again in 30 minutes.")
  - [x] Logout from the user menu
  - [x] `npm run lint`, `typecheck`, `build` pass
  - [x] Browser e2e (production build, temporary in-memory MongoDB, 25/25 checks): signup errors + success, onboarding redirect/validation/draft, logout, `/app` blocked when logged out, wrong + right password, duplicate email, forgot (generic message, no link in prod), reset (mismatch, success, single-use), old sessions killed after reset, old password rejected, open-redirect `callbackUrl` ignored, mobile layout
  - [x] Google/GitHub buttons redirect to the provider with correct callback URL, scopes and state/PKCE (checked with placeholder keys)
  - [ ] Real Google/GitHub round-trip (needs your keys)
- [ ] **3. Monitors CRUD** — built and verified; waiting for your OK
  - [x] `Monitor` model (`shared/models/monitor.ts`; index `{userId, createdAt:-1}`) + `CheckResult` model (TTL 30 days on `checkedAt`, index `{monitorId, checkedAt:-1}`)
  - [x] Shared Zod schema (`shared/schemas/monitor.ts`) used by the form and the server actions; status codes as `200-299, 301, 4xx`
  - [x] Plan limits in one file (`shared/plans.ts`): free 10 monitors / ≥ 5 min, pro 50 / ≥ 1 min; enforced on the server, mirrored in the UI
  - [x] Server actions: create / update / pause / resume / delete / test / dismiss draft; all `requireUser()` + `{_id, userId}` scoping; foreign or malformed ids = "not found"
  - [x] SSRF guard in `shared/security` (`ip.ts`, `url-policy.ts`, `ssrf.ts`) + shared check runner (`shared/checks/http-check.ts`): DNS checked, IP pinned, redirects re-validated per hop, body capped, timeout enforced
  - [x] `SSRF_ALLOW_PRIVATE` (dev only) in app + worker env; refused when `NODE_ENV=production`
  - [x] Header values + body encrypted at rest (AES-256-GCM, `ENCRYPTION_KEY`); header values never sent back to the browser
  - [x] Pages: `/app/monitors` (search, status + tag filters, empty state, onboarding-draft notice), `/app/monitors/new`, `/app/monitors/[id]/edit`; loading skeletons + error boundary; `/app` → `/app/monitors`
  - [x] "Test now" (rate-limited 10/min per user) shows up/down, status code, response time, error
  - [x] Unit tests: 119 Stage 3 tests passing, now inside `npm test`'s 149 (SSRF literals incl. decimal/hex/octal/short IPv4, IPv6, IPv4-mapped, NAT64/6to4, DNS private/mixed answers, redirect to private, rebinding pin, header drop cross-origin, timeout, body cap, schema)
  - [x] `npm run lint`, `typecheck`, `build`, `build:worker` pass
  - [x] Browser e2e (production build, throwaway local MongoDB, 29/29): onboarding draft → prefilled form → Test now (Up/200/ms, keyword miss = Down) → create with tags + secret header; encrypted in DB; 8 private/invalid URLs rejected; `localtest.me` (DNS → 127.0.0.1) rejected server-side on test and save; filters; edit keeps hidden header; pause/resume (list + edit page); user B gets 404 on user A's monitor; plan limit page at 10; delete with confirm (cancel + confirm); 360px no horizontal scroll; no console errors
  - [x] "Test now" rate limit verified against live Redis (11th click: "That's a lot of tests. Try again in 59 s.")
- [x] **4. Checker engine** — done except graceful SIGTERM (can't be sent on Windows; verify in the Docker stage)
  - [x] One BullMQ job scheduler per active monitor (id = monitor id, `every` = interval) via shared `src/lib/shared/scheduler.ts`
  - [x] App keeps schedulers in sync on create / edit (URL change → immediate re-check) / pause / resume / delete; best effort when Redis is down
  - [x] Reconcile Redis ↔ Mongo on worker boot and every 10 min (adds missing, fixes interval, removes orphans)
  - [x] HTTP check: SSRF guard + DNS check + pinned IP, method/headers/body/timeout, expected codes, keyword, ≤ 5 redirects (each re-validated), first 1 MB only, `performance.now()` timing
  - [x] `up` / `degraded` (up but > `SLOW_THRESHOLD_MS`, default 2000) / `down`; plain-word errors ("Timeout after 10s", "DNS not found", "Connection refused", "SSL error: …", "Unexpected status 503", "Keyword not found")
  - [x] `CheckResult` saved per check (+ `status` field), 30-day TTL index verified in Atlas
  - [x] Monitor updated (`lastCheckedAt`, `lastStatusCode`, `lastResponseTimeMs`, `consecutiveFailures`, `status`); down after 2 failures, up after 1 success; `status-changed` event emitted on every transition
  - [x] SSL expiry read at most once a day per https monitor (separate TLS handshake to the pinned IP) → `sslExpiresAt`
  - [x] Concurrency 20, `attempts: 1` (no BullMQ retries), SIGTERM/SIGINT handler that drains in-flight checks, pino logs, `GET /health`
  - [x] Daily rollup → `DailyStat` (uptime %, avg/min/max/p95, counts), unique per monitor+day, 365-day TTL; 00:15 UTC + on boot, last 3 days, idempotent
  - [x] Vitest (149 tests): check function (200, 500/503, slow → degraded, timeout, keyword missing, 1 MB cap, POST, connection refused, DNS not found, private literal / private DNS / mixed DNS / IPv4-mapped metadata, redirect to private, redirect loop capped at 5, cross-origin header drop), state machine, reconcile plan, stats/rollup maths; existing SSRF + schema tests ported
  - [x] `npm run lint`, `typecheck`, `test`, `build`, `build:worker` pass
  - [x] Live (production build on :3200 + the already-running `npm run dev:worker`, hot-reloaded into this code; Atlas; Memurai): https://example.com every 1 min → one CheckResult per minute (7 in a row, 50–244 ms); keyword monitor → pending after failure 1, **down after failure 2**; pause → scheduler removed, no further checks; resume → immediate check, up; clearing the keyword → **up after 1 success**; edit keeps the rhythm; delete removes scheduler + results + daily stats; `/health` 200; reconcile + rollup checked against live data; test user and monitors deleted afterwards
  - [ ] Graceful shutdown on a real SIGTERM (Windows can't send one; do it in Docker)
- [ ] **5. Dashboard & monitor detail** — built and verified; waiting for your OK
  - [x] `/app` dashboard: summary cards (total, up, down, degraded, paused, avg response 24h, overall uptime 24h); status cards filter the list
  - [x] Monitor list: status, name, URL, last code (2xx green / 3xx blue / 4xx amber / 5xx red), last response time, 24 hourly bars (tooltip: time in your zone, uptime %, checks), 24h uptime, "checked 40s ago"; search/status/tag filters kept
  - [x] Down monitors first with a red highlight; tab title "(N down) Dashboard · PingBoard"; screen-reader announcement when a monitor goes down / recovers
  - [x] Auto-refresh every 30 s by polling `GET /api/dashboard` (paused in hidden tabs; failed poll keeps data + shows "Couldn't refresh")
  - [x] `/app/monitors/[id]`: header (name, URL, status, Test now, Pause/Resume, Edit); stat cards (uptime 24h/7d/30d, avg + p95, last code, SSL days); response-time chart 1h/24h/7d/30d (7d/30d from DailyStat, failed checks shaded red); 90-day bar; recent checks (keyset pages, failures only); incidents placeholder
  - [x] Times in the user's time zone (`User.timezone`); daily figures labelled UTC days
  - [x] Queries aggregate in MongoDB on the `{monitorId, checkedAt}` index / DailyStat; nothing loads all results into memory
  - [x] Loading skeletons, "Waiting for first check…" states, error boundary for all of `/app`, cards instead of tables below `sm`/`lg`
  - [x] `/styleguide`: `info` token, StatCard, StatusCodeText, chart demo; CLAUDE.md updated
  - [x] `npm run lint`, `typecheck`, `test` (158), `build`, `build:worker` pass
  - [x] Browser e2e (production build on :3200 + your running `dev:worker`, Atlas, headless Chrome, user zone Asia/Kolkata vs browser zone New York): 63/63 checks (setup 1, desktop 43, ownership/errors 6, mobile/theme/styleguide 13) — see the Stage 5 entry under Known issues for what wasn't covered
  - [x] Incidents list (Stage 6)
- [ ] **6. Incidents & alerts** — built and verified; waiting for your OK
  - [x] Down after 2 consecutive failures; recovery on first success (monitor status from Stage 4)
  - [x] `Incident` model (monitorId, userId, startedAt, confirmedAt, resolvedAt, durationSeconds, resolution, cause {statusCode, errorMessage}, checksFailed, acknowledgedAt, notes, reminder fields); **unique partial index** = never two open incidents per monitor (duplicate insert rejected with E11000 in the live test)
  - [x] Open/close derived from stored monitor state on every check + 10-min reconcile (not from the in-process event); pause closes as "paused", URL change as "changed", delete removes incidents + alert logs
  - [x] `AlertChannel` (email, Discord webhook, Slack webhook, Telegram bot token + chat id), secrets encrypted, masked in the UI; host allow-list + SSRF guard + pinned IP on every send
  - [x] `/app/alerts`: add / edit / enable / delete channels, setup help per type, "Send test alert" (rate-limited), reminder setting (off / 30 / 60 min), recent alerts log
  - [x] Per-monitor channel choice (default: all, incl. future channels) + opt-in "alert when slow" in the monitor form
  - [x] BullMQ queue `alerts` (dispatch → one deliver job per channel, 3 retries with exponential backoff, permanent errors not retried), every delivery stored in `AlertLog` (unique per event + channel → no duplicates)
  - [x] Messages: DOWN "🔴 [name] is DOWN — 503 Service Unavailable — https://… — since 10:42 IST", RECOVERED "🟢 [name] is back UP after 7m 12s", reminders, SSL at ≤ 14 and ≤ 3 days, slow after 5 checks in a row; Discord embed, Slack blocks, Telegram HTML, HTML email with a button (+ text part)
  - [x] At most one DOWN alert per incident + optional reminders; acknowledging stops them
  - [x] `/app/incidents` (ongoing first, filter by monitor / period / state in the URL, keyset "Older" pages), incident page (timeline, stat cards, failed checks, notes, Acknowledge), incidents card on the monitor page
  - [x] Email via one `sendEmail()`: Resend (REST) or SMTP (nodemailer), `console` for development; forgot-password now sends a real email
  - [x] `/styleguide` "Incidents & alerts" section; CLAUDE.md updated
  - [x] `npm run lint`, `typecheck`, `test` (202), `build`, `build:worker` pass
  - [x] Live outage test (see Known issues → Stage 6 for details)
  - [ ] Real Discord / Slack / Telegram / Resend / SMTP delivery (needs your webhook, bot or keys)
  - [x] Daily rollup job → `DailyStat` — built in Stage 4
- [ ] **7. Public status page** — built and verified; waiting for your OK
  - [x] `StatusPage` model: userId, unique slug, title, description, logoUrl, monitors (ordered, each with a public display name), showResponseTimes, showUrls, isPublic, theme (auto/light/dark), announcements; `StatusPageLogo` for the image bytes
  - [x] Editor `/app/status-pages`: list, new, edit (pick monitors, drag to reorder + arrow buttons, public names, theme, switches), logo upload, announcements, share card (copy link, copy badge Markdown), preview, delete
  - [x] Public `/status/[slug]`: banner (All systems operational / Degraded performance / Partial outage / Major outage / No status yet), per service status + 90-day bar with per-day tooltip + 90-day uptime %, optional 24 h response-time chart, incidents of the last 14 days (duration, start, resolved time), announcements, "Powered by PingBoard" (free plan)
  - [x] Only whitelisted fields reach the page (no URLs unless allowed, no headers, bodies, codes or error text, no monitor ids); a page only ever shows its owner's monitors
  - [x] Cached ≤ 60 s (`use cache`, revalidate 30 s / expire 60 s), on-demand invalidation from every editor action, open pages refresh every 60 s
  - [x] SEO title, description, canonical, Open Graph + Twitter tags; generated OG image with the current status
  - [x] Badge `/api/badge/<slug>.svg` (up green / down red / degraded + partial amber / unknown grey)
  - [x] Plan limits: free 1 page, pro 5; branding on free only
  - [x] `/styleguide` "Status pages" section; CLAUDE.md updated
  - [x] `npm run lint`, `typecheck`, `test` (224), `build`, `build:worker` pass
  - [x] Browser e2e on an isolated stack: 95 checks (see Known issues → Stage 7)
- [ ] **8. Landing page, pricing, docs & settings** — built and verified; waiting for your OK
  - [x] `/`: hero ("Know your site is down before your users do.", Start monitoring free / See live demo), live preview built from the app's own StatusBadge / UptimeBar / ResponseTimeText + an SVG sparkline (4 sample monitors, Checkout goes down and recovers every few seconds, pause button), "Try it now", features (6), how it works (3 steps), Discord + email alert previews rendered by the real `downMessage` / `recoveredMessage`, FAQ (6, native `<details>` + FAQPage JSON-LD), final CTA. No logos or testimonials.
  - [x] "Try it now": anonymous one-time GET from our server (status, code, response time, plain-word error), same SSRF guard with private addresses **always** refused, nothing stored; rate limits 5 / 10 min + 30 / day per IP and 300 / h globally
  - [x] `/demo`: a sample status page through the real `toPublicStatusView` + `PublicStatusView` (bars end today)
  - [x] `/pricing`: Free and Pro cards + comparison table + FAQ, all limits read from `PLAN_LIMITS`; placeholder prices; Pro = "Join waitlist" (email-only `WaitlistEntry`, rate-limited, same answer whether already listed)
  - [x] Plan limits now include alert channel types: **Free = email only, Pro = all four**, enforced in the channel actions (create / edit / enable / test) and in the worker's dispatch; the alerts UI marks chat types "Pro" and existing blocked channels "Needs the Pro plan"
  - [x] `/docs`: getting started, adding a monitor, alert channels (email, Discord, Slack, Telegram), status pages, status badge; sidebar on desktop, collapsible menu on mobile, previous/next links
  - [x] `/app/settings`: profile (name, read-only email, time zone with current IANA names + "use this device's zone"), password change / set, connected logins (connect via signed link intent, disconnect only if another login remains), "still down" reminders, plan summary, delete account (type email + password; removes monitors and their schedulers, check results, daily stats, incidents, alert logs, channels, status pages + logos + cached tags, reset tokens, then the user; signs out)
  - [x] SEO: `metadataBase`, per-page title / description / canonical / Open Graph / Twitter tags (`pageMetadata()`), generated default OG image, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, apple icon (favicon `icon.svg` already existed)
  - [x] Motion (`motion` package, the current name of Framer Motion) via `LazyMotion`: reveal-on-scroll, hero preview transitions; off for `prefers-reduced-motion` (CSS fallback also covers no-JS), hero preview starts paused
  - [x] `/styleguide` "Marketing & settings" section; CLAUDE.md updated
  - [x] `npm run lint`, `typecheck`, `test` (232), `build`, `build:worker` pass
  - [x] Browser e2e on an isolated stack (see Known issues → Stage 8): 69 interactive checks + 36 page × width × theme layout checks
- [ ] **9. Quality pass** — done; waiting for your OK (audit list and results: Known issues → Stage 9)
  - [x] Audit of the whole app, problems grouped by priority, then fixed (see Stage 9 under Known issues)
  - [x] Checker accuracy: live Redis test proves one run per slot, re-syncs add no runs, a restart runs the overdue slot once (no replay, no skip); uptime maths tests (rounding, sums vs averages, daily slots); time-zone tests (+5:30, +5:45, −2:30, DST in New York and Lord Howe)
  - [x] Uptime never rounds to 100 % with a failed check (or 0 % with a passed one); uptime-bar tooltips and screen-reader summary floor instead of rounding; the summary is weighted by checks
  - [x] Schedule lag measured (`schedule lag` log line every minute + `/health`)
  - [x] Load test: 300 monitors × 1 min for 10 min: 0 duplicates, 0 gaps; `WORKER_CONCURRENCY` default 20 → **50** (avg lag 1.76 s → 0.17 s)
  - [x] Security: CSP + security headers, env validated at server start (`SSRF_ALLOW_PRIVATE` in production now stops the server), `/styleguide` 404 in production, `method="post"` on every form (passwords and header tokens could reach the URL before hydration), ownership / Zod / rate limits / secrets re-reviewed and e2e-tested
  - [x] SSRF: unit table across save / Test now / landing checker + check runner; e2e through the real forms (localhost, 127.0.0.1, 10.x, 192.168.x, 169.254.169.254, [::1], `localtest.me` → 127.0.0.1)
  - [x] Accessibility + responsive: every page at 375 / 768 / 1024 / 1440 px (no horizontal scroll), axe WCAG 2.1 AA in dark and light (fixed: light status badge contrast, dark destructive contrast, account button label-in-name, unlabelled logo input, unfocusable scrolling code blocks), keyboard (skip link, focus ring on every tab stop checked, mobile drawer)
  - [x] Error / 404: `global-error`, root `error` + `not-found` (real 404 status), `/app` `not-found`
  - [x] Vitest: 261 unit tests + 6 integration tests (checker + incidents on MongoDB, schedulers on Redis)
  - [x] Playwright: golden path (sign up → monitor → first check → down → incident → public outage), security, accessibility — 31 tests
  - [x] Clean-up: dead code removed (`ComingSoon`, `CheckerEventBus`), unused env vars removed from `.env.example`, no `console.log`, lint/typecheck clean
  - [x] README.md
  - [x] `npm run lint`, `typecheck`, `test`, `build`, `build:worker` pass
- [ ] **10. Deploy with Docker**
  - [ ] Production Dockerfiles (web + worker), multi-stage, non-root
  - [ ] docker-compose (web, worker, mongo, redis) with healthchecks
  - [ ] Production env checklist, backups note, deploy docs

## Decisions

_Record each decision with date and reason. Pin exact dependency versions here in Stage 1._

- 2026-10-25 — Single repo; Next.js app in `src/`, worker in `/worker`, shared models/types/Zod/SSRF guard in **`src/lib/shared`** (alias `@shared/*`; moved from `/shared` at your request in Stage 1).
- 2026-10-25 — "Down" = 2 consecutive failed checks; recovery = first success after down.
- 2026-10-25 — Raw checks TTL 30 days; daily stats kept ≥ 1 year.
- 2026-10-25 — Payments/billing are out of MVP scope; pricing page is informational until billing is added.
- 2026-10-25 — Kept Next 16 defaults `cacheComponents` + `partialPrefetching` on. Consequence: no `Math.random()`/`new Date()` during prerender (styleguide uses a seeded PRNG; footer has no year).
- 2026-10-25 — shadcn/ui on **Radix** base (not Base UI) because the requested `form` (react-hook-form) component targets Radix. Registry's `form` is empty, so `src/components/ui/form.tsx` is hand-written in the classic pattern.
- 2026-10-25 — `primary` is near-white (dark) / near-black (light), Vercel-style, so green stays reserved for "up". Response-time bands: < 500 ms green, < 1500 ms amber, else red (`RESPONSE_TIME_MS`).
- 2026-10-25 — Worker runs with `tsx watch` in dev (reads `.env` via `--env-file-if-exists`); production bundling decided in Stage 10.
- 2026-10-25 — Local MongoDB/Redis require passwords (from `.env`), bound to 127.0.0.1 only; Redis `maxmemory-policy noeviction` for BullMQ. Docker MongoDB is published on host port **27018** (`MONGO_HOST_PORT`) because this machine already runs a native MongoDB service on 27017.
- 2026-10-25 — Stage 2: app moved from `/monitors`… to **`/app/*`** (`/app` = monitors dashboard) to match the "/app routes need login" rule; proxy matcher is `/app/:path*`.
- 2026-10-25 — Stage 2: **next-auth 5.0.0-beta.32** (v5 is the App-Router version Auth.js documents; v4 is legacy). Pinned exactly because it's a beta.
- 2026-10-25 — Stage 2: **No `@auth/mongodb-adapter`**: it needs `mongodb@6`, Mongoose 9 uses `mongodb@7`. JWT sessions (required by Credentials anyway) + our own User upsert in the `signIn` callback.
- 2026-10-25 — Stage 2: **bcryptjs** (pure JS) instead of native `bcrypt`, since npm 12 blocks native install scripts; passwords limited to 72 bytes (bcrypt's limit).
- 2026-10-25 — Stage 2: OAuth creates/links accounts only with a provider-verified email; linking to an unverified password account removes that password and bumps `sessionVersion` (pre-account-takeover protection).
- 2026-10-25 — Stage 2: `sessionVersion` on User, copied into the JWT; `requireUser()` rejects mismatches, so a password reset logs out all other sessions.
- 2026-10-25 — Stage 2: Password reset tokens: 32 random bytes, only SHA-256 stored, 1-hour TTL index, single use. Link is printed to the server console **only when `NODE_ENV !== "production"`** (Stage 6 sends it by email). Built `/reset-password` so the logged link works.
- 2026-10-25 — Stage 2: Rate limiter fails **open** when Redis is down (logs once per outage) so a Redis outage can't lock everyone out.
- 2026-10-25 — Stage 2: Onboarding draft (`User.draftMonitor`) is only checked as a well-formed http(s) URL; the full SSRF guard runs when Stage 3 turns it into a monitor.
- 2026-10-25 — **Local-first, Docker later** (your call): development runs without Docker — MongoDB on **Atlas** (`MONGODB_URI` + `MONGODB_DB=pingboard`), Redis installed locally (or hosted). Docker/containerisation comes after the app works end to end.
- 2026-10-25 — Worker gets a real build: `build:worker` bundles with **esbuild 0.28.2** to `worker/dist/index.mjs`; `start:worker` runs it with Node. Worker now honours `MONGODB_DB` (Atlas URIs have no db path, so it would otherwise use `test`).
- 2026-10-25 — Exact versions pinned (`.npmrc` `save-exact=true`): esbuild 0.28.2, next-auth 5.0.0-beta.32, bcryptjs 3.0.3, server-only 0.0.1, next 16.4.3, react 19.3.0, typescript 5.9.3, tailwindcss 4.3.3, shadcn 4.22.1, radix-ui 1.8.1, next-themes 0.4.6, zod 4.6.7, react-hook-form 7.91.0, @hookform/resolvers 6.0.0, mongoose 9.11.4, bullmq 6.4.2, ioredis 6.0.0, lucide-react 1.61.0, sonner 2.0.8, cmdk 1.1.1, tsx 4.23.15, concurrently 10.0.6, prettier 3.9.10, eslint 9.39.5. Images: `mongo:8`, `redis:8-alpine`.

- 2026-10-26 — Stage 3: Plan limits (your call): **free = 10 monitors, ≥ 5 min interval; pro = 50 monitors, ≥ 1 min**, all in `src/lib/shared/plans.ts`.
- 2026-10-26 — Stage 3: New status **`pending`** (created/resumed, not checked yet), shown as a hollow grey dot. Resume sets `pending` (only if the monitor was paused). Changing a monitor's URL resets it to `pending` and clears last-check fields.
- 2026-10-26 — Stage 3: HTTP checks use **`node:http`/`https` with a custom `lookup`** that returns the pre-validated IP (DNS-rebinding safe) instead of adding undici. One runner (`runHttpCheck`) for "Test now" and the worker.
- 2026-10-26 — Stage 3: SSRF policy beyond CLAUDE.md §6: IPv6 is allow-listed to global unicast `2000::/3` (minus documentation/Teredo blocks); NAT64 and 6to4 addresses are unwrapped and their IPv4 re-checked; single-label hosts and `.local/.internal/.lan/.home.arpa` are rejected; ports: 80, 443, or ≥ 1024 minus common database/infra ports; when DNS returns several IPs, **any** private one rejects the URL; IPv4 is preferred when connecting.
- 2026-10-26 — Stage 3: Redirects followed (default on, max 5), every hop runs the full guard; custom headers are **dropped after a cross-origin redirect** (like browsers drop `Authorization`), so a redirect can't leak an API token.
- 2026-10-26 — Stage 3: Keyword match is **case-insensitive**, searched in the first 1 MB of the decompressed body (gzip/deflate/br). Keyword + HEAD is a validation error. Body only kept for POST.
- 2026-10-26 — Stage 3: Encrypted at rest: header **values** and the **body** (AES-256-GCM, `v1.<iv>.<tag>.<ct>`). Header **names** stay plain. Header values are never sent to the browser (blank = keep); the body _is_ shown to its owner on the edit form so it can be edited.
- 2026-10-26 — Stage 3: Typing a bare host (`example.com/health`) is accepted and saved as `https://…`. The name auto-fills from the hostname when left empty.
- 2026-10-26 — Stage 3: Filtering on `/app/monitors` happens in the browser (max 50 monitors per user); filters aren't kept in the URL.
- 2026-10-26 — Stage 3: `/app` redirects to `/app/monitors` until the Stage 5 dashboard; sidebar "Monitors" points at `/app/monitors`.
- 2026-10-26 — Stage 3: Unit tests were written for `node:test` (via `tsx`, no new dependency). The concurrent Stage 4 session has since switched `npm test` to **Vitest** and ported them; all pass (149 tests in 6 files at time of writing).
- 2026-10-26 — Stage 3: A local `ENCRYPTION_KEY` was generated and appended to your `.env` (gitignored). Production needs its own key; losing it makes stored headers/bodies unreadable.

- 2026-10-26 — Stage 4: New pinned deps: **pino 10.4.0**, dev **pino-pretty 13.2.0** (dev log formatting), dev **vitest 5.0.5** (you asked for Vitest; `npm test` = `vitest run`, the node:test suites were ported). Redis on this machine: **Memurai 4.1.2** (Redis 7.2.5 API, `noeviction`).
- 2026-10-26 — Stage 4: Scheduling = BullMQ **job schedulers** (`upsertJobScheduler`, `every`), id = monitor id. A new scheduler runs immediately (new / resumed monitors are checked at once); updating keeps the rhythm; a URL change removes + re-adds it for an immediate check. Job data is only `{ monitorId }`, so edits apply on the next run without touching Redis.
- 2026-10-26 — Stage 4: The app's scheduler calls are **best effort** (3 s timeout, logged): saving a monitor never fails because Redis is down. The worker **reconciles on boot and every 10 minutes**, and a job for a deleted/paused monitor removes its own scheduler.
- 2026-10-26 — Stage 4: The worker writes the monitor with an **optimistic filter on `updatedAt` + `status`**; if you edit/pause/delete a monitor while its check is in flight, that result is discarded (no `CheckResult`, no state change) instead of overwriting your change.
- 2026-10-26 — Stage 4: `attempts: 1` (no BullMQ retries). A down website is a successful job; the 2-failures rule is the retry. Infra errors (Mongo/DNS of our own) fail the job, leave state untouched and don't count as a site failure; the next tick runs normally (seen live during a DNS blip).
- 2026-10-26 — Stage 4: Check outcome **`up | degraded | down`**; `degraded` = expected status + keyword OK but response > `SLOW_THRESHOLD_MS` (default **2000**, configurable). Degraded counts as **up** for uptime. Response time is measured to the final response's headers, including redirects. `CheckResult` gained a `status` field (`isUp` kept).
- 2026-10-26 — Stage 4: The monitor's status changes on **every** transition (incl. `pending → up`, `up ↔ degraded`) and each emits `status-changed`; Stage 6 decides which transitions alert (down / recovery).
- 2026-10-26 — Stage 4: Error wording changed to your phrasing ("Timeout after 10s", "DNS not found", "Unexpected status 503", "Keyword not found", "SSL error: …"). "Test now" shows the same texts.
- 2026-10-26 — Stage 4: SSL expiry uses a **separate TLS handshake** (no HTTP request, verification off so expired certs still give a date) to the SSRF-validated IP, at most every 24 h per https monitor (`sslCheckedAt` on Monitor); on failure it retries in ~1 h.
- 2026-10-26 — Stage 4: Rollup runs on queue `maintenance` at **00:15 UTC** and once at worker boot, recomputing the **last 3 complete UTC days** (idempotent upserts on `{monitorId, day}`). p95 = nearest rank over checks that got a response; timeouts count in uptime but not in response times. `DailyStat` TTL = 365 days. Deleting a monitor now also deletes its daily stats.
- 2026-10-26 — Stage 4: `/health` binds to **127.0.0.1:3001** by default (`WORKER_HEALTH_HOST`/`PORT`); 200 when Mongo + Redis + worker are OK, else 503. It's started before the workers so a taken port aborts boot before any job runs.
- 2026-10-26 — Stage 4: Worker now needs **`ENCRYPTION_KEY`** (to decrypt headers/body). `WORKER_CONCURRENCY` default 20; your `.env` had 10 and was changed to 20 (only that line).

- 2026-10-26 — Stage 5: **Polling, not Server-Sent Events**, for the live dashboard (every 30 s, `GET /api/dashboard`). Checks happen at most once a minute per monitor, so a 30 s poll is never more than one check behind; SSE would need a long-lived connection per open tab plus Redis pub/sub from the worker to the web process, is buffered by some proxies and doesn't suit serverless hosting. Polling reuses the same authenticated loader as the page and stops while the tab is hidden.
- 2026-10-26 — Stage 5: `/app` is now the dashboard (summary + live list, search/status/tag filters kept); `/app/monitors` redirects to it. Rows link to the new monitor page `/app/monitors/[id]`; saving the form goes there too.
- 2026-10-26 — Stage 5: **Times use the user's stored time zone** (`User.timezone`, captured at signup), not the browser's: the server buckets the 24 hourly bars by local hour in that zone (works for +5:30/+5:45), the client formats in it. There's no UI to change it until Settings (Stage 8).
- 2026-10-26 — Stage 5: **Daily figures are UTC days** (DailyStat is per UTC day): 30d uptime = today + the 29 previous UTC days; the 90-day bar and the 7d/30d chart are one point per UTC day and say "UTC day". 24h and 7d uptime are rolling windows over raw checks.
- 2026-10-26 — Stage 5: Days the rollup hasn't written yet (today, or yesterday before 00:15 UTC, or missed runs) are filled from raw checks, so new monitors aren't blank for a day.
- 2026-10-26 — Stage 5: Uptime-bar slot colour: **any failed check in the slot → red**, slow-only → amber, all good → green, no checks → grey (`slotStatus`). Tooltips give the exact % and check count.
- 2026-10-26 — Stage 5: Chart buckets: 1h = 1 min, 24h = 15 min (raw, averaged in MongoDB), 7d/30d = daily DailyStat avg + p95 (dashed). Buckets with failed checks are shaded red (for daily points the shade scales with the share of failed checks). p95 from raw data uses MongoDB `$percentile` (approximate, t-digest); the rollup's p95 is exact nearest-rank, so the two can differ by a few ms.
- 2026-10-26 — Stage 5: Recent checks: 20 per page, **keyset pagination** (Newer / Older / Latest) instead of page numbers, so there's no `count()` or `skip` scan and new checks don't shift pages. Filter "Failures only". All state is in the URL (`?range=&failures=1&before=`).
- 2026-10-26 — Stage 5: "Test now" on the monitor page checks the **saved** settings from our server (same rate limit + SSRF guard) and **doesn't save** the result, so it can't interfere with the worker's 2-failure rule. Result shows Up / Degraded / Down (also fixes the form's "Test now" showing Degraded as Up).
- 2026-10-26 — Stage 5: New token `--info` (blue) for 3xx codes. "Checked … ago" now shows seconds ("40s ago", 10 s steps).
- 2026-10-26 — Stage 5: New deps pinned: **recharts 3.10.1** (+ its peer **react-is 19.3.0**).
- 2026-10-26 — Stage 5: Added **`.prettierrc.json`** (no semicolons, `trailingComma: es5`, Tailwind class sorting), matching the existing code. There was no Prettier config in the repo, so `npm run format` would have rewritten every file with semicolons (this happened once during Stage 5 and was reverted by re-running Prettier with this config; formatting only).

- 2026-10-27 — Stage 6: **Email: both Resend and SMTP** behind one `sendEmail()` (`EMAIL_PROVIDER=resend|smtp|console`, default `console`). Resend is called through its REST API (no SDK). SMTP uses **nodemailer 10.2.1** (new dependency, pinned; versions ≤ 10.1.3 have high-severity advisories, incl. recipient-parsing bugs that matter because users type addresses). next-auth declares an _optional_ peer `nodemailer ^7 || ^8` it only uses for its Email provider (which we don't use), so `package.json` has `"overrides": { "nodemailer": "$nodemailer" }`. `npm audit`: 0 vulnerabilities. Dev dependency **@types/nodemailer 8.0.2**.
- 2026-10-27 — Stage 6: `console` provider prints emails in development and **fails in production** ("Email isn't set up on this server"), so an unconfigured production never marks an alert as sent.
- 2026-10-27 — Stage 6: **Telegram: the user's own bot** (token + chat id per channel, token encrypted), not one PingBoard-owned bot. Removed the unused `TELEGRAM_BOT_TOKEN` from `.env.example`. (Resolves the open question.)
- 2026-10-27 — Stage 6: Incidents are **derived from the stored monitor state** on every check plus a 10-min reconcile, instead of trusting the in-process `status-changed` event (fixes the Stage 4 known issue). `startedAt` = first failed check of the streak (stored as `Monitor.currentFailure`), so durations count from when the site actually started failing.
- 2026-10-27 — Stage 6: Pausing a down monitor **closes its incident** (`resolution: "paused"`, shown as "Closed", no recovery alert); changing its URL closes it as "changed". Deleting a monitor deletes its incidents and alert logs.
- 2026-10-27 — Stage 6: Reminders are a **per-user** setting (off / 30 / 60 min), sent by a 1-minute `reminder-tick` job; **Acknowledge stops reminders** for that incident. Changing the setting applies to open, unacknowledged incidents.
- 2026-10-27 — Stage 6: Alert delivery = one BullMQ job **per channel** (a failing Discord never re-sends the email), 4 attempts (first + 3 retries: 30 s, 1 min, 2 min). Permanent errors (deleted webhook, bad token, 4xx except 408/429, SMTP 5xx/auth) are not retried. `AlertLog` keeps every delivery 365 days (TTL).
- 2026-10-27 — Stage 6: Webhook hosts are pinned: Discord `discord.com` / `discordapp.com` / `ptb.` / `canary.`, Slack `hooks.slack.com/services/…`, Telegram `api.telegram.org`, https only, no redirects, through the same SSRF guard as checks (`allowPrivate` is never applied to webhooks).
- 2026-10-27 — Stage 6: Max **10 alert channels per user** (`ALERT_LIMITS`, not per plan). "Send test alert": 5/min + 50/day per user.
- 2026-10-27 — Stage 6: Incidents page: ongoing incidents always listed (at most one per monitor), resolved ones filtered by period (24h / 7d / **30d default** / 90d / all) with keyset "Older" pages. No custom date range picker.
- 2026-10-27 — Stage 6: Time zone abbreviations in alerts come from Intl (tries en-US, en-GB, en-IN, en-AU): "IST", "EDT", "CET"…; zones without an English short name show the offset ("GMT+5:45").

- 2026-10-27 — Stage 7: **Cache = revalidate 30 s, expire 60 s** instead of a plain "revalidate 60". With stale-while-revalidate, revalidate 60 alone can serve data up to ~2 min old; expire 60 guarantees nothing older than 60 s is served, which the "updates within a minute" goal needs. In-memory `use cache` (self-hosted `next start`); a multi-instance deploy would need `use cache: remote` (Stage 10).
- 2026-10-27 — Stage 7: Editor changes are visible immediately (`updateTag` on the old and new slug); worker status changes appear within 60 s through cache expiry (the worker can't reach the web process's in-memory cache). Open public pages call `router.refresh()` every 60 s while visible.
- 2026-10-27 — Stage 7: New pages are **not public by default** and start with all your monitors listed under their real names; publish after checking the preview. `showUrls` is off by default and per page (not per service).
- 2026-10-27 — Stage 7: Overall status: paused/never-checked monitors don't count; any down → **Partial outage**, more than half down → **Major outage**, only slow → **Degraded performance** (amber), none counted → **No status yet** (grey). The badge says up / degraded / partial outage / down / unknown.
- 2026-10-27 — Stage 7: **Logos are uploads only** (no external URL, so the OG renderer and visitors never fetch third-party images): PNG, JPEG or WebP sniffed from the bytes (SVG refused: it can carry scripts), ≤ 256 KB, stored in MongoDB (`StatusPageLogo`), served with `nosniff`, `CSP: default-src 'none'; sandbox` and an immutable cache on a hash-versioned URL. `logoUrl` holds that route.
- 2026-10-27 — Stage 7: Plan limits: **free 1 status page, pro 5**; "Powered by PingBoard" on free only (`PLAN_LIMITS`). Max 5 announcements of 500 characters per page; announcements are plain text (no Markdown).
- 2026-10-27 — Stage 7: Public incidents show "<public name> was down / is down", duration, start and resolved time, for ongoing incidents and those resolved in the last 14 days. Incidents closed by pausing or a URL change are listed as resolved. Causes and notes are never shown.
- 2026-10-27 — Stage 7: Response-time chart on the public page = last 24 h, 1-hour buckets, collapsed per service (`<details>`), reusing the monitor page's chart.
- 2026-10-27 — Stage 7: Status page theme is applied with **scoped tokens** (`[data-theme-scope]` + a scope-aware `dark:` variant) rather than switching next-themes on `<html>`, so it works on first paint without JS, inside the in-app preview, and doesn't touch the visitor's saved app theme. Reserved slugs (`admin`, `api`, `pingboard`, …) can't be claimed.
- 2026-10-27 — Stage 7: `getDailyHistory` now delegates to a batched `getDailyHistories` (2 queries for N monitors, missing days merged into ranges); `historySlots` logic moved to `shared/stats.ts` `dailySlots`. Behaviour of the monitor page unchanged.

- 2026-10-27 — Stage 8: New dependency **motion 14.6.0** (Framer Motion's current package; `motion/react`). 14.7.0 was published the same day, so the previous release is pinned.
- 2026-10-27 — Stage 8: **Free plan alerts by email only** (your pricing: Free = email alerts, Pro = all channels). `PLAN_LIMITS.alertChannelTypes`; existing chat channels of free users stay saved but get no alerts and are marked in the UI. Nobody can be Pro until billing exists (set `plan` in the DB to test).
- 2026-10-27 — Stage 8: Pro price shown is a **placeholder ($9 / month)**, `src/lib/pricing.ts`. "Join waitlist" stores email only (`WaitlistEntry`, unique email).
- 2026-10-27 — Stage 8: "See live demo" opens **`/demo`**, a sample status page rendered by the real status-page code (not a fake screenshot); the hero has the sample dashboard. `demo` was already a reserved slug.
- 2026-10-27 — Stage 8: "Try it now" never honours `SSRF_ALLOW_PRIVATE` (anonymous input), only GETs, expects 200–299, 10 s timeout. A **global** hourly cap backs the per-IP limits because `x-forwarded-for` is spoofable until Stage 10.
- 2026-10-27 — Stage 8: **Connecting Google/GitHub from Settings** uses a 5-minute HMAC-signed (`AUTH_SECRET`) link-intent cookie (user id + sessionVersion + provider, path `/api/auth`). The OAuth callback links only if the intent is valid **and** the request still has a session for that same user and version; an account linked to someone else is refused; one account per provider per user. Logout clears the intent.
- 2026-10-27 — Stage 8: After a password change the current session is re-issued (`unstable_update`) while every other session is logged out (sessionVersion). Because Next re-renders the page in the same response with the _old_ Cookie header, `requireUser()` now also accepts a session cookie re-issued in this request (`cookies()`, decoded with `next-auth/jwt` `getToken`), only when its user and version match the database.
- 2026-10-27 — Stage 8: Deleting an account requires typing its email, plus the password when it has one (OAuth-only accounts confirm with the email). Password checks in Settings share a limit of 5 / 15 min per user.
- 2026-10-27 — Stage 8: Time-zone picker = native `<select>` grouped by region, with current IANA names (Node and Chrome still report `Asia/Calcutta`, `Europe/Kiev`…; mapped by `currentZoneName()` in `shared/time.ts`). Settings validates the zone strictly (signup still falls back to UTC).
- 2026-10-27 — Stage 8: Footer "Privacy" and "Terms" links removed until those pages exist (they were 404s).
- 2026-10-27 — Stage 8: Share image: Next merges metadata shallowly, so a page's own `openGraph` drops the root's file-based image; `pageMetadata()` names `/opengraph-image` explicitly.
- 2026-10-27 — Stage 8: **`.prettierrc.json` was missing** during this stage (it was in the untracked files at the start of the session and disappeared mid-session — not removed by me). A format run without it rewrote files with semicolons; I recreated it (`semi: false`, `trailingComma: es5`, Tailwind plugin with `tailwindStylesheet` + `tailwindFunctions: ["cn", "cva"]`) and re-ran Prettier, which restored the original style (spot-checked untouched files byte-for-byte). Please commit it so it can't vanish again.

- 2026-10-27 — Stage 9: **Static CSP without nonces** (`next.config.ts`). Nonces make every page dynamic, which Cache Components / partial prerendering can't do; Next's own docs give this "without nonces" policy for that case. `script-src 'self' 'unsafe-inline'` therefore relies on React's escaping (and the whitelisted status-page view) for XSS; `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` + the two OAuth hosts, `frame-ancestors 'none'` still apply. Next's experimental SRI mode was not used (experimental).
- 2026-10-27 — Stage 9: **`WORKER_CONCURRENCY` default 50** (was 20), from the load test: 300 one-minute monitors, 5 % slow (1–3 s) and 2 % hanging (10 s timeout) responses: concurrency 20 → avg lag 1.76 s, p95 3.96 s, max 5.1 s; 50 → avg 0.17 s, p95 0.43 s, max 0.98 s (first minute). Both: 0 duplicate checks, 0 gaps, interval p99 ≤ 61.1 s. Your `.env` still says `WORKER_CONCURRENCY=20`; remove the line (or set 50) to use the new default.
- 2026-10-27 — Stage 9: Checks are **not spread across the interval**. BullMQ aligns each scheduler to when it was created, so monitors created together (or all of them after a Redis wipe, via the boot reconcile) fall due in the same second every interval. The load test measured exactly that worst case. Spreading with BullMQ's `offset` would delay a new monitor's first check by up to one interval, so it was left as is.
- 2026-10-27 — Stage 9: Tests: new dev dependencies **@playwright/test 1.64.1** (uses the installed Chrome, `channel: "chrome"`, no browser download) and **@axe-core/playwright 4.14.0** (WCAG checks incl. contrast). Integration tests (`tests/integration`) only run with `TEST_MONGODB_URI` / `TEST_REDIS_URL`, never against the app's own database. `npm run test:e2e` (`scripts/e2e.ts`) wipes `pingboard_e2e` + the e2e Redis db before and after, and refuses a Redis db it didn't fill.
- 2026-10-27 — Stage 9: The golden-path e2e monitors **https://example.com** (keyword "Example Domain", then a missing keyword to make it go down) because a production build correctly refuses `localhost` targets and `SSRF_ALLOW_PRIVATE` can't be enabled in production. Needs internet access.
- 2026-10-27 — Stage 9: Light-mode status tokens darkened slightly (up 0.53 → 0.49 L, down/destructive 0.55 → 0.52, degraded 0.56 → 0.51, paused 0.55 → 0.50, info 0.53 → 0.50) so badge text passes 4.5:1 on its own 10 % tint (was 4.1–4.3); dark `--destructive` 0.66 → 0.70 for destructive buttons (was 4.4:1).
- 2026-10-27 — Stage 9: `/styleguide` is development-only (404 in production builds).
- 2026-10-27 — Stage 9: Removed `CheckerEventBus` (`worker/src/events.ts`): nothing listened since Stage 6 moved incidents to the stored state. Status changes are still logged.

## Known issues

### Final list (after Stage 9)

Open, in rough priority order. The per-stage notes further down are the history.

**Security / ops**

1. **Rate limits trust `x-forwarded-for`.** It's spoofable until a reverse proxy overwrites it (Stage 10). The global caps on the landing checker and the per-email / per-user limits don't depend on it.
2. **CSP allows inline scripts** (`'unsafe-inline'`, no nonces: see Decisions). XSS protection rests on React's escaping and the status-page whitelist; no `dangerouslySetInnerHTML` with user data exists (the only one is the FAQ JSON-LD, static).
3. **Email addresses aren't verified**, neither at password signup nor for email alert channels (anyone can add any address; test alerts are limited to 5/min, 50/day). Needed before public launch.
4. **Graceful worker shutdown (SIGTERM) is untested.** Windows can't send SIGTERM; verify in Docker (Stage 10).
5. **Single web instance assumed:** `use cache` is in-memory per process, and static pages bake `APP_URL` in at build time (Stage 10).
6. `docker compose` runs MongoDB + Redis only; the web + worker images are Stage 10. Docker Desktop on this machine was stuck on an update dialog.
7. next-auth is a beta (`5.0.0-beta.32`); `unstable_update()` is used after onboarding and password changes.

**Behaviour**

8. **Soft 404s.** Unknown or unpublished `/status/<slug>` pages, and `notFound()` inside `/app` pages (other users' or deleted monitors, incidents, status pages), show the right "not found" page but answer **HTTP 200**: the static shell has already streamed (Cache Components). Unmatched URLs get a real 404. Open question below.
9. Checks of monitors created at the same moment fall due in the same second every interval (see Decisions); at the 50-check concurrency this costs < 1 s at 300 monitors.
10. Signup says when an email is already registered (helpful, but it reveals the account exists; rate-limited).
11. The monitor page doesn't auto-refresh (only the dashboard and public status pages do).
12. Daily figures (90-day bars, 30-day uptime, 7d/30d charts) use UTC days, labelled as such.
13. Changing your email address isn't possible yet (needs verification).
14. If a "Connect GitHub/Google" intent can't be verified, the callback falls back to a normal OAuth sign-in (possibly another PingBoard account owned by that login).

**Not verified**

15. Real Google/GitHub sign-in and connect, and real Discord / Slack / Telegram / Resend / SMTP delivery (no keys here; formats are unit-tested and Discord itself answered a fake webhook in Stage 6).
16. Screen readers: markup and axe only, no real NVDA/VoiceOver session. Recharts charts aren't keyboard-navigable (the stat cards and the checks table carry the same numbers). Uptime-bar slot tooltips are mouse-only; keyboard users get the bar's text summary.
17. The SSL-expiry and "slow" alerts end to end (unit-tested), the alert retry backoff on a _transient_ failure, and the 10-minute incident reconcile healing a real crash (integration-tested with a simulated crash).
18. Dashboard performance with 50 monitors in the browser (the worker side was load-tested with 300).

**Test setup**

19. Integration tests are **skipped** in a plain `npm test`; they need `TEST_MONGODB_URI` / `TEST_REDIS_URL` pointing at throwaway services (README → Tests).
20. The golden-path e2e needs internet access (monitors https://example.com); the SSRF e2e needs public DNS for `localtest.me`.
21. `npm install` blocks install scripts for `unrs-resolver`, `msgpackr-extract`, `esbuild` (npm 12 `allowScripts`); everything works without them.

### Stage 9 — audit and how it was verified

Audit results (all fixed in this stage):

- **P1 security / correctness:**
  - No security headers (CSP, frame-ancestors, nosniff, referrer and permissions policies, HSTS), and `X-Powered-By` was on.
  - Eight forms lacked `method="post"`, so a click before hydration sent passwords, header tokens or webhook secrets in a GET query string.
  - `SSRF_ALLOW_PRIVATE=true` in production only failed on the first request, not at startup.
  - `/styleguide` was public.
  - `uptimePercent` could round 1 failure in ≥ 200 k checks up to 100 %, and uptime-bar tooltips rounded 99.996 % to "100.00%".
  - No root `not-found`, `error` or `global-error`: unknown URLs showed Next's unstyled default, and public pages had no error boundary.
- **P2 checker / ops:**
  - Schedule lag wasn't measured.
  - `WORKER_CONCURRENCY` 20 left 2–5 s of lag at 300 one-minute monitors.
  - The onboarding "skip" threw a 500 on a malformed time zone.
- **P3 accessibility:**
  - Light-mode status badges at 4.1–4.3:1 contrast, and dark destructive buttons at 4.4:1.
  - The account menu button's `aria-label` didn't contain its visible initials (WCAG 2.5.3).
  - The logo file input had no label.
  - Docs code blocks scrolled but couldn't be focused.
  - The status-page picker's dot showed status by colour alone (the landing "how it works" dots too).
- **P4 clean-up:**
  - Dead `ComingSoon` and `CheckerEventBus`.
  - 9 unused variables in `.env.example`.
  - No README, no e2e tests, and no DB-level incident tests.

How it was verified (isolated stack: throwaway `mongod` on :27100, Redis DB 1 and DB 15 (both empty before and after), production build on :3200 with `APP_URL=http://localhost:3200`, built worker on :3201, your `dev:all` and Atlas untouched):

- `npm run lint`, `npm run typecheck`, `npm test` (261 passed, 6 integration skipped without the env vars), the integration tests with them (6/6), `npm run build`, `npm run build:worker`.
- Load test, `npm run load-test`: 300 monitors × 1 min, 10 min at concurrency 20 and 6 min at 50 (numbers in Decisions).
- Playwright, `npm run test:e2e`: golden path (1), security (12), accessibility / responsive / keyboard (18). The security tests cover:
  - SSRF in the landing checker, the monitor form's save and its Test now
  - ownership and the 401 API
  - rate limits for Test now, login and the landing checker
  - secrets kept out of the HTML (header token, Discord webhook)
  - security headers, the real 404 and the hidden styleguide
  - every server-rendered form uses `method="post"`
- `next start` with `SSRF_ALLOW_PRIVATE=true` exits with code 1 and names the variable.

- **Concurrent edits during Stage 3 verification.** While Stage 3 was being browser-tested, another session started Stage 4 in the same working tree: it added worker constants (`CHECK_STATUSES`, `JOB_NAMES`, rollup/SSL settings), a `status` field on `CheckResult`, `src/lib/scheduler.ts`, scheduler calls (`syncMonitorSchedule`/`removeMonitorSchedule`) inside `src/actions/monitors.ts`, and shorter check messages ("Keyword not found", "Unexpected status 500"). The final 29/29 e2e ran on a build that already included some of those changes. Those Stage 4 additions are that session's work and were not reviewed here.
- Redis is now running on this machine (the Stage 4 session appears to use it); live rate limits confirmed. The e2e run pointed at an unused Redis port on purpose so signup limits wouldn't block it (rate limiting fails open by design).
- Creating a monitor checks the plan limit, then re-counts after insert and undoes the insert if two parallel requests both got through; in that rare race both can be undone (fails closed).
- `notFound()` on `/app/monitors/[id]/edit` renders the 404 page inside a streamed response, so the HTTP status may be 200 rather than 404 (Cache Components streaming). Content is correct and nothing leaks.
- `metadata.title` on the edit page is the static "Edit monitor" (a DB-backed `generateMetadata` would block the static shell).
- Deleting a monitor deletes its `CheckResult`s, `DailyStat`s and (Stage 6) incidents and alert logs.
- **Stage 4 — graceful shutdown not verified:** Windows can't deliver SIGTERM to a Node process (it's a hard kill). The handler (stop taking jobs, wait for in-flight checks, close Redis/Mongo, 45 s cap) is untested until the Docker stage.
- ~~**Stage 4 — `status-changed` is in-process.**~~ Fixed in Stage 6: incidents are derived from the stored monitor state on every check plus a 10-minute reconcile; the event is only a hook now.
- ~~**Monitor form submits natively before hydration (Stage 3 code, security).**~~ Fixed in Stage 9: every form now has `method="post"` (the login, signup, reset-password and alert-channel forms had the same problem). Seen in Stage 4's e2e: clicking "Save changes" before React hydrated sent a browser GET with every field in the query string (`…/edit?url=…&keyword=…`). On the create form that would put typed header values (tokens) into the URL / history / logs. Fix: give the `<form>` `method="post"` (or disable submit until hydrated). Not changed here (out of Stage 4 scope).
- Two workers on one machine would both try to bind the health port; give each its own `WORKER_HEALTH_PORT`. (The `npm run dev:worker` that was already running since 23:17 hot-reloaded into Stage 4 code and served all live checks during verification; a second copy failed on the port, as designed.)
- The rollup only covers complete days; today's stats come from raw `CheckResult`s — Stage 5 combines them (`getDailyHistory`).
- `/health` reports `worker: running` even if Mongo is reachable but slow; it doesn't run a test query.
- ~~"Test now" shows a slow (degraded) result simply as Up~~ — fixed in Stage 5 (shows Degraded).
- One failed check job from the DNS blip stays in Redis's failed list (kept: last 500) — harmless.
- "Test now" from the edit form with blank header values re-uses the stored values; a blank value on a brand-new header is a validation error.
- A running `next start` breaks if another process rebuilds `.next` underneath it (happened during testing when two sessions shared the tree); restart it after any build.
- Docker is postponed. (Docker Desktop is also stuck on an _"Update failed – Continue / Quit"_ dialog; click **Continue** before the Docker stage.)
- Verified against **Atlas** (production build, port 3200): logged-out `/app` → `/login`, signup → onboarding → draft on `/app`, logout, login. The throwaway `e2e-smoke-*@example.com` user was deleted afterwards (Atlas `users` is empty).
- ~~Links to routes that don't exist yet return 404~~ — `/pricing` and `/docs` exist since Stage 8; the Privacy/Terms links were removed until those pages are written.
- ~~`/styleguide` is public in production builds~~ — 404 in production since Stage 9.
- Client IP for rate limiting comes from `x-forwarded-for`, which is spoofable unless a trusted reverse proxy overwrites it; Stage 10 must configure that. The per-email limits are not affected.
- Signup tells you when an email is already registered (helpful UX, but reveals that the account exists; rate-limited). Login and forgot-password don't reveal it.
- Email addresses are not verified for password signups yet (email sending exists since Stage 6; a verification flow is not built). Until then OAuth linking treats them as unverified (see Decisions).
- next-auth v5 is a beta; `unstable_update()` (used to refresh the session after onboarding) is marked unstable.
- After login, the dashboard briefly shows a skeleton for the avatar menu while the session streams in (Cache Components pattern).
- The signup password field shows both the hint "At least 8 characters." and the error "Use at least 8 characters" when too short; cosmetic.
- `npm install` blocks install scripts for `unrs-resolver`, `msgpackr-extract`, `esbuild` (npm 12 `allowScripts`). Everything works without them (native/optional speed-ups); approve with `npm install-scripts approve <pkg>` if wanted.
- UptimeBar slot tooltips are mouse-only (keyboard users get the `role="img"` summary instead of 48–90 tab stops).
- **Stage 5 — what the browser e2e covered:** a monitor went Pending → Down **on screen without a reload** while the worker ran (2 polls, no navigation), tab title + sort + red row + summary count followed; failed poll → notice → recovery; 7 rows, other user's monitor hidden in page and API; 3xx/4xx/2xx colours; bar tooltips; 24h/1h charts from real worker checks, 7d/30d from DailyStat with the outage shaded; 90-day bar (90 slots, no-data gap); timestamps equal Asia/Kolkata formatting while the browser was in New York; keyset Older/Newer, failures-only, bad search params fall back; Test now; pause from the list; delete → back to /app; waiting states; other user's / malformed id → not found; 360 px dark + light: no horizontal scroll, cards layout; no console errors. History older than today was **synthetic** (labelled monitor, inserted for the test, deleted afterwards) because the rollup needs real past days. Test users/monitors/checks were deleted (Atlas back to 1 user, 0 monitors).
- **Stage 5 — not verified:** the dashboard with 50 monitors (performance); a real overnight rollup feeding the 7d/30d chart (only synthetic DailyStat rows); keyboard navigation of the Recharts chart; screen-reader output (only the markup was checked).
- **Stage 5 — dashboard query cost.** Each poll aggregates the last 24 h of checks for all of a user's monitors (worst case Pro: 50 monitors × 1 440 checks ≈ 72 k index entries + document fetches, every 30 s per open tab). Fine at MVP scale; if it gets heavy, add `status`/`isUp` to the `{monitorId, checkedAt}` index so the query is covered, or cache the hourly buckets.
- **Stage 5 — the monitor page doesn't auto-refresh** (only the dashboard does); reload or change range to see new checks.
- Stage 5 — the tab title on the monitor page is the static "Monitor · PingBoard" (a DB-backed `generateMetadata` would block the static shell), same as the edit page.
- Stage 5 — the incidents list on the monitor page is a placeholder until Stage 6.
- Stage 5 — 90-day bar / 30d uptime days are UTC days, so for a user in IST a "day" runs 05:30–05:30 local. Labelled "UTC day" in the UI.
- **Stage 6 — how it was verified.** Isolated stack so your running `dev:all` and Atlas were untouched: throwaway `mongod` (port 27100, scratch folder), Redis **DB 1** (empty before, emptied after), production web build on :3200 (`next start`), built worker (`SSRF_ALLOW_PRIVATE=true`, development) on :3201, a local HTTP server on 127.0.0.1:4500 as the monitored site (1-minute interval), headless Chrome (browser in New York, user in Asia/Kolkata). Results:
  - Stopped the server at 04:57:46 UTC → failures at 04:58:18 and 04:59:18 → **incident opened 04:59:18 (1 m 32 s, within 2 intervals)** → DOWN email sent 1 s later: "🔴 Local test server is DOWN — Connection refused — http://127.0.0.1:4500/health — since 10:28 IST".
  - 19+ further failed checks: still **one** DOWN alert; `checksFailed` matched the stored failed checks exactly. Second open incident for the same monitor rejected by the unique index (E11000).
  - Reminder (30 min, made due early): exactly one "still down" alert per channel, next one scheduled +30 min; Acknowledge cleared it.
  - Restarted the server at 05:27:18 → incident closed on the next check, **duration 29 m** (first failed check → first good check; the real outage was 29 m 32 s, i.e. within one interval) → "🟢 Local test server is back UP after 29m".
  - Second outage, then **Pause** from the monitor page → incident closed as "paused", no recovery alert.
  - Discord channel with a well-formed but fake webhook: the real request reached discord.com through the SSRF guard; Discord rejected it → logged as **failed, permanent, 1 attempt** (no retries); the email channel was unaffected.
  - Browser (48 checks in 6 runs, all passing after fixing two test-script bugs): alerts empty state, add email channel (prefilled), Discord wrong host rejected, setup help, secret never shown, test alerts (sent / failed with Discord's reason), reminder setting, monitor form "only selected channels" + "alert when slow" stored correctly; incidents list (ongoing, cause), filters + bad params, keyset; incident page timeline / failed checks / acknowledge / notes persist; monitor page incidents card; unknown / malformed id → 404; **second user gets 404 on the incident, empty list, no channels**; 360 px no horizontal scroll on all new pages; dark + light; no console errors.
  - Fixed during verification: in production the `console` email provider used to log "nothing was sent" but record the alert as **sent**; it now fails with "Email isn't set up on this server". Forgot-password in production without a provider now logs that error.
- **Stage 6 — not verified:** real delivery to Discord / Slack / Telegram / Resend / SMTP (no webhooks or keys; payload formats are unit-tested and the Discord request was answered by Discord itself); SSL-expiry alerts and the "slow" alert live (logic unit-tested; would need a certificate ≤ 14 days from expiry / a 5-check slow streak); the retry backoff on a _transient_ failure (only the permanent path ran live); the 10-minute incident reconcile healing a crash; screen-reader output.
- Stage 6 — **email channels aren't verified**: anyone can add any address as an email channel and send test alerts to it (rate-limited to 5/min, 50/day per user, max 10 channels). A confirmation step for email channels should come before public launch.
- Stage 6 — the incidents page filters by preset periods (24h … all), not an arbitrary date range.
- Stage 6 — `worker/src/rollup.ts` was re-formatted by Prettier (whitespace only, it had drifted from the config).
- Stage 6 — to try the done-criteria test yourself against `localhost`, set `SSRF_ALLOW_PRIVATE=true` in `.env` (development only) and restart `dev:all`; otherwise a localhost monitor is rejected as a private address.
- Stage 5 — when browser-testing on a port other than `AUTH_URL`'s (3000), the proxy's redirects for logged-in users point at :3000 and the browser logs CORS errors for prefetches of `/signup` and `/forgot-password`. Environment-only; not seen on the configured port.

- **Stage 7 — how it was verified.** Isolated stack again (your Atlas and `dev:all` untouched): throwaway `mongod` on :27100, Redis **DB 1** (empty before, flushed after), production web build on :3200, built worker (`SSRF_ALLOW_PRIVATE=true`, development) on :3201, a local site on 127.0.0.1:4500 (1-minute interval), headless Chrome driven over CDP. 95 browser/HTTP checks passed, including:
  - Editor: empty state, monitors pre-listed, slug auto-fill, reserved slug rejected, public names, reorder with arrow buttons (+ screen-reader announcement), switches, create → editor, share link + badge Markdown, SVG renamed to .png rejected, PNG logo uploaded, announcement posted, preview in the page's theme.
  - Public page (logged out): banner, order and public names; page source contains **none** of: 127.0.0.1, the URL token, the monitors' real names, header names, the incident cause/notes, monitor ids, the owner's email. 90 bars with tooltip (inside the theme scope), 90-day %, a 4-day-old incident shown and a 20-day-old one hidden, announcement HTML escaped, branding, chart renders, logo, dark theme beating a light system preference, auto theme following light and dark systems, SEO title / og:title with status / canonical / og:image (PNG renders) / twitter card, badge up+green, unknown badge 404 grey, logo headers, 360 px without horizontal scroll, no console errors.
  - **Outage (the done criterion):** stopped the site at 09:35:33 UTC → both monitors down at 09:36:38 → public page showed "Major outage" on the first poll after that (5-s polling; worst case by design ≤ 60 s) → badge "down" red → OG image re-rendered → an already-open visitor tab switched to "Major outage" **without a reload**. Restarted the site → "All systems operational" 81 s later (≤ 1 check interval + ≤ 60 s cache), the open tab followed, the incident listed as resolved.
  - Ownership: user B gets not-found on A's editor and preview, sees none of A's monitors, gets "already taken" for A's slug, is blocked from a 2nd page on the free plan; a page whose DB record was tampered to list A's monitor under B's page shows no services. Unpublish → page not found, badge 404, logo 404 for anonymous but 200 for the owner, preview still works. Deleting a monitor removes it from the public page at once; deleting the page → not found, badge and logo 404.
  - Fixed during verification: logo uploads always failed with "Logo is too large" (in update validators Mongoose passes a BSON `Binary`, whose `length` is a function); the size validator handles both now, and a failed save returns a friendly error. (My first seed data also had an undecryptable test header: the worker correctly marked those monitors down with "Saved request settings couldn't be read".)
  - Test users, monitors, pages and the e2e database were deleted afterwards.
- **Stage 7 — soft 404.** An unknown or unpublished `/status/<slug>` shows the "Status page not found" page with `noindex`, but the HTTP status is **200**: the root layout's static shell has already streamed (Cache Components). Next's documented fix is a slug check in `src/proxy.ts`, which is DB-free by design, so this is left as a decision for you (same class of issue as the monitor edit page).
- **Stage 7 — not verified:** a real GitHub README (camo proxy) showing the badge; social-network previews of the OG image (rendered and checked as a PNG only); drag-and-drop with a real mouse (HTML5 drag events can't be driven reliably over CDP; reordering was verified with the arrow buttons, which use the same `move()`); touch reordering (arrow buttons only, no touch drag); screen-reader output; a page with 50 monitors (performance); Pro branding removal (no Pro users yet).
- Stage 7 — the page's own id appears in its logo URL (`/api/status-logo/<pageId>`). It isn't private (it only serves that public logo), but it is the one id in the public markup.
- Stage 7 — the public chart draws no line when the last 24 h have a single bucket with data (one point, dots off); normal 24 h data shows a line.
- Stage 7 — uptime bars and 90-day uptime use UTC days (labelled); incident and announcement times use the visitor's own time zone and locale.
- Stage 7 — `use cache` is in-memory per web process: with several web instances each keeps its own cache (still ≤ 60 s old), and `updateTag` only clears the instance that ran the action. Revisit with `use cache: remote` in Stage 10.

- **Stage 8 — how it was verified.** Isolated stack (your Atlas and `dev:all` untouched): throwaway `mongod` on :27100, Redis **DB 1** (only this stage's test keys; those 22 keys deleted afterwards, DB 1 empty), production build on :3200 (`next start`), headless Chrome over CDP, fresh browser profile per run.
  - Layout: `/`, `/pricing`, `/demo`, `/docs`, `/docs/alerts`, `/docs/status-badge` at **375 / 768 / 1280 px in dark and light**: no horizontal scroll, every reveal visible after scrolling, no console errors (36/36); screenshots reviewed. Settings at the same 3 widths in both themes: no horizontal scroll.
  - Landing (18/18): Checkout flips Down ↔ Up, summary counts, pause freezes the preview; Try it now — example.com Up / 200 / ms; 404 page Down / 404; `127.0.0.1`, `169.254.169.254`, `ftp://` refused in the form; `localtest.me` (DNS → 127.0.0.1) refused by the server; an invalid URL clears the previous result; per-IP limit answers "That's a lot of checks"; waitlist validation + join; docs mobile menu opens, navigates, closes; **reduced motion**: preview starts paused, all content visible without scrolling.
  - Settings (33/33): signup → monitor created with a real BullMQ scheduler; free user's Discord channel "Needs the Pro plan", its switch/test disabled, picker offers email only; all sections render, email read-only; profile save disabled until changed, Chrome's `Asia/Calcutta` shown as `Asia/Kolkata`, name + zone saved and the user menu follows; empty name rejected; password: wrong current, mismatch, success, sessionVersion bumped, **this session keeps working**; delete: wrong email and wrong password refused (nothing deleted), then success → toast on `/`, signed out, **every collection empty for that user** (users, monitors, checkresults, dailystats, incidents, alertlogs, alertchannels, statuspages, statuspagelogos, passwordresettokens) and the **scheduler gone from Redis**; `/app` then asks to log in; no console errors.
  - SEO: all routes 200 with the right content types; titles, descriptions, canonical, og:* and twitter:* on every page; OG image and apple icon rendered and checked as PNGs.
  - Fixed during verification: no `og:image` on pages (metadata shallow merge); the password change bounced to `/login` (stale cookie in the same-response re-render); the zone list's old names hid "Kolkata"/"Kathmandu"; Discord-preview fields split words; the delete-dialog label broke into columns at 375 px; a stale "Try it now" result stayed under a new validation error.
- **Stage 8 — not verified:** a real Google/GitHub **connect** round-trip (no OAuth keys here; the code path and its refusals are reasoned, not exercised) and disconnect (needs a linked account); social-network previews of the OG image; screen-reader output; Pro users (no billing). One `npm test` run during the final checks reported every file as failing to load; it passed alone and on the immediate re-run (232/232) — not reproduced.
- Stage 8 — absolute URLs in static pages (canonical, og:url, sitemap, robots) are **baked in at build time from `APP_URL`**: production must build with the real `APP_URL` (Stage 10).
- Stage 8 — if a "Connect GitHub" intent can't be verified (expired, cookie blocked), the callback falls back to a normal OAuth sign-in: the browser may end up in another PingBoard account owned by that GitHub login, or a new one. Not a security issue (the person controls that login), but confusing.
- Stage 8 — email addresses can't be changed in Settings yet (needs a verification flow).
- Stage 8 — the alert previews and hero preview use sample data on purpose and say so ("Sample data", "Sample messages").

## Open questions

- Hard 404 status for unknown status pages: allow a small slug lookup in `src/proxy.ts` (cached), or keep the soft 404 + noindex? (see Known issues → Stage 7)

- Real prices — Pro shows a placeholder $9 / month until billing (see Stage 8 Decisions).
- Free = email-only alerts is now enforced (your pricing copy). Keep it, or let Free keep chat channels and only advertise the difference?
- Privacy policy and terms pages: needed before public launch.
- ~~Email provider~~ — both supported, picked by `EMAIL_PROVIDER` (Stage 6 Decisions).
- ~~Telegram bot~~ — user-supplied bot token + chat id (Stage 6 Decisions).
- Email channels: add a confirmation link before public launch? (see Known issues → Stage 6)
