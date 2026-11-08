#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
PORT="${PORT:-${APP_PORT:-3000}}"
OPENCODE_WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"
export PROJECT_DIR PORT OPENCODE_WEB_DIR

cd "$PROJECT_DIR"

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

[[ -f package.json ]] || { echo "Missing package.json in $PROJECT_DIR" >&2; exit 1; }
[[ "$PORT" =~ ^[0-9]+$ ]] && (( PORT > 0 && PORT < 65536 )) || { echo "Invalid PORT: $PORT" >&2; exit 1; }

if [[ -f package-lock.json ]]; then
  run_timed 'npm ci' npm ci --no-audit --no-fund
else
  run_timed 'npm install' npm install --no-audit --no-fund
fi
run_timed 'npm run build' npm run build

DIST_DIR="$PROJECT_DIR/dist"
[[ -f "$DIST_DIR/index.html" ]] || { echo "Build did not create $DIST_DIR/index.html" >&2; exit 1; }
run_timed 'deployment metadata' node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const project = path.resolve(process.env.PROJECT_DIR);
  const directory = path.resolve(project, "dist");
  fs.mkdirSync(process.env.OPENCODE_WEB_DIR, { recursive: true });
  fs.writeFileSync(path.join(process.env.OPENCODE_WEB_DIR, "deployment-output.json"), JSON.stringify({ project, directory }));
'

# Keep Vite's production preview in the foreground for the controller-owned app-server.
run_timed 'vite preview' npm run preview -- --host 0.0.0.0 --port "$PORT" --strictPort
