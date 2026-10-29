# Deploying PingBoard (dev / uat / prod on one VM)

This guide explains how PingBoard gets from a git branch to running containers
on your Ubuntu VM, how to set the VM up once, and how to look after it.

---

## 1. Words you'll meet

| Word | Meaning |
|---|---|
| **Image** | A packaged, read-only copy of an app plus everything it needs to run (Node.js, code, packages). Built from a `Dockerfile`. |
| **Container** | A running copy of an image. Stop it, start a new one from the same image: same app. |
| **Dockerfile** | The recipe that builds an image, step by step. |
| **Multi-stage build** | A Dockerfile with several steps ("stages"); only the last one becomes the image, so build tools don't end up in it. |
| **docker compose** | A tool that starts several containers together (web + worker + redis) from one YAML file. |
| **Compose project** | One set of containers started from a compose file, named with `-p`. `pingboard-dev` and `pingboard-prod` are two projects. |
| **Volume** | Storage that outlives a container (Redis keeps its data in one). |
| **Env file** | A text file of `NAME='value'` lines: the settings and secrets a container gets when it starts. |
| **Healthcheck** | A small test Docker runs regularly to see if a container is working (here: `GET /api/health`). |
| **CI** (continuous integration) | Automatic checks (lint, types, tests, build) on every pull request. |
| **CD** (continuous deployment) | Automatic deploy after code is merged into `dev`, `uat` or `main`. |
| **GitHub Actions** | GitHub's automation. The YAML files in `.github/workflows/` are "workflows". |
| **Runner** | The machine that runs a workflow. `ubuntu-latest` = GitHub's machine; **self-hosted** = a program you install on your own VM. |
| **Secret** | A value stored encrypted in GitHub (passwords, keys). Workflows can use it; nobody can read it back. |
| **SHA** | The ID of a git commit (`3f9c2a1…`). Images are tagged with it so you can go back to an exact version. |
| **Rollback** | Going back to an older, working version. |

---

## 2. The big picture

```
 you ── pull request ──▶ GitHub ── CI (ci.yml) on GitHub's machines:
                           │        lint · typecheck · tests · build images
                           │        (nothing is deployed)
                           │
              merge into dev / uat / main  (= a "push")
                           │
                           ▼
 ┌──────────────────── Ubuntu VM (your local network) ──────────────────────┐
 │  GitHub self-hosted runner (asks GitHub "any work for me?")              │
 │        │  runs deploy.yml                                                │
 │        ▼                                                                 │
 │  writes /opt/pingboard/<env>/.env  from GitHub secrets                   │
 │        │                                                                 │
 │        ▼                                                                 │
 │  docker compose -p pingboard-<env> --env-file /opt/pingboard/<env>/.env  │
 │        │ builds images, starts containers                                │
 │        ▼                                                                 │
 │  ┌─ pingboard-prod ─────┐ ┌─ pingboard-uat ──────┐ ┌─ pingboard-dev ─────┐│
 │  │ web   :3000          │ │ web   :3100          │ │ web   :3200         ││
 │  │ worker               │ │ worker               │ │ worker              ││
 │  │ redis (own volume)   │ │ redis (own volume)   │ │ redis (own volume)  ││
 │  └──────────┬───────────┘ └──────────┬───────────┘ └──────────┬──────────┘│
 └─────────────┼────────────────────────┼────────────────────────┼───────────┘
               ▼                        ▼                        ▼
      MongoDB Atlas cluster B     MongoDB Atlas cluster A (shared)
      db pingboard_prod           db pingboard_uat   ·   db pingboard_dev
```

The VM is never reached *from* GitHub. The runner on the VM connects *out* to
GitHub and picks up jobs, which is why no SSH, open port or image registry is
needed.

**What runs in each environment**

- **web**: the Next.js site and app. The only container with a port on the VM.
- **worker**: checks the URLs, sends alerts, runs the daily rollup. Exactly
  **one** per environment, otherwise every URL would be checked twice.
