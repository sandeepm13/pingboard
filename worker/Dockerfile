# syntax=docker/dockerfile:1
# ============================================================
# PingBoard worker (BullMQ checker) — production image
# Build from the REPO ROOT (the worker needs src/lib/shared and the root package.json):
#   docker build -f worker/Dockerfile -t pingboard-worker .
# Docker automatically uses worker/Dockerfile.dockerignore for this build.
# No secrets are baked in. They are passed with -e / --env-file at runtime.
# ============================================================

# ---------- Stage 1: base (shared settings for every stage) ----------

# Same Node.js 24 slim image as the web app.
FROM node:24-slim AS base

# Every following command runs inside /app in the container.
WORKDIR /app


# ---------- Stage 2: build (compile TypeScript -> one JavaScript file) ----------

# A new stage that starts from "base".
FROM base AS build

# Copy ONLY the package files first, so the install layer is cached.
COPY package.json package-lock.json .npmrc ./

# Install ALL packages (incl. esbuild, a dev tool needed to build).
RUN npm ci

# Copy the worker's source code and TypeScript settings.
COPY worker/tsconfig.json ./worker/tsconfig.json
COPY worker/src ./worker/src

# Copy the shared code (models, schemas, SSRF guard) the worker imports as @shared/*.
COPY src/lib/shared ./src/lib/shared

# Bundle the worker with esbuild into worker/dist/index.mjs.
RUN npm run build:worker


# ---------- Stage 3: prod-deps (only the packages needed at runtime) ----------

# Another stage from "base" (Docker builds it in parallel with "build").
FROM base AS prod-deps

# Copy the package files again (this stage starts empty).
COPY package.json package-lock.json .npmrc ./

# Install production packages only: no esbuild, TypeScript, test tools, etc.
RUN npm ci --omit=dev


# ---------- Stage 4: runner (the final image that actually runs) ----------

# A fresh, clean stage: nothing from build comes along unless we copy it.
FROM base AS runner

# Production mode: JSON logs (no pino-pretty, which isn't installed here).
ENV NODE_ENV=production

# Health server listens on all interfaces, so `-p 3001:3001` can reach it.
# (Default in the code is 127.0.0.1 = only inside the container.)
ENV WORKER_HEALTH_HOST=0.0.0.0

# Copy the production node_modules. Owned by root = read-only for the app (safer).
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy the compiled worker (index.mjs + its source map).
COPY --from=build /app/worker/dist ./worker/dist

# Switch to the non-root "node" user that the official image already has.
USER node

# The worker serves GET /health on this port (WORKER_HEALTH_PORT, default 3001).
EXPOSE 3001

# Start the worker. --enable-source-maps makes error stack traces point at the .ts files.
CMD ["node", "--enable-source-maps", "worker/dist/index.mjs"]
