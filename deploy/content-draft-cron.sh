#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/mimio"
LOG_PREFIX="[mamio-content-draft]"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"
}

cd "$APP_DIR"

if [ ! -d node_modules ]; then
  log "Installing frontend dependencies"
  npm ci
fi

log "Fetching public topic seeds"
npm run content:seed

if [ -f "$APP_DIR/server/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$APP_DIR/server/.env"
  set +a
fi

if [ -z "${DEEPSEEK_API_KEY:-}" ]; then
  log "DEEPSEEK_API_KEY is missing; skipped AI draft generation"
  exit 0
fi

log "Generating AI content draft for admin review"
npm run content:generate

log "Draft generation finished; no content was published automatically"