- **redis**: the job queue and rate limits. Private to its environment; no port
  on the VM.
- **MongoDB** is not a container: all environments use MongoDB Atlas.

---

## 3. Environments

| Branch | `APP_ENV` | Compose project | Web port on the VM | Secrets used | Database |
|---|---|---|---|---|---|
| `main` | `prod` | `pingboard-prod` | **3000** | `*_PROD` | `pingboard_prod` (prod cluster) |
| `uat`  | `uat`  | `pingboard-uat`  | **3100** | `*_UAT`  | `pingboard_uat` (shared cluster) |
| `dev`  | `dev`  | `pingboard-dev`  | **3200** | `*_DEV`  | `pingboard_dev` (shared cluster) |

Code flows `feature/*` → `dev` → `uat` → `main`, always through pull requests.

### Why ONE compose file works for all three

`docker-compose.yml` has no environment-specific values. Two things make each
run different:

1. **The env file** (`--env-file /opt/pingboard/<env>/.env`) holds the port, the
   database, the secrets and the image tag for that environment.
2. **The project name** (`-p pingboard-<env>`) is put in front of everything
   Compose creates: containers (`pingboard-dev-web-1`), the network
   (`pingboard-dev_default`) and the Redis volume (`pingboard-dev_redis-data`).
   So dev's Redis and prod's Redis are different containers with different data
   that can't see each other.

That's also why the file has no `container_name:` and no fixed volume or
network names: those would be the same in every environment and clash.

**APP_ENV vs NODE_ENV:** inside every container `NODE_ENV=production` (it
switches Next.js and the worker into production mode). Which environment you
are in is `APP_ENV` (`dev`/`uat`/`prod`). The app code doesn't read `APP_ENV`
yet; it names the images and is available to browser code as
`NEXT_PUBLIC_APP_ENV`.

---

## 4. The files

| File | What it is |
|---|---|
| `Dockerfile` | Builds the **web** image: installs packages, runs `next build` (standalone output), then copies only the small result into a clean Node 24 Alpine image that runs as the non-root user `node`. Healthcheck: `/api/health`. |
| `.dockerignore` | What the web build may see. It's an allow-list: only `package*.json`, `.npmrc`, `next.config.ts`, `tsconfig.json`, `src/`, `public/`. `.env*` files can never get in. |
| `worker/Dockerfile` | Builds the **worker** image: bundles `worker/src` + `src/lib/shared` with esbuild, installs only the npm packages the bundle uses, runs as `node`. |
| `worker/Dockerfile.dockerignore` | Same idea for the worker build (Docker uses the file named after the Dockerfile). |
| `worker/runtime-deps.mjs` | Helper for the worker build: lists the packages the bundle imports, so the image skips Next.js, React and dev tools. |
| `src/app/api/health/route.ts` | `GET /api/health` → `200 {"status":"ok",…}` when MongoDB and Redis answer, `503` otherwise. No login, no user data. |
| `docker-compose.yml` | web + worker + redis for **one** environment (any of them). |
| `docker-compose.local.yml` | Small override for your laptop: `localhost:3000`, database `pingboard_local`. |
| `docker-compose.services.yml` | Only MongoDB + Redis on your laptop, for `npm run dev` (`npm run services:up`). |
| `.github/workflows/ci.yml` | Checks every pull request on GitHub's machines. |
| `.github/workflows/deploy.yml` | Deploys on every push to `dev` / `uat` / `main`, on your VM. |
| `.nvmrc` | Node version (`24`), used by CI. |

**Secrets never go into an image.** Images only contain code. Secrets reach a
container when it starts, from the env file on the VM. The only build-time
values are non-secret: `APP_URL` (pages have the site address baked in) and
`NEXT_PUBLIC_APP_ENV`. Because `APP_URL` is baked in, each environment builds
its own web image (`pingboard-dev-web`, `pingboard-uat-web`,
`pingboard-prod-web`), tagged with the commit SHA.

