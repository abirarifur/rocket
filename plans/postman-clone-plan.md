# Plan: Postman-Inspired API Platform (Web App)

## Context

We are building a Postman-inspired **web** application for building, organizing, sharing, and
running HTTP API requests. The product centers on **Teams, Workspaces, and Collections** plus a
full request/response builder, environments & variables, and (later) scripting, a collection
runner, mock servers, and more.

Key decisions locked with the user:
- **Scale target:** millions of users → multi-tenant, horizontally scalable architecture from day one.
- **First release:** *Lean MVP on a scalable foundation* — ship the core fast, but on infrastructure that scales.
- **Teams/workspaces:** an **early** phase (right after the single-user core).
- **Real-time co-editing:** **deferred** to a later phase (start with optimistic/last-write-wins + autosave).
- **Cloud:** **cloud-agnostic** (Docker + Kubernetes), so it can run on AWS/GCP/Azure; defaults suggested below.

The single hardest *web-specific* constraint: browsers enforce **CORS**, so the app cannot call
arbitrary third-party APIs directly. Every request the user "sends" is relayed through our own
**Request Proxy Service**, which makes the real HTTP call server-side and returns the result.

---

## Architecture Overview

**Cloud-agnostic, containerized, stateless services behind a gateway.**

```
                          ┌─────────────────────────────┐
   Browser (Next.js SPA)  │  CDN / Edge (static assets)  │
        │                 └─────────────────────────────┘
        │ HTTPS / WSS
        ▼
   ┌───────────────┐   ┌──────────────────────────────────────────────┐
   │  API Gateway  │──▶│  Auth & API service (NestJS)                   │
   │ (Ingress/LB)  │   │  workspaces, collections, envs, RBAC, sharing  │
   └──────┬────────┘   └──────────────────────────────────────────────┘
          │            ┌──────────────────────────────────────────────┐
          ├───────────▶│  Request Proxy service (isolated, scalable)    │
          │            │  executes outbound HTTP, SSRF guard, timeouts  │
          │            └──────────────────────────────────────────────┘
          │            ┌──────────────────────────────────────────────┐
          └───────────▶│  Script Runner service (later phase)           │
                       │  sandboxed JS (pre-request/test scripts)       │
                       └──────────────────────────────────────────────┘

   Stateful backing services:
   PostgreSQL (primary + read replicas)   Redis (cache, sessions, rate-limit, queues)
   Object storage / S3-compatible (large response bodies, exports, attachments)
   Message queue (BullMQ on Redis, or NATS/Kafka later) for runner/monitors/async jobs
```

**Why separate services**
- **Request Proxy** is the hottest, most abuse-prone path (SSRF, slow targets, huge payloads). Isolating it lets us scale, rate-limit, and harden it independently, and prevents a slow upstream from starving the core API.
- **Script Runner** executes untrusted user JS → must run in a locked-down sandbox (isolated workers / `isolated-vm`, no network except via proxy), ideally on separate nodes.
- **Core API** stays fast and CPU-light (CRUD + auth + RBAC).

### Recommended Tech Stack (TypeScript end-to-end)
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **Next.js (React, TypeScript)**, TanStack Query, Zustand/Redux, Monaco editor, CodeMirror for body/script editing | Rich interactive panels, SSR for marketing/docs pages, huge ecosystem |
| Backend API | **NestJS (Node, TypeScript)** | Structured, modular, DI, good for large teams; shares types with frontend |
| Request Proxy | Standalone **Node (Undici/Got)** service; Go is a viable later optimization | Independently scalable, security-isolated |
| DB | **PostgreSQL** (managed: RDS / Cloud SQL / Neon) + read replicas | Relational hierarchy + JSONB for flexible request bodies |
| Cache/Queue | **Redis** (+ BullMQ) | Sessions, caching, rate-limiting, background jobs |
| Object storage | **S3-compatible** (S3 / GCS / MinIO) | Large response bodies, exports, attachments |
| Auth | JWT access + refresh tokens (httpOnly cookies), OAuth social login, optional SSO/SAML later | Stateless, scalable |
| Infra | **Docker + Kubernetes**, Helm, Terraform; OpenTelemetry + Prometheus/Grafana; centralized logging | Cloud-agnostic, observable |
| Shared | Monorepo (pnpm + Turborepo) with shared `types`/`validation` (Zod) packages | One source of truth for request/collection schemas |

---

## Data Model (core entities)

Multi-tenant from the start. Top-level tenant boundary = **Team** (a personal account is a team of one).

