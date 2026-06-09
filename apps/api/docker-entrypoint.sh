#!/bin/sh
# Apply pending migrations, then start the API. Safe to run on every boot.
set -e
cd /app/apps/api
echo "[api] running prisma migrate deploy…"
pnpm exec prisma migrate deploy
echo "[api] starting server…"
exec node /app/apps/api/dist/main.js
