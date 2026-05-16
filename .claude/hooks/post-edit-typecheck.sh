#!/usr/bin/env bash
# Runs after every Edit or Write tool call. Type-checks the file if it's TS/TSX.
# Soft-fails (exit 0) so we don't block Claude's flow, but emits a clear
# warning the agent will see in the next turn.

set -u
file="${CLAUDE_TOOL_FILE_PATH:-}"
[ -z "$file" ] && exit 0
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../.." || exit 0
# Skip if node_modules isn't installed yet
[ ! -d "node_modules/typescript" ] && exit 0

out=$(npx --no-install tsc --noEmit --pretty false 2>&1 | grep -F "$file" | head -20)
if [ -n "$out" ]; then
  echo "[hook] typecheck warnings in $file:" >&2
  echo "$out" >&2
fi
exit 0