---

## 5. One-time VM setup

Do these on the VM as your normal admin user (the one with `sudo`).

### 5.1 Give the VM a fixed local IP

Other machines open PingBoard at `http://<VM-IP>:<port>`, and the IP is baked
into the web images, so it must not change.

- **Easiest:** in your router's admin page, find "DHCP reservation" (or "static
  lease") and reserve the VM's current IP for its MAC address.
- **Or** on the VM with netplan: edit `/etc/netplan/*.yaml` (set `dhcp4: false`,
  `addresses: [192.168.1.50/24]`, `routes: [{to: default, via: 192.168.1.1}]`,
  `nameservers: {addresses: [1.1.1.1, 8.8.8.8]}`), then `sudo netplan apply`.

Find the IP with `ip -4 addr` (the `inet` line of your network card).

### 5.2 Install Docker Engine and the compose plugin

From Docker's official Ubuntu instructions:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker run --rm hello-world      # prints "Hello from Docker!"
docker compose version                # needs v2.24 or newer
```

### 5.3 Create the `deploy` user

The runner and all containers are managed by this user.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
```

Being in the `docker` group lets `deploy` run Docker without `sudo`. Note:
that is effectively root access to the VM, so keep this user for deploys only.

### 5.4 Create the env-file folders

```bash
sudo mkdir -p /opt/pingboard/dev /opt/pingboard/uat /opt/pingboard/prod
sudo chown -R deploy:deploy /opt/pingboard
sudo chmod 700 /opt/pingboard /opt/pingboard/dev /opt/pingboard/uat /opt/pingboard/prod
```

The deploy workflow writes `/opt/pingboard/<env>/.env` there (mode `600`: only
`deploy` can read it). Don't edit those files by hand: the next deploy
overwrites them. Change the GitHub secret instead.

### 5.5 Install the GitHub self-hosted runner (as `deploy`)

1. On GitHub: **your repo → Settings → Actions → Runners → New self-hosted
   runner**. Choose **Linux** and your architecture (x64 for most VMs).
   GitHub shows the exact commands with the current version and a one-time
   token. Use those.
2. On the VM, switch to `deploy` and run them in its home folder:

   ```bash
   sudo -iu deploy
   mkdir actions-runner && cd actions-runner
   # paste GitHub's "Download" commands here (curl … tar xzf …)
   ./config.sh --url https://github.com/<you>/<repo> --token <TOKEN-FROM-THE-PAGE>
   ```

   When asked, accept the default runner group and name, and the default labels
   (`self-hosted`, `Linux`, `X64`). The workflow asks for `[self-hosted, linux]`
   (labels are case-insensitive).
3. Run it as a service, so it starts on boot and keeps running after you log out:

   ```bash
   exit                                   # back to your admin user
   cd /home/deploy/actions-runner
   sudo ./svc.sh install deploy           # service runs as the deploy user
   sudo ./svc.sh start
   sudo ./svc.sh status                   # should say "active (running)"
   ```

4. Back on GitHub, the runner shows as **Idle** (green).