- **User** — id, email, name, password hash / OAuth identities, status.
- **Team** — id, name, plan/tier, owner; tenant boundary for billing & limits.
- **TeamMembership** — user↔team, **role** (Owner, Admin, Editor, Viewer) → RBAC.
- **Workspace** — id, team_id, name, visibility (`personal` | `team` | `public`).
- **WorkspaceMembership** (optional finer-grained access) — user↔workspace role.
- **Collection** — id, workspace_id, name, description, schema version; supports **forking** (fork_of_id) and ordering.
- **Folder** — id, collection_id, parent_folder_id (self-referential → nesting), name, order.
- **Request** — id, collection_id, folder_id (nullable), name, method, url, params, headers (JSONB), body (JSONB: type + content), auth (JSONB), order; `pre_request_script` / `test_script` (later).
- **Environment** — id, workspace_id, name, variables (JSONB array of {key,value,secret,enabled}).
- **Variable scopes** — Global (team), Collection, Environment, Local — resolved in Postman's precedence order (Local → Data → Environment → Collection → Global).
- **RequestHistory** — id, user_id, workspace_id, request snapshot, response meta, executed_at (large bodies → object storage).
- **Later:** ApiKey/Secret (encrypted), Monitor, MockServer, MockExample, CollectionRun, Comment, Notification.

Store request/collection JSON compatible with the **Postman Collection Format v2.1** so import/export interops with real Postman.

---

## Phase-by-Phase Plan

### Phase 0 — Foundation & Scaffolding *(infra + skeleton)*
- Monorepo setup (pnpm + Turborepo): `apps/web`, `apps/api`, `apps/proxy`, `packages/types`, `packages/config`.
- Dockerize each service; local dev via `docker-compose` (Postgres + Redis + MinIO).
- DB layer (Prisma or TypeORM) + initial migrations; seed script.
- CI pipeline (lint, typecheck, test, build images); base Kubernetes/Helm charts + Terraform skeleton.
- Observability baseline: structured logging, health/readiness endpoints, OpenTelemetry traces.
- **Exit criteria:** all services boot locally and in a dev cluster; `/health` green; CI green.

### Phase 1 — Auth & Tenancy *(scalable foundation)*
- Email/password signup + login, email verification, password reset; JWT access + refresh (httpOnly cookies); social OAuth (Google/GitHub).
- **Team** auto-created per user; **Workspace** (personal) auto-created.
- Tenant-scoping middleware (every query filtered by team/workspace); rate-limiting (Redis) and per-tenant quotas.
- **Exit criteria:** a user can register, log in, and gets a personal team + workspace; all API routes tenant-scoped & rate-limited.

### Phase 2 — Collections, Folders & Request Builder (CORE MVP) *(the heart)*
- Workspace sidebar: tree of Collections → Folders (nested) → Requests; create/rename/delete/reorder (drag-drop).
- **Request builder UI:** method selector, URL bar with query-param editor, headers editor, body editors (raw/JSON with Monaco, form-data, x-www-form-urlencoded, GraphQL, binary), auth tab (None, Basic, Bearer, API Key to start).
- **Request Proxy Service:** receives request spec, performs outbound call with timeouts + size caps + **SSRF protection** (block internal IPs/metadata endpoints, allowlist schemes), returns status/headers/body/timing/size.
- **Response viewer:** pretty/raw/preview body, headers, cookies, status, time, size; large bodies streamed to object storage.
- Autosave (optimistic / last-write-wins) + request **History**.
- **Exit criteria:** a user can build, send, and save a real request to a real API, see the response, and re-open it. *This is the first usable product.*

### Phase 3 — Environments & Variables *(makes it practical)*
- Environment CRUD per workspace; environment switcher in the header.
- Variable scopes (Global/Collection/Environment/Local) with Postman precedence; `{{variable}}` interpolation in URL, params, headers, body, auth.
- **Secret** variables (masked in UI; encrypted at rest).
- Collection-level variables & descriptions.
- **Exit criteria:** `{{base_url}}`/`{{token}}` resolve correctly across scopes; switching environments changes resolved values.

### Phase 4 — Teams, Shared Workspaces & RBAC *(collaboration — early, per decision)*
- Team workspaces; invite members by email; accept/decline invitations.
- **Roles & RBAC:** Owner / Admin / Editor / Viewer enforced at API and UI; per-workspace overrides optional.
- Sharing: move/copy collections into team workspaces; **public workspaces** (read-only share links).
- **Collection forking** + basic change tracking.
- **Exit criteria:** a team can share a collection; a Viewer cannot edit; an Editor can; invitations work end-to-end.

