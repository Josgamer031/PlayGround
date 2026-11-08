#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAPTURE_URL="${CAPTURE_URL:?Set CAPTURE_URL to the exact preview URL}"
CAPTURE_DIR="${CAPTURE_DIR:?Set CAPTURE_DIR to an evidence directory outside the project}"
RUNTIME_DIR="${RUNTIME_DIR:?RUNTIME_DIR must point to the worker runtime}"
CAPTURE_DIR="$(mkdir -p "$CAPTURE_DIR" && cd "$CAPTURE_DIR" && pwd)"
export CAPTURE_URL CAPTURE_DIR CAPTURE_STRICT=1

case "$CAPTURE_DIR/" in
  "$PROJECT_DIR/"*) echo "Capture output must be outside the project: $CAPTURE_DIR" >&2; exit 1 ;;
esac
[[ -f "$RUNTIME_DIR/scripts/default-capture.mjs" ]] || { echo "Missing runtime browser capture helper" >&2; exit 1; }

run_timed() {
  local label="$1" start end status
  shift
  start="$(date +%s%3N)"
  set +e
  "$@"
  status=$?
  set -e
  end="$(date +%s%3N)"
  printf '[timing] %s: %s ms (exit %s)\n' "$label" "$((end - start))" "$status" >&2
  return "$status"
}

run_timed 'browser capture (desktop + mobile)' node "$RUNTIME_DIR/scripts/default-capture.mjs"
