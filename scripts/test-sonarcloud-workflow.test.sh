#!/usr/bin/env bash
# test-sonarcloud-workflow.test.sh — portable tests for the sonarcloud.yml
# regression guard (scripts/test-sonarcloud-workflow.sh). Verifies the guard
# enforces the flaky-scan resilience invariants that keep the SonarCloud
# workflow's Fleet Monitor failure rate low (#439): the primary scan step must
# be `continue-on-error: true` and be followed by a retry step guarded on that
# step's `outcome == 'failure'`, and every third-party action must be SHA-pinned.
# No bats dependency: the guard is driven as a subprocess against temporary
# fixture workflows.
# Run: bash scripts/test-sonarcloud-workflow.test.sh
set -euo pipefail

if ! SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; then
  echo "FAIL: Failed to determine script directory" >&2
  exit 1
fi
GUARD="${SCRIPT_DIR}/test-sonarcloud-workflow.sh"

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
# A valid header shared by every fixture: top-level permissions, SHA-scoped
# concurrency (Fleet Monitor #445 — each commit gets its own slot so
# quick-succession pushes do not cancel each other), and a checkout with
# fetch-depth: 0 (SHA-pinned).
write_header() {
  local file="$1"
  cat > "$file" <<'YAML'
name: SonarCloud Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions: {}
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ github.sha }}
  cancel-in-progress: true
jobs:
  sonarcloud:
    name: SonarCloud
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
YAML
}

# A header whose concurrency group is keyed only on github.ref (no github.sha):
# a newer commit on the same ref cancels an in-progress run for an earlier
# commit — the exact cancelled-run flakiness this guard now prevents (#445).
write_header_per_ref() {
  local file="$1"
  cat > "$file" <<'YAML'
name: SonarCloud Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
permissions: {}
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  sonarcloud:
    name: SonarCloud
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
    env:
      SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
        with:
          fetch-depth: 0
YAML
}

# The correct pair: a continue-on-error primary scan (id: sonar) followed by a
# retry guarded on that step's outcome == 'failure'. Both SHA-pinned.
append_good_scan() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# A single scan step that is NOT continue-on-error: a transient endpoint blip
# fails the job outright (the exact regression this guard prevents).
append_scan_without_continue_on_error() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# A continue-on-error primary scan with NO retry: the first blip is swallowed and
# the analysis never runs — the resilience is only half present.
append_scan_without_retry() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
YAML
}

# A retry condition that guards on an unrelated step's failure rather than the
# primary scan's id, so the retry does not reliably fire on a primary-scan blip.
append_scan_wrong_retry_id() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.other.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# Correct scan pair but the retry action is pinned to a mutable tag, not a SHA.
append_good_scan_unpinned_retry() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@v8.2.1
YAML
}

run_guard() {
  local file="$1"
  bash "$GUARD" "$file" >/dev/null 2>&1
}

# ── Case 1: the real workflow is accepted ──────────────────────────────────
real="${SCRIPT_DIR}/../.github/workflows/sonarcloud.yml"
if run_guard "$real"; then
  pass "the checked-in .github/workflows/sonarcloud.yml is accepted"
else
  fail "the checked-in .github/workflows/sonarcloud.yml should be ACCEPTED"
fi

# ── Case 2: a valid synthesized workflow is accepted ───────────────────────
good="${TMP}/sonar-good.yml"
write_header "$good"
append_good_scan "$good"
if run_guard "$good"; then
  pass "continue-on-error primary scan + failure-guarded retry is accepted"
else
  fail "a valid continue-on-error + retry workflow should be ACCEPTED"
fi

# ── Case 3: scan missing continue-on-error is rejected ─────────────────────
noce="${TMP}/sonar-no-continue.yml"
write_header "$noce"
append_scan_without_continue_on_error "$noce"
if run_guard "$noce"; then
  fail "scan step without continue-on-error should be REJECTED"
else
  pass "scan step without continue-on-error is rejected"
fi

# ── Case 4: missing failure-guarded retry is rejected ──────────────────────
noretry="${TMP}/sonar-no-retry.yml"
write_header "$noretry"
append_scan_without_retry "$noretry"
if run_guard "$noretry"; then
  fail "workflow without a failure-guarded retry step should be REJECTED"
else
  pass "workflow without a failure-guarded retry step is rejected"
fi

# ── Case 5: an unpinned (tag) action is rejected ───────────────────────────
unpinned="${TMP}/sonar-unpinned.yml"
write_header "$unpinned"
append_good_scan_unpinned_retry "$unpinned"
if run_guard "$unpinned"; then
  fail "workflow with a tag-pinned action should be REJECTED"
else
  pass "workflow with a tag-pinned action is rejected"
fi

# ── Case 6: a missing workflow file fails cleanly ──────────────────────────
if run_guard "${TMP}/does-not-exist.yml"; then
  fail "a missing workflow file should be REJECTED"
else
  pass "a missing workflow file is rejected"
fi

# ── Case 7: retry condition referencing an unrelated step ID is rejected ────
wrongid="${TMP}/sonar-wrong-retry-id.yml"
write_header "$wrongid"
append_scan_wrong_retry_id "$wrongid"
if run_guard "$wrongid"; then
  fail "retry condition referencing an unrelated step ID should be REJECTED"
else
  pass "retry condition referencing an unrelated step ID is rejected"
fi

# ── Case 8: a per-ref-only concurrency group is rejected ───────────────────
perref="${TMP}/sonar-per-ref.yml"
write_header_per_ref "$perref"
append_good_scan "$perref"
if run_guard "$perref"; then
  fail "a per-ref-only concurrency group (no github.sha) should be REJECTED"
else
  pass "a per-ref-only concurrency group (no github.sha) is rejected"
fi

echo ""
if [[ "$fails" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
