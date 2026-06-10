#!/bin/sh
# Postgres logical backup for Rocket. Run on a schedule (cron / k8s CronJob).
# Restore with:  gunzip -c <file> | psql "$DATABASE_URL"
#
# Usage: DATABASE_URL=postgres://... ./ops/backup.sh [outdir]
set -e

DB_URL="${DATABASE_URL:?set DATABASE_URL}"
OUT_DIR="${1:-./backups}"
mkdir -p "$OUT_DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$OUT_DIR/rocket-$STAMP.sql.gz"

echo "[backup] dumping to $FILE"
pg_dump --no-owner --no-privileges "$DB_URL" | gzip > "$FILE"
echo "[backup] done ($(du -h "$FILE" | cut -f1))"

# Retain the 14 most recent dumps.
ls -1t "$OUT_DIR"/rocket-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
echo "[backup] retention applied (kept latest 14)"
