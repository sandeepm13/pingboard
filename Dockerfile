# syntax=docker/dockerfile:1
#
# PingBoard web app (Next.js). Three stages; only the last one becomes the image:
#   deps    → install every package from package-lock.json (needed to build)
#   builder → `next build` with output: "standalone"
#   runner  → server.js + the few node_modules it needs, run as a non-root user
#
# Secrets (MONGODB_URI, AUTH_SECRET, ENCRYPTION_KEY…) are NOT used here; they
# are given to the container when it starts (docker-compose.yml → env file).
# Only non-secret build args below. Never add a secret as ARG or ENV: both are
# readable by anyone who has the image (`docker history`, `docker inspect`).

# Node 24 = the .nvmrc major. Pin an exact tag (e.g. node:24.x.y-alpine) with
# --build-arg NODE_IMAGE=… when you want every build to be byte-identical.
ARG NODE_IMAGE=node:24-alpine

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
# The cache mount keeps npm's download cache between builds on the same machine.
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# ---- builder ---------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Static pages bake the public URL in (canonical links, sitemap, CSP), so each
# environment builds with its own. Not a secret.
ARG APP_URL=http://localhost:3000
ENV APP_URL=${APP_URL}
# NEXT_PUBLIC_* values are copied into the browser JavaScript at build time.
# dev | uat | prod (local on a laptop). Not a secret.
ARG NEXT_PUBLIC_APP_ENV=local
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV}
# The repo has no public/ folder yet; create it so the COPY below never fails.
RUN npm run build && mkdir -p public

# ---- runner ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `node` (uid 1000) is the unprivileged user that ships with the Node image.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000

# /api/health answers 200 only when MongoDB and Redis are reachable.
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
