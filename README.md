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
│   ├── runner/               # Script Runner — sandboxed pm.* scripts (Phase 5)
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
  password reset, auto-created team + personal workspace, Redis-backed rate limiting, web auth pages,
  **social OAuth login (Google/GitHub)** with account linking (+ a dev mock provider)
- **Phase 2 — Collections & Request Builder** ✓ workspace `/app` UI with a collections/folders
  tree sidebar, the request builder (method/URL/params/headers/body/auth), **Send** through the
  proxy with a response viewer (status/time/size/body/headers), autosave, and request history.
  Body modes: none / raw / **form-data** / urlencoded / **binary** / graphql — form-data file
  fields and binary bodies upload to object storage and stream through the proxy
- **Phase 3 — Environments & Variables** ✓ environment CRUD + switcher, collection variables,
  `{{variable}}` interpolation across URL/params/headers/body/auth, scope precedence
  (collection < environment), and **secret variables encrypted at rest** (AES-256-GCM)
- **Phase 4 — Teams, Workspaces & RBAC** ✓ invite by email + accept, roles
  (Owner/Admin/Editor/Viewer) enforced at API + UI, team workspaces + switcher, collection
  forking, and public read-only share links
- **Phase 5 — Scripting & Chaining** ✓ sandboxed Script Runner service (`node:vm`, hard
  timeout, no require/process/network), `pm.*` API (variables/environment/request/response/
  test/expect/console), pre-request + test scripts, a test-results panel, and variable
  chaining (test scripts persist to the active environment)
- **Phase 6 — Collection Runner & History** ✓ run a whole collection as a **BullMQ background
  job** with iterations + a CSV/JSON **data file** (one iteration per row), per-iteration
  variable threading, an aggregated pass/fail report, and persisted `CollectionRun` history
- **Phase 7 — Import / Export & Interop** ✓ round-trip **Postman Collection v2.1**, import
  **OpenAPI 3.x** / **HAR** / **cURL**, and client-side **code generation** (cURL, fetch, axios,
  Python requests, Go)
- **Phase 8 — Mock Servers, Monitors & Docs** ✓ **mock servers** (routes derived from a
  collection, hosted at `/api/mock/:id/*`), **monitors** (BullMQ repeatable schedule, run
  history, webhook-on-failure), and auto-generated **public API docs** at `/docs/:collectionId`

Next: **Phase 9 — Real-time Collaboration** (deferred per the plan).

### Phase 8 endpoints

| Method | Route                                  | Notes                              |
| ------ | -------------------------------------- | ---------------------------------- |
| POST   | `/api/mocks`                           | create a mock from a collection    |
| ANY    | `/api/mock/:id/*`                      | public mock serving (method+path)  |
| POST   | `/api/monitors`                        | create a scheduled monitor         |
| GET    | `/api/monitors/:id/runs`               | monitor run history                |
| GET    | `/api/public/collections/:id/docs`     | public docs (PUBLIC workspace)     |

### Phase 7 endpoints

| Method | Route                            | Notes                                   |
| ------ | -------------------------------- | --------------------------------------- |
| POST   | `/api/workspaces/:id/import`     | create a collection from postman/openapi/har |
| GET    | `/api/collections/:id/export`    | export as Postman Collection v2.1       |
| POST   | `/api/import/curl`               | parse a cURL command into a request     |

### Phase 6 endpoints

| Method | Route                          | Notes                              |
| ------ | ------------------------------ | ---------------------------------- |
| POST   | `/api/collections/:id/run`     | enqueue a run (env/iterations/data) |
| GET    | `/api/runs/:id`                | run status + aggregated report     |
| GET    | `/api/collections/:id/runs`    | recent run history                 |

> Script sandbox note: `node:vm` blocks ambient access and runaway loops, and the runner is a
> network-isolated service exposing no I/O to scripts. Production hardening should move to
> isolated-vm / V8 isolates for defense against determined vm escapes.

### Phase 4 endpoints

| Method | Route                                  | Notes                          |
| ------ | -------------------------------------- | ------------------------------ |
| GET    | `/api/teams/:id/members`               | list members + roles           |
| POST   | `/api/teams/:id/invitations`           | invite by email (ADMIN+)       |
| POST   | `/api/invitations/accept`              | accept via token               |
| PATCH  | `/api/teams/:id/members/:userId`       | change role (ADMIN+)           |
| DELETE | `/api/teams/:id/members/:userId`       | remove member (ADMIN+)         |
| POST   | `/api/teams/:id/workspaces`            | create team workspace (ADMIN+) |
| PATCH  | `/api/workspaces/:id`                  | rename / set visibility (ADMIN+) |
| POST   | `/api/collections/:id/fork`            | fork into a workspace          |
| GET    | `/api/public/workspaces/:id`           | unauthenticated read of PUBLIC workspace |

### Phase 3 endpoints

| Method | Route                                      | Notes                          |
| ------ | ------------------------------------------ | ------------------------------ |
| GET    | `/api/workspaces/:id/environments`         | list environments              |
| POST   | `/api/workspaces/:id/environments`         | create (secrets encrypted)     |
| GET    | `/api/environments/:id`                    | get (secrets decrypted for member) |
| PATCH  | `/api/environments/:id`                    | update name/variables          |
| DELETE | `/api/environments/:id`                    | delete                         |
| POST   | `/api/send`                                | now accepts `environmentId` + `collectionId` for interpolation |

### Phase 2 endpoints

| Method | Route                                   | Notes                               |
| ------ | --------------------------------------- | ----------------------------------- |
| GET    | `/api/workspaces`                       | workspaces across the user's teams  |
| GET    | `/api/workspaces/:id`                   | workspace + collection summaries    |
| POST   | `/api/workspaces/:id/collections`       | create a collection                 |
| GET    | `/api/collections/:id`                  | full collection (folder/request tree) |
| PATCH  | `/api/collections/:id`                  | update name/description/tree/variables |
| DELETE | `/api/collections/:id`                  | delete a collection                 |
| POST   | `/api/send`                             | resolve + execute via proxy, log history |
| GET    | `/api/workspaces/:id/history`           | recent request history              |

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
