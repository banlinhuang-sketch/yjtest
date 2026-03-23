#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${DEPLOY_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
WEB_DIR="${DEPLOY_WEB_DIR:-/var/www/yijing-test}"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE_NAME="${DEPLOY_REMOTE_NAME:-origin}"
PM2_APP_NAME="${DEPLOY_PM2_APP_NAME:-yijing-demo-api}"
LOG_FILE="${DEPLOY_LOG_FILE:-$APP_DIR/deploy-auto.log}"
API_HEALTH_URL="${DEPLOY_API_HEALTH_URL:-http://127.0.0.1:8787/api/v1/health}"
NPM_BIN="${DEPLOY_NPM_BIN:-npm}"
GIT_BIN="${DEPLOY_GIT_BIN:-git}"
PM2_BIN="${DEPLOY_PM2_BIN:-pm2}"
FORCE_DEPLOY="${DEPLOY_FORCE:-0}"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  local message="$1"
  echo "$message"
  echo "$message" >> "$LOG_FILE"
}

run_logged() {
  log "[RUN] $*"
  "$@" >> "$LOG_FILE" 2>&1
}

sync_dist() {
  mkdir -p "$WEB_DIR"

  if command -v rsync >/dev/null 2>&1; then
    run_logged rsync -a --delete "$APP_DIR/dist/" "$WEB_DIR/"
    return
  fi

  log "[WARN] rsync not found, falling back to rm/cp."
  rm -rf "$WEB_DIR"/*
  cp -r "$APP_DIR/dist/"* "$WEB_DIR"/
}

verify_health() {
  if ! command -v curl >/dev/null 2>&1; then
    log "[WARN] curl not found, skip API health verification."
    return
  fi

  local response
  response="$(curl --silent --show-error --fail "$API_HEALTH_URL")"
  log "[INFO] API health check ok: $response"
}

main() {
  cd "$APP_DIR"

  log "========== $(date '+%F %T') =========="
  log "[INFO] Checking remote updates..."

  run_logged "$GIT_BIN" fetch "$REMOTE_NAME" "$BRANCH"

  local local_commit remote_commit
  local_commit="$("$GIT_BIN" rev-parse HEAD)"
  remote_commit="$("$GIT_BIN" rev-parse "$REMOTE_NAME/$BRANCH")"

  if [[ "$FORCE_DEPLOY" != "1" && "$local_commit" == "$remote_commit" ]]; then
    log "[INFO] No new commits."
    exit 0
  fi

  log "[INFO] Deploying commit: $remote_commit"

  run_logged "$GIT_BIN" reset --hard "$REMOTE_NAME/$BRANCH"
  run_logged "$NPM_BIN" install
  run_logged "$NPM_BIN" run build

  sync_dist

  run_logged "$PM2_BIN" restart "$PM2_APP_NAME"
  verify_health

  log "[INFO] Deploy completed successfully."
}

main "$@"
