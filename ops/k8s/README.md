# Rocket — Kubernetes manifests

Production-shaped manifests for deploying Rocket. Backing services
(PostgreSQL, Redis, S3) are assumed **managed** and referenced via the Secret.

Apply in order (or via a Helm/Kustomize wrapper):

```bash
kubectl apply -f 00-namespace.yaml
kubectl apply -f 10-config.yaml        # edit/replace Secret from your secrets manager first
kubectl apply -f 20-migrate-job.yaml   # run + wait before scaling the API
kubectl -n rocket wait --for=condition=complete job/rocket-migrate --timeout=300s
kubectl apply -f 30-api.yaml -f 31-proxy.yaml -f 32-runner.yaml -f 33-web.yaml
kubectl apply -f 40-ingress.yaml -f 50-backup-cronjob.yaml
```

| File | Contents |
| ---- | -------- |
| `00-namespace.yaml` | `rocket` namespace |
| `10-config.yaml` | ConfigMap (non-secret) + Secret **template** |
| `20-migrate-job.yaml` | one-shot `prisma migrate deploy` |
| `30-api.yaml` | API Deployment + Service + HPA (3–20), probes, non-root |
| `31-proxy.yaml` | Proxy Deployment + Service + HPA (3–30) |
| `32-runner.yaml` | Runner Deployment + Service + HPA (2–15) |
| `33-web.yaml` | Web Deployment + Service |
| `40-ingress.yaml` | nginx Ingress (web + api hosts, TLS, WS passthrough) |
| `50-backup-cronjob.yaml` | nightly `pg_dump` CronJob |

Notes:
- Replace `ghcr.io/your-org/rocket-*:latest` with immutable image tags.
- The web image bakes `NEXT_PUBLIC_API_BASE_URL` at build time — build per environment.
- `/metrics` is scraped via pod annotations; keep it off the Ingress and behind a NetworkPolicy.
- See [`../RUNBOOK.md`](../RUNBOOK.md) for deploy/scale/DR procedures.
