#!/usr/bin/env bash
# Mamio IELTS - VPS GitHub auto deploy script
# Intended cron:
# */5 * * * * /var/www/mimio/deploy/auto-deploy.sh >> /var/www/mimio/deploy.log 2>&1

set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/mimio}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-origin}"
LOG_PREFIX="[mamio-auto-deploy]"
LOCK_DIR="${APP_DIR}/.deploy.lock"

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') ${LOG_PREFIX} $*"
}

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Another deploy is already running; skip."
  exit 0
fi
trap cleanup EXIT

cd "$APP_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "ERROR: ${APP_DIR} is not a git working tree."
  exit 1
fi

git config --global --add safe.directory "$APP_DIR" >/dev/null 2>&1 || true

CURRENT_COMMIT="$(git rev-parse HEAD)"
log "Checking ${REMOTE}/${BRANCH}; current=${CURRENT_COMMIT}"

git fetch --prune "$REMOTE" "$BRANCH"
REMOTE_COMMIT="$(git rev-parse "${REMOTE}/${BRANCH}")"

if [ "$CURRENT_COMMIT" = "$REMOTE_COMMIT" ]; then
  log "Already up to date."
  exit 0
fi

log "Deploying ${CURRENT_COMMIT} -> ${REMOTE_COMMIT}"

if ! git pull --ff-only "$REMOTE" "$BRANCH"; then
  log "ERROR: git pull --ff-only failed. Check local tracked-file edits on VPS."
  log "Hint: cd ${APP_DIR} && git status --short"
  exit 1
fi

log "Installing frontend dependencies"
npm ci

log "Installing backend dependencies"
(cd server && npm ci --omit=dev)

log "Building frontend"
npm run build

PM2_BIN="${PM2_BIN:-}"
if [ -z "$PM2_BIN" ]; then
  if command -v pm2 >/dev/null 2>&1; then
    PM2_BIN="$(command -v pm2)"
  elif [ -x "/root/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2" ]; then
    PM2_BIN="/root/.npm/_npx/5f7878ce38f1eb13/node_modules/pm2/bin/pm2"
  else
    PM2_BIN="npx pm2"
  fi
fi

log "Restarting PM2 process mamio-server"
if ! $PM2_BIN restart mamio-server --update-env; then
  log "PM2 process not found; starting from ecosystem config"
  $PM2_BIN start deploy/ecosystem.config.cjs --update-env
fi

$PM2_BIN save >/dev/null 2>&1 || true

if command -v curl >/dev/null 2>&1; then
  log "Health check"
  curl -fsS http://127.0.0.1:3000/api/health >/dev/null
fi

log "Deploy complete: ${REMOTE_COMMIT}"
