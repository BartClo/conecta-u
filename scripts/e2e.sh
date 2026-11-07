#!/usr/bin/env bash
# Levanta el entorno e2e, corre Playwright y lo tumba con volumenes.
# Uso: scripts/e2e.sh [argumentos de playwright]. E2E_KEEP=1 deja el compose arriba.
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "${BASH_SOURCE[0]}")/.."
compose() { docker compose -f docker-compose.e2e.yml --profile qa "$@"; }

cleanup() {
  status=$?
  if [ -z "${E2E_KEEP:-}" ]; then compose down -v --remove-orphans; fi
  exit "$status"
}
trap cleanup EXIT

# Corrida limpia aunque una anterior haya quedado a medias.
compose down -v --remove-orphans
compose up -d --build --wait --wait-timeout 300

(
  cd frontend
  [ -d node_modules ] || npm ci --legacy-peer-deps
  npx playwright install chromium
  npx playwright test "$@"
)
