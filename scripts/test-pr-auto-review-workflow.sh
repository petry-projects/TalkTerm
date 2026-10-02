#!/usr/bin/env bash
# Regression guard for pr-auto-review.yml. Locks the event-dependent concurrency
# contract of the thin caller stub (issues #1126, #508) so a future edit cannot
# silently change its deduplication or cancellation behaviour:
#
#   The stub fans out on check_suite / workflow_run / pull_request(_review). To
#   stay under GitHub Free's org-wide concurrency cap it collapses the
#   default-branch-context events (check_suite / workflow_run) onto one group per
#   PR *and commit* with cancel-in-progress: true, while pull_request events keep
#   a unique-per-run group that never cancels. Three invariants must hold before
#   cancellation is safe, and this guard fails the build the moment any drifts:
#
#     1. Same-commit deduplication  — the cancelable group is keyed on BOTH the PR
#        number and the event head_sha, so repeated events for the same commit
#        share one group (a superseding run cancels the stale one).
#     2. Cross-commit isolation     — because head_sha is part of the group, a
#        check completing for an older commit cannot cancel the readiness
#        evaluation still in flight for a newer commit (and vice-versa). A group
#        that omits head_sha (PR-number only) is the exact regression this guard
#        rejects.
#     3. No-PR / multi-PR unique fallback — an event with no associated PR, or one
#        that lists more than one PR, falls back to a run-unique group
#        (github.run_id) so unrelated PRs never collapse into one cancelable group.
#
#   It also asserts cancel-in-progress stays gated on the check_suite / workflow_run
#   events (never unconditional), so pull_request-head runs are never cancelled.
#
# Accepts an optional workflow path (default: .github/workflows/pr-auto-review.yml)
# so the checks can be exercised against fixtures — see
# test-pr-auto-review-workflow.test.sh.
# Run: bash scripts/test-pr-auto-review-workflow.sh
set -euo pipefail

WORKFLOW="${1:-.github/workflows/pr-auto-review.yml}"
PASS=true

echo "=== test-pr-auto-review-workflow ==="

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

# ── Check 2: a top-level concurrency.group is present ──────────────────────
group=""
if ! group=$(yq '.concurrency.group' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$group" == "null" || -z "$group" ]]; then
  {
    echo "FAIL: no top-level 'concurrency.group' block in $WORKFLOW"
    echo "      Add a commit-scoped group so check_suite / workflow_run events"
    echo "      dedupe per PR+commit and fall back to a run-unique group otherwise."
  } >&2
  PASS=false
else
  echo "PASS: top-level 'concurrency.group' is present in $WORKFLOW"
fi

# The remaining group-shape checks only make sense once a group exists.
if [[ "$group" != "null" && -n "$group" ]]; then
  # ── Check 3: same-commit dedup + cross-commit isolation (check_suite) ─────
  # The check_suite PR group must be keyed on BOTH the PR number and the event
  # head_sha. The PR number gives per-PR scoping; head_sha is what makes the
  # group commit-scoped, so distinct commits get distinct (isolated) slots while
  # same-commit events dedupe. A PR-number-only group is rejected here.
  if [[ "$group" == *'github.event.check_suite.pull_requests[0].number'* \
     && "$group" == *'github.event.check_suite.head_sha'* ]]; then
    echo "PASS: check_suite group is keyed on PR number AND head_sha in $WORKFLOW"
  else
    {
      echo "FAIL: check_suite concurrency group is not commit-scoped in $WORKFLOW"
      echo "      Key the group on BOTH github.event.check_suite.pull_requests[0].number"
      echo "      and github.event.check_suite.head_sha, e.g.:"
      echo "        format('pr-auto-review-ready-check-pr-{0}-{1}',"
      echo "               github.event.check_suite.pull_requests[0].number,"
      echo "               github.event.check_suite.head_sha)"
      echo "      Without head_sha, one PR-wide group covers every commit and a"
      echo "      completed check for an older commit can cancel a newer commit's run."
    } >&2
    PASS=false
  fi

  # ── Check 4: same-commit dedup + cross-commit isolation (workflow_run) ────
  if [[ "$group" == *'github.event.workflow_run.pull_requests[0].number'* \
     && "$group" == *'github.event.workflow_run.head_sha'* ]]; then
    echo "PASS: workflow_run group is keyed on PR number AND head_sha in $WORKFLOW"
  else
    {
      echo "FAIL: workflow_run concurrency group is not commit-scoped in $WORKFLOW"
      echo "      Key the group on BOTH github.event.workflow_run.pull_requests[0].number"
      echo "      and github.event.workflow_run.head_sha (see Check 3)."
    } >&2
    PASS=false
  fi

  # ── Check 5: multi-PR fallback ────────────────────────────────────────────
  # An event may list more than one PR. Selecting only pull_requests[0] would make
  # distinct PRs share the first PR's cancelable group, so the group must detect a
  # second entry (pull_requests[1]) for both event types and fall back to unique.
  if [[ "$group" == *'github.event.check_suite.pull_requests[1]'* \
     && "$group" == *'github.event.workflow_run.pull_requests[1]'* ]]; then
    echo "PASS: group falls back to run-unique when >1 PR is listed in $WORKFLOW"
  else
    {
      echo "FAIL: concurrency group does not guard against multiple listed PRs in $WORKFLOW"
      echo "      Detect a second PR (…pull_requests[1]) for both check_suite and"
      echo "      workflow_run and fall back to the run-unique group so distinct PRs"
      echo "      never share the first PR's cancelable group."
    } >&2
    PASS=false
  fi

  # ── Check 6: no-PR / multi-PR unique fallback keyed on github.run_id ──────
  if [[ "$group" == *'github.run_id'* ]]; then
    echo "PASS: group has a run-unique (github.run_id) fallback in $WORKFLOW"
  else
    {
      echo "FAIL: concurrency group has no run-unique (github.run_id) fallback in $WORKFLOW"
      echo "      An event with no PR (fork / no PR) or multiple PRs must fall back to"
      echo "      format('pr-auto-review-ready-check-unique-{0}', github.run_id) so"
      echo "      unrelated work never collapses into one cancelable group."
    } >&2
    PASS=false
  fi
fi

# ── Check 7: cancel-in-progress stays gated on check_suite / workflow_run ──
# Cancellation is only safe for the default-branch-context events (which do not
# attach to the PR head). It must NOT be unconditionally true, or a pull_request
# run on the PR head could be cancelled, leaving a cancelled check on the head.
cancel=""
if ! cancel=$(yq '.concurrency.cancel-in-progress' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$cancel" == *'check_suite'* && "$cancel" == *'workflow_run'* && "$cancel" == *'github.event_name'* ]]; then
  echo "PASS: cancel-in-progress is gated on check_suite / workflow_run in $WORKFLOW"
else
  {
    echo "FAIL: 'concurrency.cancel-in-progress' (found: '$cancel') is not gated on the"
    echo "      check_suite / workflow_run events in $WORKFLOW"
    echo "      Use an expression such as:"
    echo "        \${{ github.event_name == 'check_suite' || github.event_name == 'workflow_run' }}"
    echo "      so pull_request-head runs are never cancelled."
  } >&2
  PASS=false
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
