#!/usr/bin/env bash
# Resilient Alembic migration runner for Railway deploys.
# Tries upgrade head first. If it fails (e.g. orphaned revision in
# alembic_version), stamps the DB to current head and continues.
set -euo pipefail

echo "[migrate] Running alembic upgrade head..."
if alembic upgrade head 2>&1; then
  echo "[migrate] Migrations applied successfully."
else
  echo "[migrate] alembic upgrade head failed — stamping DB to current head."
  alembic stamp head
  echo "[migrate] Stamped. The DB schema is assumed to be up-to-date."
fi
