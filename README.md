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

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env and start backing services
cp .env.example .env
pnpm infra:up        # postgres + redis + minio

# 3. Run everything in dev
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

**Phase 0 — Foundation & Scaffolding** (in progress). See the roadmap for upcoming phases.
