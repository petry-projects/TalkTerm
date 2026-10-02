#!/usr/bin/env bash
# test-pr-auto-review-workflow.test.sh — portable tests for the pr-auto-review.yml
# regression guard (scripts/test-pr-auto-review-workflow.sh). Verifies the guard
# enforces the event-dependent concurrency contract of the thin caller stub
# (#1126, #508): the check_suite / workflow_run groups must be keyed on BOTH the
# PR number and the event head_sha (same-commit dedup + cross-commit isolation),
# an event listing more than one PR or no PR must fall back to a run-unique group
# (github.run_id), and cancel-in-progress must stay gated on those two events.
# No bats dependency: the guard is driven as a subprocess against temporary
# fixture workflows.
# Run: bash scripts/test-pr-auto-review-workflow.test.sh
set -euo pipefail

if ! SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; then
  echo "FAIL: Failed to determine script directory" >&2
  exit 1
fi
GUARD="${SCRIPT_DIR}/test-pr-auto-review-workflow.sh"

fails=0
pass() {
  local desc="$1"
  echo "ok   - $desc"
}
fail() {
  local desc="$1"
  echo "FAIL - $desc"
  fails=$((fails + 1))
}

# The guard uses yq to parse YAML (its Check 0). Without yq it exits early and
# these fixtures cannot be exercised, so skip cleanly rather than report noise.
if ! command -v yq >/dev/null 2>&1; then
  echo "SKIP: 'yq' not installed — cannot exercise the guard"
  exit 0
fi

if ! TMP="$(mktemp -d)"; then
  echo "FAIL: Failed to create temporary directory" >&2
  exit 1
fi
trap 'rm -rf "$TMP"' EXIT

# ── Fixture fragments ──────────────────────────────────────────────────────
# The invariant part shared by every fixture: name, triggers, permissions, and a
# minimal job. Each fixture supplies its own `concurrency:` block, which is what
# the guard inspects.
write_header() {
  local file="$1"
  cat > "$file" <<'YAML'
name: PR Auto-Review — Ready Check
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
  check_suite:
    types: [completed]
  pull_request_review:
    types: [submitted, dismissed]
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
permissions: {}
YAML
}

write_footer() {
  local file="$1"
  cat >> "$file" <<'YAML'
jobs:
  pr-auto-review:
    runs-on: ubuntu-latest
    steps:
      - run: 'true'
YAML
}

# The correct, commit-scoped concurrency block: check_suite / workflow_run groups
# keyed on PR number AND head_sha, a multi-PR guard (pull_requests[1]) and a
# run-unique (github.run_id) fallback, with cancel-in-progress gated on the two
# default-branch-context events.
append_good_concurrency() {
  local file="$1"
  cat >> "$file" <<'YAML'
concurrency:
  group: >-
    ${{
    (github.event_name == 'check_suite' && github.event.check_suite.pull_requests[0].number && !github.event.check_suite.pull_requests[1] && github.event.check_suite.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.check_suite.pull_requests[0].number, github.event.check_suite.head_sha)
    || (github.event_name == 'workflow_run' && github.event.workflow_run.pull_requests[0].number && !github.event.workflow_run.pull_requests[1] && github.event.workflow_run.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.workflow_run.pull_requests[0].number, github.event.workflow_run.head_sha)
    || format('pr-auto-review-ready-check-unique-{0}', github.run_id)
    }}
  cancel-in-progress: ${{ github.event_name == 'check_suite' || github.event_name == 'workflow_run' }}
YAML
}

# The pre-fix regression: groups keyed on PR number ONLY (no head_sha), so one
# PR-wide group covers every commit — a completed check for an older commit can
# cancel a newer commit's readiness evaluation (no cross-commit isolation).
append_concurrency_no_head_sha() {
  local file="$1"
  cat >> "$file" <<'YAML'
concurrency:
  group: >-
    ${{
    (github.event_name == 'check_suite' && github.event.check_suite.pull_requests[0].number)
    && format('pr-auto-review-ready-check-pr-{0}', github.event.check_suite.pull_requests[0].number)
    || (github.event_name == 'workflow_run' && github.event.workflow_run.pull_requests[0].number)
    && format('pr-auto-review-ready-check-pr-{0}', github.event.workflow_run.pull_requests[0].number)
    || format('pr-auto-review-ready-check-unique-{0}', github.run_id)
    }}
  cancel-in-progress: ${{ github.event_name == 'check_suite' || github.event_name == 'workflow_run' }}
YAML
}

# Commit-scoped but with NO multi-PR guard: selecting pull_requests[0] with no
# pull_requests[1] check means distinct PRs listed on one event share the first
# PR's cancelable group.
append_concurrency_no_multipr_guard() {
  local file="$1"
  cat >> "$file" <<'YAML'
concurrency:
  group: >-
    ${{
    (github.event_name == 'check_suite' && github.event.check_suite.pull_requests[0].number && github.event.check_suite.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.check_suite.pull_requests[0].number, github.event.check_suite.head_sha)
    || (github.event_name == 'workflow_run' && github.event.workflow_run.pull_requests[0].number && github.event.workflow_run.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.workflow_run.pull_requests[0].number, github.event.workflow_run.head_sha)
    || format('pr-auto-review-ready-check-unique-{0}', github.run_id)
    }}
  cancel-in-progress: ${{ github.event_name == 'check_suite' || github.event_name == 'workflow_run' }}
YAML
}

