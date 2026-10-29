# syntax=docker/dockerfile:1
#
# PingBoard worker (runs the uptime checks, alerts and the daily rollup).
# Build from the repo root, because it needs src/lib/shared:
#   docker build -f worker/Dockerfile .
#
# Stages; only the last one becomes the image:
#   deps      → every package (esbuild + TypeScript sources need them)
#   builder   → esbuild bundles worker/src + @shared into worker/dist/index.mjs,
#               then lists the npm packages that bundle imports
#   prod-deps → installs only those packages (not Next.js, React, dev tools…)
#   runner    → bundle + runtime packages, run as a non-root user
#
# Secrets are given to the container when it starts (docker-compose.yml → env
# file). Never add a secret as ARG or ENV.

# Keep in step with the root Dockerfile.
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
WORKDIR /app

# ---- deps ------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- builder ---------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src/lib/shared ./src/lib/shared
COPY worker ./worker
RUN npm run build:worker \
 && mkdir runtime \
 && node worker/runtime-deps.mjs worker/dist/index.mjs runtime/package.json

# ---- prod-deps -------------------------------------------------------------
FROM base AS prod-deps
COPY package-lock.json .npmrc ./
COPY --from=builder /app/runtime/package.json ./package.json
# The lock file keeps every package at the version the app was tested with.
# --omit=optional skips native speed-ups (msgpackr, used by BullMQ, falls back
# to plain JavaScript).
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --omit=optional --no-audit --no-fund

# ---- runner ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/worker/dist ./worker/dist

# Files stay owned by root, so the worker can read but not change its own code.
USER node

# Health server inside the container only (WORKER_HEALTH_HOST defaults to
# 127.0.0.1); docker-compose.yml doesn't publish it.
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3001/health || exit 1

CMD ["node", "--enable-source-maps", "worker/dist/index.mjs"]