**Security: only OK because the repo is PRIVATE.** A self-hosted runner runs
whatever code the workflow gives it, with Docker (root-level) access to your
VM. On a public repo, anyone could open a pull request that runs code on your
machine. Never attach this runner to a public repo, and keep the repo private.
(This setup also only deploys on pushes to `dev`/`uat`/`main`; pull requests run
on GitHub's machines.)

### 5.6 MongoDB Atlas: allow the VM

Atlas only accepts connections from IP addresses on its list. Your VM reaches
the internet through your router, so Atlas sees your **network's public IP**,
not `192.168.x.x`.

1. On the VM: `curl -4 ifconfig.me` → e.g. `203.0.113.25`.
2. In Atlas, for **both** clusters (shared dev/uat and prod): **Network Access
   → Add IP Address** → enter that IP → Confirm.
3. Recommended: one Atlas **database user per environment**, each allowed only
   its own database (role `readWrite` on `pingboard_dev`, `pingboard_uat` or
   `pingboard_prod`). Then a dev mistake can't touch uat data.

⚠️ Most home internet IPs change from time to time. When yours changes,
deploys fail the health check (MongoDB `down`). Run `curl -4 ifconfig.me`
again and update both Atlas lists.

### 5.7 VM size

Assumed: **4 CPUs, 8 GB RAM**, at least **40 GB free disk**.

Container limits set by the deploy workflow:

| | web | worker | redis | Total (max) |
|---|---|---|---|---|
| prod | 1.5 CPU, 1 GB | 1 CPU, 512 MB | 0.5 CPU, 256 MB | ~1.8 GB |
| uat | 0.75 CPU, 768 MB | 0.5 CPU, 384 MB | 0.5 CPU, 256 MB | ~1.4 GB |
| dev | 0.75 CPU, 768 MB | 0.5 CPU, 384 MB | 0.5 CPU, 256 MB | ~1.4 GB |

That's at most about 4.6 GB, and usually much less. dev and uat also get a
quarter of prod's CPU weight (`CPU_SHARES` 256 vs 1024), so when the VM is busy,
prod gets more CPU time.

The heavy part is **building**: `next build` during a deploy can use 2–3 GB RAM
and all CPUs for a few minutes. Build limits don't apply there, so a dev deploy
can briefly slow prod down. **8 GB / 4 CPUs is enough.** **4 GB is too small**
for three environments plus builds: give it more RAM or at least add 4 GB of
swap.

---

## 6. GitHub settings

**Settings → Secrets and variables → Actions.** Your plan has no GitHub
"Environments", so every secret is a **repository secret** with a suffix.
The workflow picks `_DEV`, `_UAT` or `_PROD` by branch and gives it to the app
under the plain name (`MONGODB_URI_PROD` → `MONGODB_URI`).

### Variable (tab "Variables", not a secret)

| Name | What | Example |
|---|---|---|
| `VM_HOST` | The VM's fixed local IP. The app's address becomes `http://VM_HOST:<port>`. | `192.168.1.50` |

### Required secrets (×3: `_DEV`, `_UAT`, `_PROD`)

| Name | What | Example format / how to make one |
|---|---|---|
| `MONGODB_URI_<ENV>` | Atlas connection string. dev and uat point at the shared cluster, prod at its own. The database name is added for you (`pingboard_<env>`). | `mongodb+srv://pb_dev:<password>@cluster0.abcde.mongodb.net/` |
| `AUTH_SECRET_<ENV>` | Signs the login cookie. Different per environment. Changing it logs everyone out. | `openssl rand -base64 32` |
| `ENCRYPTION_KEY_<ENV>` | Encrypts monitor headers, webhook URLs and bot tokens in the database. **Back the prod one up somewhere safe**: losing it makes that data unreadable. | `openssl rand -base64 32` |
| `REDIS_PASSWORD_<ENV>` | Password of that environment's Redis container. Letters and digits only. | `openssl rand -hex 32` |

### Optional secrets (×3, leave out what you don't use)

| Name | What | Example |
|---|---|---|
| `EMAIL_PROVIDER_<ENV>` | `resend` or `smtp`. **Without it, emails (password reset, alerts) fail**: the containers run in production mode, which refuses the "print to log" mode. | `resend` |
| `EMAIL_FROM_<ENV>` | Sender | `PingBoard <alerts@example.com>` |
| `RESEND_API_KEY_<ENV>` | When provider is `resend` | `re_xxxxxxxx` |
| `SMTP_HOST_<ENV>`, `SMTP_PORT_<ENV>`, `SMTP_SECURE_<ENV>`, `SMTP_USER_<ENV>`, `SMTP_PASS_<ENV>` | When provider is `smtp` | `smtp.gmail.com`, `465`, `true`, `you@gmail.com`, app password |
| `AUTH_GOOGLE_ID_<ENV>`, `AUTH_GOOGLE_SECRET_<ENV>` | Google sign-in (see the limits below) | from Google Cloud Console |
| `AUTH_GITHUB_ID_<ENV>`, `AUTH_GITHUB_SECRET_<ENV>` | GitHub sign-in. Callback URL: `http://<VM-IP>:<port>/api/auth/callback/github` | from GitHub OAuth Apps |

Secret values can't contain a `'` or a line break (the workflow stops and says
which one). A `$` is fine.

To make values on Windows without OpenSSL:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
(use `'hex'` instead of `'base64'` for the Redis password).

### Make CI required (recommended)

After CI has run once on a pull request, add its two checks, **Lint,
typecheck, test** and **Build Docker images**, as required status checks in
the ruleset that protects `uat` and `main` (and `dev` if you like). Then a pull
request can't be merged while they fail.

---

## 7. What a deploy does (`deploy.yml`)

On every push to `dev`, `uat` or `main`:

1. **Pick the environment** from the branch (table above). Any other branch stops.
2. **Check out** the code onto the VM.
3. **Check the secrets**: prints `set` / `MISSING` / `not set (optional)`
   per name, never a value. Stops if a required one is missing.
4. **Write `/opt/pingboard/<env>/.env`** (mode 600) with `APP_ENV`, `WEB_PORT`,
   `IMAGE_TAG` (= commit SHA), `APP_URL`, the database name, the limits and the
   secrets.
5. **Build and start**:
   `docker compose -p pingboard-<env> --env-file /opt/pingboard/<env>/.env up -d --build`.
   Compose only replaces containers whose image or settings changed.
6. **Wait for health**: asks `http://localhost:<port>/api/health` every 5 s,
   for up to 2 minutes. Not 200 → the deploy fails and prints the container
   status and the last 100 log lines.
7. **Clean up**: removes untagged images, keeps the **3 newest** images per
   environment (for rollback) and build cache older than a week.

Two pushes to the same branch never deploy at the same time (the second waits).

A failed deploy does **not** roll back by itself: the new containers stay. Use
the rollback steps below, or fix and push again.

---

## 8. First deploy: dev, then uat, then prod

1. Do the one-time setup (section 5) and add the variable + `_DEV` secrets.
2. Commit these files on `feature/docker-setup`, push, open a pull request into
   `dev`. CI runs. Merge it → the deploy runs on the VM (Actions tab).
3. Open `http://<VM-IP>:3200` and check sign-up, a monitor, `/api/health`.
4. Add the `_UAT` secrets, pull request `dev` → `uat`, merge → `http://<VM-IP>:3100`.
5. Add the `_PROD` secrets, pull request `uat` → `main`, merge → `http://<VM-IP>:3000`.

---

## 9. Day-to-day

Open each environment from any device on your network:

- prod: `http://<VM-IP>:3000`
- uat: `http://<VM-IP>:3100`
- dev: `http://<VM-IP>:3200`
- health: add `/api/health`

On the VM, as `deploy` (`sudo -iu deploy`):

```bash
# What's running (all environments)
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'

# Logs (Ctrl+C to stop following)
docker logs -f --tail 100 pingboard-prod-web-1
docker logs -f --tail 100 pingboard-prod-worker-1

# Restart one container
docker restart pingboard-prod-worker-1

# Which image versions are kept (newest first)
docker image ls pingboard-prod-web
```

Container names are `<project>-<service>-1`, e.g. `pingboard-uat-redis-1`.

### Commands that need the compose file

These run from the runner's copy of the repo (it holds the code of whichever
branch deployed last; that's fine because `docker-compose.yml` is the same on
every branch):