# Commit-scoped and multi-PR-guarded but with NO run-unique fallback: a no-PR
# event (fork / no PR) or a multi-PR event has no distinct slot to fall back to.
append_concurrency_no_run_id_fallback() {
  local file="$1"
  cat >> "$file" <<'YAML'
concurrency:
  group: >-
    ${{
    (github.event_name == 'check_suite' && github.event.check_suite.pull_requests[0].number && !github.event.check_suite.pull_requests[1] && github.event.check_suite.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.check_suite.pull_requests[0].number, github.event.check_suite.head_sha)
    || (github.event_name == 'workflow_run' && github.event.workflow_run.pull_requests[0].number && !github.event.workflow_run.pull_requests[1] && github.event.workflow_run.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.workflow_run.pull_requests[0].number, github.event.workflow_run.head_sha)
    || 'pr-auto-review-ready-check-shared'
    }}
  cancel-in-progress: ${{ github.event_name == 'check_suite' || github.event_name == 'workflow_run' }}
YAML
}

# A commit-scoped group but cancel-in-progress: true unconditionally, so a
# pull_request run on the PR head could be cancelled, leaving a cancelled
# `pr-auto-review / check-and-dispatch` check on the head.
append_concurrency_unconditional_cancel() {
  local file="$1"
  cat >> "$file" <<'YAML'
concurrency:
  group: >-
    ${{
    (github.event_name == 'check_suite' && github.event.check_suite.pull_requests[0].number && !github.event.check_suite.pull_requests[1] && github.event.check_suite.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.check_suite.pull_requests[0].number, github.event.check_suite.head_sha)
    || (github.event_name == 'workflow_run' && github.event.workflow_run.pull_requests[0].number && !github.event.workflow_run.pull_requests[1] && github.event.workflow_run.head_sha)
    && format('pr-auto-review-ready-check-pr-{0}-{1}', github.event.workflow_run.pull_requests[0].number, github.event.workflow_run.head_sha)
    || format('pr-auto-review-ready-check-unique-{0}', github.run_id)
    }}
  cancel-in-progress: true
YAML
}

# No concurrency block at all.
append_no_concurrency() {
  : # nothing — the fixture has only header + footer
}

run_guard() {
  local file="$1"
  bash "$GUARD" "$file" >/dev/null 2>&1
}

# ── Case 1: the real workflow is accepted ──────────────────────────────────
real="${SCRIPT_DIR}/../.github/workflows/pr-auto-review.yml"
if run_guard "$real"; then
  pass "the checked-in .github/workflows/pr-auto-review.yml is accepted"
else
  fail "the checked-in .github/workflows/pr-auto-review.yml should be ACCEPTED"
fi

# ── Case 2: a valid synthesized workflow is accepted ───────────────────────
good="${TMP}/par-good.yml"
write_header "$good"
append_good_concurrency "$good"
write_footer "$good"
if run_guard "$good"; then
  pass "commit-scoped group with multi-PR + run-unique fallback is accepted"
else
  fail "a valid commit-scoped concurrency block should be ACCEPTED"
fi

# ── Case 3: PR-number-only group (no head_sha) is rejected ─────────────────
nosha="${TMP}/par-no-head-sha.yml"
write_header "$nosha"
append_concurrency_no_head_sha "$nosha"
write_footer "$nosha"
if run_guard "$nosha"; then
  fail "a PR-number-only group (no head_sha, no cross-commit isolation) should be REJECTED"
else
  pass "a PR-number-only group (no head_sha) is rejected"
fi

# ── Case 4: missing multi-PR fallback guard is rejected ────────────────────
nomulti="${TMP}/par-no-multipr.yml"
write_header "$nomulti"
append_concurrency_no_multipr_guard "$nomulti"
write_footer "$nomulti"
if run_guard "$nomulti"; then
  fail "a group with no multi-PR (pull_requests[1]) fallback should be REJECTED"
else
  pass "a group with no multi-PR (pull_requests[1]) fallback is rejected"
fi

# ── Case 5: missing run-unique (github.run_id) fallback is rejected ────────
norunid="${TMP}/par-no-run-id.yml"
write_header "$norunid"
append_concurrency_no_run_id_fallback "$norunid"
write_footer "$norunid"
if run_guard "$norunid"; then
  fail "a group with no run-unique (github.run_id) fallback should be REJECTED"
else
  pass "a group with no run-unique (github.run_id) fallback is rejected"
fi

# ── Case 6: unconditional cancel-in-progress is rejected ───────────────────
uncond="${TMP}/par-unconditional-cancel.yml"
write_header "$uncond"
append_concurrency_unconditional_cancel "$uncond"
write_footer "$uncond"
if run_guard "$uncond"; then
  fail "unconditional cancel-in-progress: true should be REJECTED"
else
  pass "unconditional cancel-in-progress: true is rejected"
fi

# ── Case 7: no concurrency block at all is rejected ────────────────────────
noconc="${TMP}/par-no-concurrency.yml"
write_header "$noconc"
append_no_concurrency "$noconc"
write_footer "$noconc"
if run_guard "$noconc"; then
  fail "a workflow with no concurrency block should be REJECTED"
else
  pass "a workflow with no concurrency block is rejected"
fi

# ── Case 8: a missing workflow file fails cleanly ──────────────────────────
if run_guard "${TMP}/does-not-exist.yml"; then
  fail "a missing workflow file should be REJECTED"
else
  pass "a missing workflow file is rejected"
fi

echo ""
if [[ "$fails" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
