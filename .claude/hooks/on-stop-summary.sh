#!/usr/bin/env bash
# Stop hook. When Claude finishes a turn, surface a quick health check:
# typecheck + test results, so the user sees them without re-running.

set -u
cd "$(dirname "$0")/../.." || exit 0
[ ! -d "node_modules" ] && exit 0

echo "─── post-turn check ───"
npx --no-install tsc --noEmit --pretty false 2>&1 | tail -5 || true
echo
npx --no-install vitest run --reporter=basic 2>&1 | tail -8 || true
exit 0
