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

# The correct pair: a continue-on-error primary scan (id: sonar), a backoff step
# guarded on that step's failure, then a retry guarded on the same. Both SHA-pinned.
append_good_scan() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# A continue-on-error primary scan and a failure-guarded retry, but NO backoff
# step between them: the retry fires immediately, so a transient endpoint blip
# lasting longer than a moment fails both attempts (the #447 regression).
append_scan_without_backoff() {
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

# The backoff step uses 'echo sleep' rather than executing sleep directly — the
# guard must reject this because 'sleep' is an argument to echo, not the command.
append_scan_backoff_not_executed() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: echo sleep
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# The backoff step uses 'sleep 0' rather than 'sleep 30' — the guard must
# reject this because an instant sleep provides no effective backoff delay.
append_scan_backoff_wrong_duration() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 0
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# The backoff appears AFTER the retry, where it does nothing to protect the
# retry — the guard must reject this ordering.
append_scan_backoff_after_retry() {
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
      - name: Back off (too late)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
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

# A continue-on-error primary scan (and a backoff) with NO retry: the first blip
# is swallowed and the analysis never runs — the resilience is only half present.
# The backoff keeps the only defect the missing retry, so this isolates Check 3.
append_scan_without_retry() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
YAML
}

# A retry condition that guards on an unrelated step's failure rather than the
# primary scan's id, so the retry does not reliably fire on a primary-scan blip.
# A valid backoff is present so the only defect is the wrong retry id (Check 3).
append_scan_wrong_retry_id() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.other.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
YAML
}

# Correct scan pair (with backoff) but the retry action is pinned to a mutable
# tag, not a SHA — so the ONLY defect is the unpinned action.
append_good_scan_unpinned_retry() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: SonarCloud Scan
        id: sonar
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarqube-scan-action@22918119ff8e1ca75a623e15c8296b6ea4fbe28f # v8.2.1
        continue-on-error: true
      - name: Back off before retry
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
      - name: SonarCloud Scan (retry)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        uses: SonarSource/sonarqube-scan-action@v8.2.1
YAML
}

# The backoff appears BEFORE the primary scan — GitHub Actions skips it because
# steps.sonar.outcome is not set yet, so the retry runs without a delay.
append_scan_backoff_before_primary() {
  local file="$1"
  cat >> "$file" <<'YAML'
      - name: Back off (too early)
        if: env.SONAR_TOKEN != '' && steps.sonar.outcome == 'failure'
        run: sleep 30
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

# ── Case 9: concurrency group with suffixed github.sha is rejected ──────────
# A literal string containing github.sha_suffix (not an expression reference)
# should be rejected because it's not a valid ${{ github.sha }} expression.
write_header_suffixed_sha() {
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
  group: ${{ github.workflow }}-${{ github.ref }}-{{ github.sha_suffix }}
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

suffixed="${TMP}/sonar-suffixed-sha.yml"
write_header_suffixed_sha "$suffixed"
append_good_scan "$suffixed"
if run_guard "$suffixed"; then
  fail "a concurrency group with github.sha_suffix (not github.sha) should be REJECTED"
else
  pass "a concurrency group with github.sha_suffix (not github.sha) is rejected"
fi

# ── Case 10: concurrency group with prefixed github.sha is rejected ────────
# A literal string like sonar-github.sha (not an expression reference) should
# be rejected because it's not a valid ${{ github.sha }} expression.
write_header_prefixed_sha() {
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
  group: ${{ github.workflow }}-${{ github.ref }}-sonar-github.sha
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

prefixed="${TMP}/sonar-prefixed-sha.yml"
write_header_prefixed_sha "$prefixed"
append_good_scan "$prefixed"
if run_guard "$prefixed"; then
  fail "a concurrency group with sonar-github.sha (not github.sha expression) should be REJECTED"
else
  pass "a concurrency group with sonar-github.sha (not github.sha expression) is rejected"
fi

# ── Case 11: a retry with no backoff step is rejected ──────────────────────
nobackoff="${TMP}/sonar-no-backoff.yml"
write_header "$nobackoff"
append_scan_without_backoff "$nobackoff"
if run_guard "$nobackoff"; then
  fail "a failure-guarded retry with no preceding backoff step should be REJECTED"
else
  pass "a failure-guarded retry with no preceding backoff step is rejected"
fi

# ── Case 12: a backoff step placed after the retry is rejected ─────────────
latebackoff="${TMP}/sonar-backoff-after-retry.yml"
write_header "$latebackoff"
append_scan_backoff_after_retry "$latebackoff"
if run_guard "$latebackoff"; then
  fail "a backoff step placed after the retry should be REJECTED"
else
  pass "a backoff step placed after the retry is rejected"
fi

# ── Case 13: backoff using 'echo sleep' (not executed) is rejected ──────────
notexec="${TMP}/sonar-backoff-not-executed.yml"
write_header "$notexec"
append_scan_backoff_not_executed "$notexec"
if run_guard "$notexec"; then
  fail "a backoff step using 'echo sleep' (not executed) should be REJECTED"
else
  pass "a backoff step using 'echo sleep' (not executed) is rejected"
fi

# ── Case 14: backoff with wrong duration ('sleep 0') is rejected ─────────────
wrongdur="${TMP}/sonar-backoff-wrong-duration.yml"
write_header "$wrongdur"
append_scan_backoff_wrong_duration "$wrongdur"
if run_guard "$wrongdur"; then
  fail "a backoff step using 'sleep 0' (wrong duration) should be REJECTED"
else
  pass "a backoff step using 'sleep 0' (wrong duration) is rejected"
fi

# ── Case 15: a backoff step placed before the primary scan is rejected ───────
earlybackoff="${TMP}/sonar-backoff-before-primary.yml"
write_header "$earlybackoff"
append_scan_backoff_before_primary "$earlybackoff"
if run_guard "$earlybackoff"; then
  fail "a backoff step placed before the primary scan should be REJECTED"
else
  pass "a backoff step placed before the primary scan is rejected"
fi

echo ""
if [[ "$fails" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
