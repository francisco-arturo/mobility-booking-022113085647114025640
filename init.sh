#!/bin/bash
# Verification entrypoint for the Northlane prototype. Keep in sync with init.ps1.
set -e

cd "$(dirname "$0")"

echo "=== Northlane prototype verification ==="

echo "=== Unit, API and site checks (node tests/run.mjs) ==="
node tests/run.mjs

echo "=== Structural score (harness validator) ==="
if [ -f ../.harness/validate.mjs ]; then
  node ../.harness/validate.mjs --target . --min-score 70
else
  echo "Validator not found; skipped structural score."
fi

echo "=== Verification complete: all checks passed ==="