```bash
cd ~/actions-runner/_work/<repo>/<repo>          # e.g. _work/pingboard/pingboard

# Restart a whole environment with the same version
docker compose -p pingboard-uat --env-file /opt/pingboard/uat/.env restart

# Stop an environment (Redis data stays in its volume)
docker compose -p pingboard-dev --env-file /opt/pingboard/dev/.env down
```

### Roll back to an older version

1. Find the SHA of a good version: `docker image ls pingboard-prod-web` (only
   the last 3 are kept), or in the GitHub Actions history.
2. Start that version without building:

   ```bash
   cd ~/actions-runner/_work/<repo>/<repo>
   IMAGE_TAG=<old-sha> docker compose -p pingboard-prod --env-file /opt/pingboard/prod/.env up -d --no-build
   curl -s http://localhost:3000/api/health
   ```

   `IMAGE_TAG=…` in front overrides the value in the env file for this one
   command.
3. Then fix the problem with a normal pull request. The next push to that
   branch deploys the new version and replaces the rollback.

Rolling back code does not roll back the database.

### Test the Docker setup on your laptop (Windows, Docker Desktop)

1. Have a `.env.dev` in the repo folder (same keys as `.env`) with at least
   `MONGODB_URI`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `REDIS_PASSWORD` and
   `APP_URL=http://localhost:3000`. Remove lines you leave empty, and
   don't set `SSRF_ALLOW_PRIVATE=true` (production mode refuses it; compose
   forces it off anyway). Your laptop's public IP must be in the Atlas list.
