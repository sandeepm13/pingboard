# syntax=docker/dockerfile:1
# ============================================================
# PingBoard web app (Next.js) — production image
# Build from the REPO ROOT:  docker build -t pingboard-web .
# No secrets are baked in. They are passed with -e / --env-file at runtime.
# ============================================================

# ---------- Stage 1: base (shared settings for every stage) ----------

# Start from the official Node.js 24 image, "slim" = Debian with fewer extras.
FROM node:24-slim AS base

# Turn off Next.js anonymous usage reporting, during build and at runtime.
ENV NEXT_TELEMETRY_DISABLED=1

# Every following command runs inside /app in the container.
WORKDIR /app


# ---------- Stage 2: deps (install ALL packages, incl. dev tools for the build) ----------

# A new stage that starts from "base" above.
FROM base AS deps

# Copy ONLY the package files first, so Docker can reuse this layer
# until package.json / package-lock.json change (fast rebuilds).
COPY package.json package-lock.json .npmrc ./

# Install exactly what the lock file says (clean, repeatable install).
RUN npm ci


# ---------- Stage 3: build (compile the Next.js app) ----------

# A new stage that also starts from "base".
FROM base AS build

# Take the installed node_modules from the "deps" stage.
COPY --from=deps /app/node_modules ./node_modules

# Now copy the source code (.dockerignore keeps out .env, node_modules, .git…).
COPY . .

# Build-time setting: the public URL of the site. It is baked into the sitemap,
# canonical URLs and security headers. Override with --build-arg APP_URL=...
ARG APP_URL=http://localhost:3000

# Make the ARG visible to "next build" as an environment variable.
ENV APP_URL=${APP_URL}

# Build the production app. With output: "standalone" this creates .next/standalone.
RUN npm run build


# ---------- Stage 4: runner (the small final image that actually runs) ----------

# A fresh, clean stage: nothing from deps/build comes along unless we copy it.
FROM base AS runner

# Run Next.js in production mode.
ENV NODE_ENV=production

# The port the Next.js server listens on inside the container.
ENV PORT=3000

# Listen on all network interfaces, so traffic from outside the container reaches it.
ENV HOSTNAME=0.0.0.0

# Copy the standalone server (server.js + only the node_modules it needs),
# owned by the non-root "node" user so Next.js can write its .next/cache.
COPY --from=build --chown=node:node /app/.next/standalone ./

# Copy the static assets (JS/CSS chunks). Standalone does NOT include them.
COPY --from=build --chown=node:node /app/.next/static ./.next/static

# (No "public" folder exists in this repo. If you add one later, add:
#  COPY --from=build --chown=node:node /app/public ./public)

# Switch to the non-root "node" user that the official image already has.
USER node

# Document that the app listens on port 3000 (you still publish it with -p).
EXPOSE 3000

# Start the minimal Next.js production server.
CMD ["node", "server.js"]
