#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3100}"
LOG_FILE="${LOG_FILE:-/tmp/ai-governance-mcp-smoke.log}"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

PORT="$PORT" node src/index.js >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in {1..20}; do
  if curl -fsS "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

HEALTH_JSON=$(curl -fsS "http://localhost:${PORT}/health")
STATUS=$(printf '%s' "$HEALTH_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);process.stdout.write(j.status||'');});")
VERSION=$(printf '%s' "$HEALTH_JSON" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);process.stdout.write(j.version||'');});")

if [[ "$STATUS" != "ok" ]]; then
  echo "Health check failed: $HEALTH_JSON"
  exit 1
fi

if [[ "$VERSION" != "2.0.0" ]]; then
  echo "Unexpected version in health response: $HEALTH_JSON"
  exit 1
fi

echo "health=$HEALTH_JSON"