### Phase 5 — Scripting & Chaining *(power features)*
- **Script Runner Service:** sandboxed JS (`isolated-vm` / isolated workers), no ambient network (outbound only via proxy), strict CPU/time/memory limits.
- Implement a `pm.*`-compatible API subset: `pm.environment`, `pm.variables`, `pm.request`, `pm.response`, `pm.test`, `pm.expect` (assertions), `pm.sendRequest`.
- Pre-request scripts and test scripts per request and per collection/folder; test results panel.
- **Exit criteria:** a pre-request script can set a variable; a test script can assert on the response and show pass/fail; scripts cannot escape the sandbox.

### Phase 6 — Collection Runner & History *(automation)*
- Run a collection/folder sequentially with an environment + optional data file (CSV/JSON) for data-driven runs; iteration count.
- Aggregated run report (per-request pass/fail, timings); persisted **CollectionRun** records.
- Runs executed as background jobs (BullMQ) for large collections.
- **Exit criteria:** a user can run a multi-request collection with assertions and see a pass/fail summary report.

### Phase 7 — Import / Export & Interop *(adoption driver)*
- **Postman Collection v2.1** import/export (round-trip compatible).
- **OpenAPI / Swagger** import → generate a collection.
- **cURL** import (paste a curl command → request) and **HAR** import.
- **Code generation:** snippets for the request in many languages (curl, JS fetch/axios, Python requests, Go, etc.).
- **Exit criteria:** import a real Postman collection and an OpenAPI spec; export and re-import without loss.

### Phase 8 — Mock Servers, Monitors & Docs *(platform features)*
- **Mock servers:** serve saved example responses at a hosted URL (path/method matching).
- **Monitors:** scheduled collection runs (cron via queue) with result history + alerting hooks.
- **Auto-generated API documentation** from collections (public, shareable).
- **Exit criteria:** a mock server returns configured examples; a monitor runs on schedule and records results.

### Phase 9 — Real-time Collaboration *(deferred, per decision)*
- Presence (who's viewing), live cursors, then conflict-free co-editing (CRDT, e.g. Yjs) over WebSockets.
- Comments/threads on requests/collections; activity feed; notifications.
- **Exit criteria:** two users edit the same collection concurrently without clobbering each other.

### Phase 10 — Hardening, Scale & Monetization
- Load testing; autoscaling (HPA), read-replica routing, caching strategy; Postgres partitioning/sharding plan for history.
- Security: pen-test, secrets management (KMS/Vault), audit logs, SSO/SAML/SCIM for enterprise.
- Billing & plan tiers (Stripe) with per-team quotas/usage metering.
- Backups, DR runbook, SLOs/alerting.

---

## Cross-Cutting Concerns (apply every phase)
- **Security:** SSRF defense on the proxy, encryption at rest for secrets, RBAC checks on every mutation, input validation (Zod) at boundaries, audit logging.
- **Scalability:** stateless services, Redis-backed sessions/rate-limits, read replicas, object storage for blobs, background queues for heavy work.
- **Testing:** unit (Vitest/Jest), integration (Testcontainers for Postgres/Redis), E2E (Playwright) on critical flows; contract tests for the proxy.
- **Schema compatibility:** keep stored collection/request JSON aligned with Postman v2.1 so import/export stays lossless.

---

## Verification (per phase, end-to-end)
- **Local:** `docker-compose up` brings up web + api + proxy + Postgres + Redis + MinIO.
- **Phase 1:** register → verify email → login → confirm personal team/workspace exist (DB check + UI).
- **Phase 2:** create collection → build a `GET https://httpbin.org/get` request → send → see 200 + body/headers/timing; reload and confirm it persisted. Test SSRF guard by attempting `http://169.254.169.254/` and confirming it's blocked.
- **Phase 3:** define `{{base_url}}` in two environments → switch → confirm resolved URL changes; mark a var secret → confirm masked + encrypted in DB.
- **Phase 4:** invite a second user as Viewer → confirm they can read but not edit; promote to Editor → confirm edit works.
- **Phase 5:** pre-request script sets a token var used by the request; test script asserts `pm.response.to.have.status(200)` → see pass; attempt `require('fs')`/network escape → confirm blocked.
- **Phase 6:** run a 5-request collection with a CSV data file, 3 iterations → see aggregated pass/fail report.
- **Phase 7:** import an official Postman v2.1 collection and an OpenAPI spec → verify requests created; export → re-import → diff is empty.
- **Phase 8:** hit a mock server URL → get configured example; schedule a monitor → confirm it runs and records.
- **Scale checks (Phase 10):** k6/Artillery load test the proxy and API; verify autoscaling and p95 latency targets.

---

## Open Items / Future Decisions
- Pick ORM (Prisma vs TypeORM) in Phase 0.
- Choose managed Postgres/Redis providers per target cloud at deploy time.
- Decide GraphQL vs REST for the internal API (recommend REST + OpenAPI for the public API later).
- Real-time CRDT library selection (Yjs) deferred to Phase 9.
