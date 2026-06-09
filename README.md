# Rocket 🚀

A Postman-inspired API platform for the web — build, organize, share, and run HTTP requests.
Designed multi-tenant and horizontally scalable from day one.

> Full roadmap: [`plans/postman-clone-plan.md`](./plans/postman-clone-plan.md)

## Architecture

Two **independent** projects, each with its own `package.json` and `pnpm install`:

```
rocket/
├── frontend/                 # Next.js (React, TS) — the API client UI
│   └── types/                # shared API-contract types (synced copy)
├── backend/                  # pnpm workspace of server-side services
│   ├── api/                  # NestJS core API — auth, workspaces, collections…
│   ├── proxy/                # Request Proxy — outbound HTTP calls (CORS + SSRF safe)
│   └── shared/               # source of truth for the shared Zod schemas
├── docker-compose.yml        # backing services only (postgres + redis + minio)
├── docker-compose.full.yml   # the whole project in one command
└── package.json              # thin orchestrator (delegates to the two projects)
```

**Shared types:** the source of truth lives in `backend/shared/src`. The frontend keeps a
copy in `frontend/types` (imported as `@rocket/types`) so it stays fully standalone.
Re-sync with `pnpm sync:types` after changing the contracts.

Backing services (local via Docker): **PostgreSQL**, **Redis**, **MinIO** (S3-compatible).

## Getting started

### Option A — full stack in Docker (one command)

```bash
cp .env.example .env
pnpm stack:up        # builds & runs web + api + proxy + postgres + redis + minio
# → web http://localhost:3001 · api http://localhost:4000 · proxy http://localhost:4100
pnpm stack:down      # stop everything
```

The API container runs `prisma migrate deploy` automatically on boot.

### Option B — local dev (fast reloads)

```bash
# 1. Install both projects (own installs)
pnpm install:all          # = pnpm -C frontend install && pnpm -C backend install

# 2. Copy env and start backing services only
cp .env.example .env
pnpm infra:up             # postgres + redis + minio

# 3. Apply migrations, then run each side
pnpm -C backend prisma:deploy
pnpm dev:backend          # api :4000 + proxy :4100   (in one terminal)
pnpm dev:frontend         # web :3001                 (in another)
```

Service URLs (default ports):

- Web: http://localhost:3001
- API: http://localhost:4000  (health: `/health`)
- Proxy: http://localhost:4100 (health: `/health`)
- MinIO console: http://localhost:9101

## Common scripts

```bash
pnpm install:all   # install frontend + backend
pnpm dev:frontend  # run the Next.js app
pnpm dev:backend   # run api + proxy
pnpm build         # build backend then frontend
pnpm sync:types    # copy backend/shared/src -> frontend/types
pnpm -C backend test   # run backend tests (incl. proxy SSRF suite)
pnpm infra:up      # start docker backing services
pnpm infra:down    # stop docker backing services
pnpm stack:up      # build + run the whole project in Docker
```

## Status

- **Phase 0 — Foundation & Scaffolding** ✓ monorepo, services, Docker, SSRF-safe proxy
- **Phase 1 — Auth & Tenancy** ✓ register/login/refresh/logout, JWT cookies, email verify &
  password reset, auto-created team + personal workspace, Redis-backed rate limiting, web auth pages

Next: **Phase 2 — Collections, Folders & the Request Builder**. See the roadmap.

### Auth endpoints (Phase 1)

| Method | Route                            | Notes                          |
| ------ | -------------------------------- | ------------------------------ |
| POST   | `/api/auth/register`             | creates user + team + workspace |
| POST   | `/api/auth/login`                | sets `rocket_at` / `rocket_rt` cookies |
| POST   | `/api/auth/refresh`              | rotates refresh token          |
| POST   | `/api/auth/logout`               | revokes refresh token          |
| GET    | `/api/auth/me`                   | current user + teams/workspaces |
| POST   | `/api/auth/verify-email`         | consumes email-verify token    |
| POST   | `/api/auth/request-password-reset` | emails a reset link (console in dev) |
| POST   | `/api/auth/reset-password`       | sets new password, revokes sessions |
