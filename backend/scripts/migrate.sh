#!/usr/bin/env bash
# Alembic migration runner for Railway deploys.
# Runs upgrade head and reports clearly if it fails.
set -euo pipefail

echo "[migrate] cwd: $(pwd)"
echo "[migrate] alembic.ini exists: $(test -f alembic.ini && echo yes || echo NO — wrong working directory)"
echo "[migrate] Running alembic upgrade head..."
alembic upgrade head
echo "[migrate] Migrations applied successfully."
