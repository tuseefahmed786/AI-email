#!/usr/bin/env bash
# Pre-Write hook. Blocks writes into src/ that look like inlined secrets.
# This is a safety net — the real defense is .env + process.env access only.

set -u
file="${CLAUDE_TOOL_FILE_PATH:-}"
content="${CLAUDE_TOOL_FILE_CONTENT:-}"

case "$file" in
  */src/*|*/public/*|*/.github/*) ;;
  *) exit 0 ;;
esac

# Patterns that smell like real secrets sneaking into source.
# Tunable: add patterns specific to providers we add later.
if echo "$content" | grep -E -q \
  -e '(sk-ant-[A-Za-z0-9_-]{20,})' \
  -e '(AIza[0-9A-Za-z_-]{20,})' \
  -e '(ghp_[A-Za-z0-9]{30,})' \
  -e '(GOCSPX-[A-Za-z0-9_-]{20,})' ; then
  echo "[hook] BLOCK: file '$file' contains what looks like a real secret. Use process.env instead." >&2
  exit 1
fi
exit 0
