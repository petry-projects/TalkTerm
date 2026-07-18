#!/usr/bin/env bash
# Regression guard: assert that pr-review.yml serializes redundant runs for the
# same PR head commit via a top-level `concurrency:` block. Its overlapping
# triggers (check_suite:completed, pull_request:synchronize,
# pull_request_review) all fire for one commit; without concurrency they launch
# parallel duplicate reviews, inflating duration and producing cancelled runs
# (Fleet Monitor #374). Mirrors the convention of every sibling caller
# (ci-failure-analyst.yml, add-to-project.yml, ...).
#
# Run: bash scripts/test-pr-review-workflow.sh
set -euo pipefail

WORKFLOW=".github/workflows/pr-review.yml"
PASS=true

echo "=== test-pr-review-workflow ==="

# ── Check 1: file exists ───────────────────────────────────────────────────
if [[ ! -f "$WORKFLOW" ]]; then
  echo "FAIL: $WORKFLOW not found"
  exit 1
fi
echo "PASS: $WORKFLOW exists"

# ── Check 2: a top-level concurrency block is present ──────────────────────
if ! grep -qE '^concurrency:' "$WORKFLOW"; then
  echo "FAIL: no top-level 'concurrency:' block in $WORKFLOW"
  echo "      Add one to serialize duplicate reviews of the same head SHA."
  PASS=false
else
  echo "PASS: 'concurrency:' block present in $WORKFLOW"
fi

# ── Check 3: the group is keyed on the PR head commit ──────────────────────
# Grouping per head SHA lets a new commit start its own run while redundant
# events for the *same* commit share a lane.
if ! grep -qE 'head\.sha|head_sha' "$WORKFLOW"; then
  echo "FAIL: concurrency group is not keyed on the PR head SHA in $WORKFLOW"
  PASS=false
else
  echo "PASS: concurrency group keyed on head SHA in $WORKFLOW"
fi

# ── Check 4: cancel-in-progress is false ───────────────────────────────────
# An in-flight review must never be interrupted; redundant same-SHA runs queue
# and the reusable's idempotency no-ops them.
if ! grep -qE 'cancel-in-progress:[[:space:]]*false' "$WORKFLOW"; then
  echo "FAIL: 'cancel-in-progress: false' missing from $WORKFLOW"
  PASS=false
else
  echo "PASS: 'cancel-in-progress: false' present in $WORKFLOW"
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
