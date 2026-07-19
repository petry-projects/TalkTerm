#!/usr/bin/env bash
# Regression guard: assert that ci.yml serializes redundant runs per Git ref via
# a top-level `concurrency:` block. Without one, a bot pushing several commits to
# a PR branch in quick succession fans out redundant runs that pile up as
# `action_required`, inflating the Fleet Monitor failure rate (issue #380). CI is
# the only workflow in this repo that previously lacked a concurrency lane.
# Mirrors the convention of every sibling caller (pr-review.yml,
# ci-failure-analyst.yml, add-to-project.yml, ...).
#
# Run: bash scripts/test-ci-workflow.sh
set -euo pipefail

WORKFLOW=".github/workflows/ci.yml"
PASS=true

echo "=== test-ci-workflow ==="

# ── Check 0: yq is available ───────────────────────────────────────────────
if ! command -v yq &> /dev/null; then
  echo "FAIL: 'yq' is required to parse YAML safely but was not found."
  exit 1
fi
echo "PASS: 'yq' is available"

# ── Check 1: file exists ───────────────────────────────────────────────────
if [[ ! -f "$WORKFLOW" ]]; then
  echo "FAIL: $WORKFLOW not found"
  exit 1
fi
echo "PASS: $WORKFLOW exists"

# ── Check 2: a top-level concurrency block is present ──────────────────────
if ! group=$(yq '.concurrency.group' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$group" == "null" || -z "$group" ]]; then
  echo "FAIL: no top-level 'concurrency.group' block in $WORKFLOW"
  echo "      Add one to serialize redundant runs of the same ref."
  PASS=false
else
  echo "PASS: 'concurrency.group' block present in $WORKFLOW"
fi

# ── Check 3: the group is keyed on the Git ref ─────────────────────────────
# Grouping per ref lets each branch/PR have its own lane while redundant runs
# for the same ref share it. Main and each PR branch stay isolated.
if [[ "$PASS" == "true" ]]; then
  ref_pattern='github\.ref'
  if [[ ! "$group" =~ $ref_pattern ]]; then
    echo "FAIL: concurrency group ($group) is not keyed on github.ref in $WORKFLOW"
    PASS=false
  else
    echo "PASS: concurrency group keyed on github.ref in $WORKFLOW"
  fi
fi

# ── Check 4: cancel-in-progress is scoped to pull_request events ───────────
# Outdated PR runs for a superseded commit are worthless and should be cancelled,
# but every push to main must be verified and must never be cancelled. Encoding
# this as `${{ github.event_name == 'pull_request' }}` satisfies both.
if ! cancel=$(yq '.concurrency.cancel-in-progress' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$cancel" == "null" || -z "$cancel" ]]; then
  echo "FAIL: 'concurrency.cancel-in-progress' is missing in $WORKFLOW"
  PASS=false
elif [[ ! "$cancel" =~ pull_request ]]; then
  echo "FAIL: 'concurrency.cancel-in-progress' (found: '$cancel') is not scoped to"
  echo "      pull_request events in $WORKFLOW — main pushes must never be cancelled."
  PASS=false
else
  echo "PASS: 'concurrency.cancel-in-progress' scoped to pull_request events in $WORKFLOW"
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
