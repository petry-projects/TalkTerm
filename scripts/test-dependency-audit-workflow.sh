#!/usr/bin/env bash
# Regression guard: assert that dependency-audit.yml keeps the centrally-owned
# invariants its own header marks as MUST-NOT-CHANGE. The file is a thin caller
# stub for the org reusable
# petry-projects/.github/.github/workflows/dependency-audit-reusable.yml; the
# ecosystem-detection and audit logic lives there, not here.
#
# Context (compliance audit #519): the stub's `on:` surface drifted from the
# canonical standards/workflows/dependency-audit.yml — the `merge_group` trigger
# was dropped. `merge_group` is part of the standard trigger set: it is required
# so this stub's `dependency-audit / Detect ecosystems` check reports on a merge
# queue's `gh-readonly-queue/*` ref. Losing it silently removes the required
# status check from merge-queue runs. The `on:` triggers, `permissions:` grant,
# and job name are owned centrally and are not repo-adjustable; only the
# documented tier channel pin on the `uses:` ref may differ per repo. This guard
# locks the centrally-owned surface in, mirroring the sibling Fleet Monitor
# guards (test-dependabot-rebase-workflow.sh, test-pr-review-workflow.sh #374,
# test-ci-workflow.sh #380).
#
# Run: bash scripts/test-dependency-audit-workflow.sh
set -euo pipefail

WORKFLOW="${1:-.github/workflows/dependency-audit.yml}"
JOB="dependency-audit"
REUSABLE_PREFIX="petry-projects/.github/.github/workflows/dependency-audit-reusable.yml@"
PASS=true

echo "=== test-dependency-audit-workflow ($WORKFLOW) ==="

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

# ── Check 2: file is valid YAML ────────────────────────────────────────────
if ! yq '.' "$WORKFLOW" > /dev/null 2>&1; then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
echo "PASS: $WORKFLOW is valid YAML"

# ── Check 3: job `uses` is the org reusable pinned to an approved channel tag ─
# The ref must ride an approved moving channel (stable, next, or vN-ringN) —
# never @main, a bare SHA, a frozen @vN, or an arbitrary/unknown channel tag.
# The tier channel pin is the one part of this stub that may differ per repo.
uses=""
if ! uses=$(yq ".jobs[\"${JOB}\"].uses" "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse job uses in $WORKFLOW"
  PASS=false
fi
if [[ "$uses" == "null" || -z "$uses" ]]; then
  echo "FAIL: job '$JOB' has no 'uses:' calling the org reusable in $WORKFLOW"
  PASS=false
elif [[ "$uses" != "${REUSABLE_PREFIX}"* ]]; then
  echo "FAIL: job 'uses' ($uses) does not reference the org reusable '${REUSABLE_PREFIX}...' in $WORKFLOW"
  PASS=false
else
  channel_ref="${uses#"${REUSABLE_PREFIX}"}"
  if [[ ! "$channel_ref" =~ ^dependency-audit/(stable|next|v[0-9]+-ring[0-9]+)$ ]]; then
    echo "FAIL: job 'uses' channel '$channel_ref' is not a recognized approved channel in $WORKFLOW"
    echo "      Approved: dependency-audit/(stable|next|v<N>-ring<N>) — not @main, a SHA, or an arbitrary tag."
    PASS=false
  else
    echo "PASS: job 'uses' rides the dependency-audit channel"
  fi
fi

# ── Check 4: top-level permissions grant only the reusable's read scope ─────
# The centrally-owned grant is `contents: read`; a reusable can be granted no
# more permission than the caller holds, and widening it here is drift.
contents=""
if ! contents=$(yq '.permissions.contents' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse permissions.contents in $WORKFLOW"
  PASS=false
fi
if [[ "$contents" != "read" ]]; then
  echo "FAIL: top-level permission 'contents' must be 'read' (found: '$contents') in $WORKFLOW"
  PASS=false
else
  echo "PASS: top-level permission 'contents: read' present"
fi

# ── Check 5: the centrally-owned `on:` trigger surface is intact ────────────
# pull_request and push gate merges to main; merge_group is required so the
# required status check reports on a merge queue's gh-readonly-queue/* ref.
# None of these may be dropped on sync (see standards/ci-standards.md).
for trig in pull_request push merge_group; do
  has=""
  if ! has=$(yq ".on | has(\"${trig}\")" "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse triggers in $WORKFLOW"
    PASS=false
  fi
  if [[ "$has" != "true" ]]; then
    echo "FAIL: trigger '$trig' is missing from $WORKFLOW"
    PASS=false
  else
    echo "PASS: trigger '$trig' present"
  fi
done

# pull_request must target main.
pr_main=""
if ! pr_main=$(yq '.on.pull_request.branches | any_c(. == "main")' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse pull_request branches in $WORKFLOW"
  PASS=false
fi
if [[ "$pr_main" != "true" ]]; then
  echo "FAIL: 'pull_request' trigger must include the 'main' branch in $WORKFLOW"
  PASS=false
else
  echo "PASS: 'pull_request' trigger includes 'main'"
fi

# push must target main.
push_main=""
if ! push_main=$(yq '.on.push.branches | any_c(. == "main")' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse push branches in $WORKFLOW"
  PASS=false
fi
if [[ "$push_main" != "true" ]]; then
  echo "FAIL: 'push' trigger must include the 'main' branch in $WORKFLOW"
  PASS=false
else
  echo "PASS: 'push' trigger includes 'main'"
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
