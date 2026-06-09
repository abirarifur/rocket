# Rocket 🚀

A Postman-inspired API platform for the web — build, organize, share, and run HTTP requests.
Designed multi-tenant and horizontally scalable from day one.

> Full roadmap: [`plans/postman-clone-plan.md`](./plans/postman-clone-plan.md)

## Architecture

A pnpm + Turborepo monorepo of independently deployable services:

| Package          | Description                                                            |
| ---------------- | ---------------------------------------------------------------------- |
| `apps/web`       | Next.js (React, TS) frontend — the API client UI                       |
| `apps/api`       | NestJS core API — auth, workspaces, collections, environments, RBAC    |
| `apps/proxy`     | Request Proxy service — performs outbound HTTP calls (CORS + SSRF safe) |
| `packages/types` | Shared Zod schemas & DTOs (Postman Collection v2.1 compatible)         |

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
# 1. Install dependencies
pnpm install

# 2. Copy env and start backing services only
cp .env.example .env
pnpm infra:up        # postgres + redis + minio

# 3. Apply migrations + run all apps in dev
pnpm --filter @rocket/api prisma:deploy
pnpm dev
```

Service URLs (default ports):

- Web: http://localhost:3000
- API: http://localhost:4000  (health: `/health`)
- Proxy: http://localhost:4100 (health: `/health`)
- MinIO console: http://localhost:9001

## Common scripts

```bash
pnpm build        # build all packages
pnpm typecheck    # type-check all packages
pnpm lint         # lint all packages
pnpm test         # run tests
pnpm infra:up     # start docker backing services
pnpm infra:down   # stop docker backing services
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
