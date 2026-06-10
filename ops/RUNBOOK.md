# Rocket — Operations & DR Runbook

Operational procedures for running Rocket in production. Pairs with the
Kubernetes manifests in [`ops/k8s/`](./k8s) and the scripts in [`ops/`](.).

## Architecture recap

Stateless services (scale horizontally): **web**, **api**, **proxy**, **runner**.
Stateful backing services (use managed offerings): **PostgreSQL**, **Redis**,
**S3-compatible object storage**. The api also runs in-process BullMQ workers
(collection runs, monitors); these scale with api replicas.

## Health & readiness

| Endpoint | Meaning | Used by |
| -------- | ------- | ------- |
| `GET /health` | liveness (process up) | k8s livenessProbe |
| `GET /ready` | readiness (DB + Redis reachable) | k8s readinessProbe / LB |
| `GET /metrics` | Prometheus metrics | Prometheus (in-cluster) |

A pod failing `/ready` is pulled from the Service endpoints automatically.

## Deploy / upgrade

```bash
# 1. Build & push images (CI does this) — tag immutably, not :latest in prod.
# 2. Apply config/secret (from your secrets manager, not git).
kubectl apply -f ops/k8s/00-namespace.yaml -f ops/k8s/10-config.yaml
# 3. Run migrations BEFORE rolling the API (avoids multi-replica races).
kubectl apply -f ops/k8s/20-migrate-job.yaml
kubectl -n rocket wait --for=condition=complete job/rocket-migrate --timeout=300s
# 4. Roll out services.
kubectl apply -f ops/k8s/30-api.yaml -f ops/k8s/31-proxy.yaml \
  -f ops/k8s/32-runner.yaml -f ops/k8s/33-web.yaml \
  -f ops/k8s/40-ingress.yaml -f ops/k8s/50-backup-cronjob.yaml
kubectl -n rocket rollout status deploy/rocket-api
```

Rollback: `kubectl -n rocket rollout undo deploy/rocket-api`. Migrations are
forward-only — keep them backward-compatible (expand/contract) so the previous
release runs against the new schema during a rollback.

## Scaling

- HPAs scale api/proxy/runner on CPU (api 3–20, proxy 3–30, runner 2–15).
  Tune `maxReplicas` and targets per load tests (`ops/load-test.js`).
- DB is the first bottleneck at scale: add **read replicas** and route read-only
  queries to them; bump the Postgres `connection_limit` in `DATABASE_URL` and
  put a pooler (PgBouncer) in front.
- Redis: use a managed cluster; presence is single-instance today — add the
  socket.io Redis adapter before running multiple api replicas with live
  collaboration.

## Backups & DR

- **Automated:** the `rocket-db-backup` CronJob runs `pg_dump` nightly (ship to
  object storage). Also enable the managed DB's **PITR** for RPO < 5 min.
- **Manual backup:** `DATABASE_URL=… ops/backup.sh ./backups`
- **Restore:**
  ```bash
  gunzip -c rocket-YYYYMMDD.sql.gz | psql "$DATABASE_URL"
  ```
- **Object storage:** enable versioning + lifecycle on the bucket; uploads
  (form-data/binary, exports) live here.
- **Secrets:** `ENCRYPTION_KEY` decrypts secret variables — back it up securely
  and separately; losing it makes stored secrets unrecoverable.

### DR drill (quarterly)
1. Restore the latest dump into a scratch DB.
2. Point a staging api at it; run the integration suite (`pnpm -C backend test:int`).
3. Record restore time → validates RTO.

## Incident response

| Symptom | Check | Action |
| ------- | ----- | ------ |
| 5xx spike | `/ready` per pod; api logs (`x-request-id`) | scale api; check DB/Redis health |
| Slow responses | `http_request_duration_seconds` p95 in Prometheus | scale; inspect slow DB queries |
| Proxy errors | proxy logs; outbound target health | SSRF blocks are expected (403 BLOCKED_SSRF) |
| Runs/monitors stuck | Redis/BullMQ; runner pods | restart runner; check queue depth |
| 429s | per-route rate limits (Redis `rl:*`) | raise limits or investigate abuse |

## Security notes

- `/metrics` is not exposed via Ingress; restrict it with a NetworkPolicy so only
  Prometheus can scrape it.
- The request **proxy** enforces SSRF protection (blocks private/loopback/metadata
  ranges). Keep it on its own deployment and rate-limited.
- The script **runner** uses `node:vm` (no ambient network except the proxy);
  harden with isolated-vm / gVisor for untrusted workloads.
