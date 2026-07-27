#!/bin/sh

set -eu

repository_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$repository_root"

compose() {
  docker compose --project-name phantom "$@"
}

start() {
  started_supabase=false
  if ! pnpm exec supabase status >/dev/null 2>&1; then
    pnpm exec supabase start
    started_supabase=true
  fi

  if ! compose up --detach --build --wait; then
    compose down --remove-orphans || true
    if [ "$started_supabase" = true ]; then
      pnpm exec supabase stop || true
    fi
    return 1
  fi

  printf 'Phantom API is healthy at http://localhost:%s/health\n' "${API_PORT:-3001}"
}

stop() {
  stop_status=0
  compose down --remove-orphans || stop_status=$?

  if pnpm exec supabase status >/dev/null 2>&1; then
    pnpm exec supabase stop || stop_status=$?
  fi

  return "$stop_status"
}

status() {
  compose ps
  if ! pnpm exec supabase status; then
    printf 'Local Supabase is not running.\n'
  fi
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  logs)
    compose logs --follow api
    ;;
  status)
    status
    ;;
  config)
    compose config --quiet
    printf 'Compose configuration is valid.\n'
    ;;
  *)
    printf 'Usage: %s {start|stop|logs|status|config}\n' "$0" >&2
    exit 64
    ;;
esac
