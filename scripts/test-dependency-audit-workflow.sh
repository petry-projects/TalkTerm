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

# branch_included <branch> — read an ordered branch-pattern list on stdin (one
# pattern per line) and return success only if <branch> is INCLUDED after the
# patterns are applied in order, matching GitHub's semantics: a positive glob
# includes a ref, a later negative glob (`!`) excludes it again, and a still
# later positive glob re-includes it. A raw `main` entry is therefore not enough
# — `[main, '!main']` contains "main" but excludes it, so this must FAIL.
branch_included() {
  local branch="$1" pat stripped included=false
  while IFS= read -r pat; do
    [[ -z "$pat" ]] && continue
    if [[ "$pat" == '!'* ]]; then
      stripped="${pat#!}"
      # shellcheck disable=SC2053  # intentional glob match, RHS unquoted
      [[ "$branch" == $stripped ]] && included=false
    else
      # shellcheck disable=SC2053  # intentional glob match, RHS unquoted
      [[ "$branch" == $pat ]] && included=true
    fi
  done
  [[ "$included" == "true" ]]
}

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
  approved_pattern='^dependency-audit/(stable|next|v[0-9]+-ring[0-9]+)$'
  if [[ ! "$channel_ref" =~ $approved_pattern ]]; then
    echo "FAIL: job 'uses' channel '$channel_ref' is not a recognized approved channel in $WORKFLOW"
    echo "      Approved: dependency-audit/(stable|next|v<N>-ring<N>) — not @main, a SHA, or an arbitrary tag."
    PASS=false
  else
    echo "PASS: job 'uses' rides the dependency-audit channel"
  fi
fi

# ── Check 4: top-level permissions grant exactly the reusable's read scope ──
# The centrally-owned grant is `contents: read` and nothing else; a reusable can
# be granted no more permission than the caller holds, so any additional
# top-level permission (e.g. `actions: write`, `pull-requests: write`) is drift
# and must fail — not just an incorrect `contents` value.
perm_keys=""
if ! perm_keys=$(yq -o=json -I=0 '.permissions | keys' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse permissions in $WORKFLOW"
  PASS=false
fi
contents=""
if ! contents=$(yq '.permissions.contents' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse permissions.contents in $WORKFLOW"
  PASS=false
fi
if [[ "$perm_keys" != '["contents"]' ]]; then
  echo "FAIL: top-level 'permissions' must contain exactly 'contents' (found keys: $perm_keys) in $WORKFLOW"
  PASS=false
elif [[ "$contents" != "read" ]]; then
  echo "FAIL: top-level permission 'contents' must be 'read' (found: '$contents') in $WORKFLOW"
  PASS=false
else
  echo "PASS: top-level permissions grant exactly 'contents: read'"
fi

# The caller job must not carry its own `permissions:` block: a job-level grant
# overrides the top-level one and would widen the reusable's authority past the
# read-only scope while Check 4's top-level assertion still passed. The canonical
# stub sets no job-level permissions.
job_perms=""
if ! job_perms=$(yq ".jobs[\"${JOB}\"].permissions" "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse job permissions in $WORKFLOW"
  PASS=false
fi
if [[ "$job_perms" != "null" ]]; then
  echo "FAIL: job '$JOB' must not set its own 'permissions:' (found: '$job_perms') in $WORKFLOW"
  PASS=false
else
  echo "PASS: job '$JOB' sets no overriding job-level permissions"
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

# The trigger surface must be EXACTLY these three events — no additional events
# (e.g. workflow_dispatch, schedule) may be grafted on, since the `on:` surface
# is centrally owned. Adding an event is drift even though each required key
# above still exists.
on_keys=""
if ! on_keys=$(yq -o=json -I=0 '.on | keys | sort' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse triggers in $WORKFLOW"
  PASS=false
fi
if [[ "$on_keys" != '["merge_group","pull_request","push"]' ]]; then
  echo "FAIL: 'on:' must contain exactly pull_request, push, merge_group (found keys: $on_keys) in $WORKFLOW"
  PASS=false
else
  echo "PASS: 'on:' trigger surface is exactly pull_request, push, merge_group"
fi

# pull_request and push must carry ONLY a `branches` filter — extra filters such
# as `paths:` or `types:` narrow when the required check reports and are drift.
for trig in pull_request push; do
  trig_keys=""
  if ! trig_keys=$(yq -o=json -I=0 ".on.${trig} | keys" "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse '$trig' filters in $WORKFLOW"
    PASS=false
  fi
  if [[ "$trig_keys" != '["branches"]' ]]; then
    echo "FAIL: '$trig' trigger must carry only a 'branches' filter (found keys: $trig_keys) in $WORKFLOW"
    PASS=false
  else
    echo "PASS: '$trig' trigger carries only a 'branches' filter"
  fi
done

# pull_request must resolve to main being INCLUDED after ordered patterns apply
# (a raw 'main' entry that a later '!main' negates must not pass).
pr_branches=""
if ! pr_branches=$(yq -r '.on.pull_request.branches[]' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse pull_request branches in $WORKFLOW"
  PASS=false
fi
if branch_included main <<< "$pr_branches"; then
  echo "PASS: 'pull_request' trigger includes 'main'"
else
  echo "FAIL: 'pull_request' trigger must include the 'main' branch after ordered patterns apply in $WORKFLOW"
  PASS=false
fi

# push must resolve to main being INCLUDED after ordered patterns apply.
push_branches=""
if ! push_branches=$(yq -r '.on.push.branches[]' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse push branches in $WORKFLOW"
  PASS=false
fi
if branch_included main <<< "$push_branches"; then
  echo "PASS: 'push' trigger includes 'main'"
else
  echo "FAIL: 'push' trigger must include the 'main' branch after ordered patterns apply in $WORKFLOW"
  PASS=false
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
