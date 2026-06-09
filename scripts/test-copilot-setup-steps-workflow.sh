#!/usr/bin/env bash
# Regression guard: assert that copilot-setup-steps.yml contains the required
# `npm ci --ignore-scripts` invocation (aligned with the org canonical template).
#
# Run: bash scripts/test-copilot-setup-steps-workflow.sh
set -euo pipefail

WORKFLOW=".github/workflows/copilot-setup-steps.yml"
PASS=true

echo "=== test-copilot-setup-steps-workflow ==="

# ── Check 1: file exists ───────────────────────────────────────────────────
if [[ ! -f "$WORKFLOW" ]]; then
  echo "FAIL: $WORKFLOW not found"
  exit 1
fi
echo "PASS: $WORKFLOW exists"

# ── Check 2: npm ci uses --ignore-scripts ─────────────────────────────────
if grep -qE 'npm ci\b' "$WORKFLOW" && ! grep -qE 'npm ci\s+--ignore-scripts' "$WORKFLOW"; then
  echo "FAIL: 'npm ci' found without '--ignore-scripts' in $WORKFLOW"
  echo "      Update the step to: run: npm ci --ignore-scripts"
  PASS=false
elif grep -qE 'npm ci\s+--ignore-scripts' "$WORKFLOW"; then
  echo "PASS: 'npm ci --ignore-scripts' present in $WORKFLOW"
else
  echo "INFO: no 'npm ci' call found (step may be absent — OK if no package-lock.json guard)"
fi

# ── Check 3: install step has the hashFiles guard ─────────────────────────
if ! grep -q "hashFiles('package-lock.json')" "$WORKFLOW"; then
  echo "FAIL: hashFiles guard missing from $WORKFLOW — 'npm ci' must be conditional"
  PASS=false
else
  echo "PASS: hashFiles guard present in $WORKFLOW"
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
