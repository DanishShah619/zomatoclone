#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/home/ubuntu/tomato-code}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1/health}"
LOG_FILE="${LOG_FILE:-/var/log/tomato-keep-alive.log}"
MAX_RETRIES="${MAX_RETRIES:-3}"
SLEEP_SECONDS="${SLEEP_SECONDS:-5}"

log() {
  printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG_FILE"
}

cd "$APP_DIR"

retry=1
gateway_ok=0
while [ "$retry" -le "$MAX_RETRIES" ]; do
  if curl -fsS --max-time 8 "$HEALTH_URL" >/dev/null 2>&1; then
    gateway_ok=1
    break
  fi

  retry=$((retry + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "$gateway_ok" -ne 1 ]; then
  log "gateway health check failed; restarting compose stack"
  docker compose -f "$COMPOSE_FILE" up -d
  exit 0
fi

stopped_services="$(docker compose -f "$COMPOSE_FILE" ps --status exited --status dead --services 2>/dev/null || true)"

if [ -n "$stopped_services" ]; then
  log "stopped services detected: $(printf '%s' "$stopped_services" | tr '\n' ' '); restarting compose stack"
  docker compose -f "$COMPOSE_FILE" up -d
  exit 0
fi

log "ok"
