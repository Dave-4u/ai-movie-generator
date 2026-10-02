#!/usr/bin/env bash
# One-command start: installs deps, builds, and serves on PORT (default 3000).
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg is required (sudo apt install ffmpeg)"; exit 1; }
[ -d node_modules ] || npm ci
case "${1:-start}" in
  test) npm test ;;
  dev)  npx next dev -p "${PORT:-3000}" ;;
  *)    npm run build && npx next start -p "${PORT:-3000}" ;;
esac
