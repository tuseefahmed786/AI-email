#!/usr/bin/env bash
# Installed as a git pre-commit hook by `npm run prepare-hooks`.
# Blocks commits that don't pass typecheck or unit tests.

set -euo pipefail
echo "→ typecheck"
npm run typecheck
echo "→ unit tests"
npm run test
echo "✓ pre-commit ok"