2. Run:

   ```powershell
   docker compose -f docker-compose.yml -f docker-compose.local.yml -p pingboard-local --env-file .env.dev up -d --build
   ```

3. Open http://localhost:3000 (database `pingboard_local`).
4. Stop: same command with `down` instead of `up -d --build`.

---

## 10. Security notes

- Repo **private** + self-hosted runner only. Never make the repo public while
  the runner is attached (remove it first: Settings → Actions → Runners).
- Secrets live in GitHub secrets and in `/opt/pingboard/<env>/.env` (mode 600).
  Never in git, never in an image, never printed in logs.
- Only the web port is published. Worker and Redis have no ports; each Redis is
  reachable only from its own environment's containers.
- Docker opens published ports in the VM's firewall by itself (it bypasses
  `ufw`), so ports 3000/3100/3200 are reachable from your whole local network.
  That's intended here. Don't forward them on your router.
- Containers run as the non-root `node` user, with `no-new-privileges`.
- `SSRF_ALLOW_PRIVATE` is forced to `false` in every container.

### Known limits of this setup

- **Plain http.** Fine on a home network; passwords travel unencrypted over it.
- **Google sign-in won't work** on `http://<IP>` addresses: Google only allows
  `https` redirect URLs (or `localhost`). GitHub sign-in allows http.
- **"Connect Google/GitHub" in Settings** uses a secure-only cookie in
  production, which browsers refuse on plain http. It needs HTTPS (next steps).
- **Rate limits trust `X-Forwarded-For`**, which anyone can fake until a
  reverse proxy sets it. Acceptable on a private network.
- Mongo and Redis are checked by `/api/health`; if Atlas is unreachable (for
  example your public IP changed), the web container shows as `unhealthy`.

---

## 11. Next steps (later, not part of this setup)

- **Nginx** (or Caddy) in front of the three web ports, with names like
  `dev.pingboard.example`.
- **HTTPS certificates** (Let's Encrypt), then `APP_URL=https://…` so HSTS and
  secure cookies turn on, and Google sign-in works.
- **Domains** and **public access** (port forwarding or a tunnel such as
  Cloudflare Tunnel), only after HTTPS and a review of rate limits.
- Automatic rollback when the health check fails.
- Backups: Atlas backups for `pingboard_prod`, and a safe copy of
  `ENCRYPTION_KEY_PROD`.
