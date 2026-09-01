#!/usr/bin/env bash
# test-ci-workflow.test.sh — portable tests for the ci.yml regression guard
# (scripts/test-ci-workflow.sh). Verifies it both enforces the concurrency
# invariants (Fleet Monitor #380) and catches the yq checksum-extraction bug
# that degraded ci.yml in Fleet Monitor #430. No bats dependency: the guard is
# driven as a subprocess against temporary fixture workflows.
# Run: bash scripts/test-ci-workflow.test.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="${SCRIPT_DIR}/test-ci-workflow.sh"

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
# A valid header that satisfies the concurrency invariants (Checks 1-4) so that
# only the yq check (Check 5) differentiates the fixtures below.
write_header() {
  local file="$1"
  cat > "$file" <<'YAML'
name: CI
on:
  pull_request:
    branches: [main]
concurrency:
  group: ci-${{ github.ref }}-${{ github.sha }}
  cancel-in-progress: true
jobs:
  secret-scan:
    name: Secret scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo scan
YAML
}

# The buggy Install yq step that caused #430: the filename is matched with an
# end-anchor (never matches — it is the first column) and column 1 (the
# filename) is selected instead of the SHA-256 column.
append_buggy_yq() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -o /tmp/yq
          EXPECTED=$(curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" | grep "yq_linux_amd64$" | awk '{print $1}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
YAML
}

# The correct Install yq step: filename anchored at line start, SHA-256 column
# (19, per checksums_hashes_order) selected.
append_correct_yq() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -o /tmp/yq
          EXPECTED=$(curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" | grep "^yq_linux_amd64  " | awk '{print $19}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
YAML
}

# Buggy Install yq step followed by an unnamed step that contains $19 as a decoy.
# The guard must scope validation to the Install yq step only and reject the decoy.
append_buggy_yq_with_decoy() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -o /tmp/yq
          EXPECTED=$(curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" | grep "yq_linux_amd64$" | awk '{print $1}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
      - run: |
          # decoy: $19 lives in an unnamed step — must not rescue the buggy Install yq above
          echo "awk '{print $19}'"
YAML
}

# A second job that declares a positive-integer `timeout-minutes` and no curl.
# Appended after a valid header so ONLY the timeout invariant (Check 7) is at
# play: with it present on every job the guard accepts, without it the guard
# rejects.
append_job_with_timeout() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo guards
YAML
}

# A second job that declares NO `timeout-minutes`. Without a job timeout a
# stalled step runs to GitHub's 6-hour default before being killed and counted
# as a failure — the class of noise that inflates the Fleet Monitor failure rate
# (#470). ONLY the missing timeout differentiates this fixture (Check 7).
append_job_without_timeout() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    steps:
      - run: echo guards
YAML
}

# A second job that declares `timeout-minutes: "10"` (quoted string). GitHub
# Actions requires a bare YAML integer; a quoted value is a YAML type error
# that yq masks by stripping quotes, so the guard checks the YAML tag (#471).
append_job_with_quoted_timeout() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: "10"
    steps:
      - run: echo guards
YAML
}

# A second job that declares `timeout-minutes: 0`. Zero is not a valid job
# timeout (GitHub requires a positive integer) and must be rejected just like a
# missing value.
append_job_zero_timeout() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 0
    steps:
      - run: echo guards
YAML
}

# A job whose curl download omits --retry. A transient network blip would then
# fail CI deterministically and inflate the Fleet Monitor failure rate. The
# filename is anchored correctly and column 19 is selected so ONLY the missing
# --retry (Check 6) differentiates this fixture.
append_curl_without_retry() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -o /tmp/yq
          EXPECTED=$(curl -sSfL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" | grep "^yq_linux_amd64  " | awk '{print $19}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
YAML
}

# A job whose curl downloads all pass --retry, including one whose flags span a
# backslash line-continuation. The guard must fold the continuation and accept it.
append_curl_with_retry_multiline() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors \
            "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" \
            -o /tmp/yq
          EXPECTED=$(curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors \
            "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" \
            | grep "^yq_linux_amd64  " | awk '{print $19}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
YAML
}

# A step where a curl without --retry is chained (&&) with one that has it.
# A line-level check would miss the missing --retry because --retry appears
# elsewhere in the same line; the guard must split chained commands first.
append_curl_without_retry_chained() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Download tools
        run: |
          curl -sSfL "https://example.com/tool" -o /tmp/tool && curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors "https://example.com/checksums" -o /tmp/checksums
YAML
}

# Correct Install yq step followed by an unnamed step whose content would trip
# up an over-broad line-capture but must not cause a false failure.
append_correct_yq_with_unnamed_step() {
  local file="$1"
  cat >> "$file" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Install yq
        env:
          YQ_VERSION: v4.44.6
        run: |
          curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" -o /tmp/yq
          EXPECTED=$(curl -sSfL --retry 3 --retry-delay 2 --retry-all-errors "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/checksums" | grep "^yq_linux_amd64  " | awk '{print $19}')
          echo "${EXPECTED}  /tmp/yq" | sha256sum --check
      - run: |
          # unnamed step with suspicious content — guard must ignore it
          echo "grep 'yq_linux_amd64$' | awk '{print $1}'"
YAML
}

run_guard() {
  local file="$1"
  bash "$GUARD" "$file" >/dev/null 2>&1
}

# ── Case 1: buggy yq extraction is rejected (root cause of #430) ────────────
buggy="${TMP}/ci-buggy.yml"
write_header "$buggy"
append_buggy_yq "$buggy"
if run_guard "$buggy"; then
  fail "buggy yq extraction (yq_linux_amd64\$ / column 1) should be REJECTED"
else
  pass "buggy yq extraction is rejected"
fi

# ── Case 2: correct yq extraction is accepted ──────────────────────────────
good="${TMP}/ci-good.yml"
write_header "$good"
append_correct_yq "$good"
if run_guard "$good"; then
  pass "correct yq extraction (^yq_linux_amd64 / column 19) is accepted"
else
  fail "correct yq extraction should be ACCEPTED"
fi

# ── Case 3: no yq step present — check is skipped, guard still passes ───────
none="${TMP}/ci-none.yml"
write_header "$none"
if run_guard "$none"; then
  pass "workflow without an Install yq step passes (check skipped)"
else
  fail "workflow without an Install yq step should pass"
fi

# ── Case 4: concurrency invariant still enforced (regression for #380) ─────
noconc="${TMP}/ci-noconc.yml"
cat > "$noconc" <<'YAML'
name: CI
on:
  pull_request:
    branches: [main]
jobs:
  secret-scan:
    name: Secret scan
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - run: echo scan
YAML
if run_guard "$noconc"; then
  fail "workflow missing a concurrency block should be REJECTED"
else
  pass "workflow missing a concurrency block is rejected"
fi

# ── Case 5: decoy $19 in unnamed step must not rescue buggy Install yq ─────
decoy="${TMP}/ci-decoy.yml"
write_header "$decoy"
append_buggy_yq_with_decoy "$decoy"
if run_guard "$decoy"; then
  fail "buggy Install yq with decoy \$19 in unnamed step should be REJECTED"
else
  pass "decoy \$19 in unnamed step does not rescue buggy Install yq"
fi

# ── Case 6: correct Install yq with following unnamed step still passes ─────
correct_unnamed="${TMP}/ci-correct-unnamed.yml"
write_header "$correct_unnamed"
append_correct_yq_with_unnamed_step "$correct_unnamed"
if run_guard "$correct_unnamed"; then
  pass "correct Install yq with following unnamed step is accepted"
else
  fail "correct Install yq with following unnamed step should be ACCEPTED"
fi

# ── Case 7: a curl download without --retry is rejected (Check 6) ──────────
noretry="${TMP}/ci-noretry.yml"
write_header "$noretry"
append_curl_without_retry "$noretry"
if run_guard "$noretry"; then
  fail "curl download without --retry should be REJECTED"
else
  pass "curl download without --retry is rejected"
fi

# ── Case 8: curl downloads with --retry (incl. multi-line) are accepted ────
retry="${TMP}/ci-retry.yml"
write_header "$retry"
append_curl_with_retry_multiline "$retry"
if run_guard "$retry"; then
  pass "curl downloads with --retry (multi-line continuation) are accepted"
else
  fail "curl downloads with --retry should be ACCEPTED"
fi

# ── Case 9: curl without --retry chained (&&) with one that has it — rejected
chained="${TMP}/ci-chained.yml"
write_header "$chained"
append_curl_without_retry_chained "$chained"
if run_guard "$chained"; then
  fail "curl without --retry chained with one that has --retry should be REJECTED"
else
  pass "curl without --retry chained with one that has --retry is rejected"
fi

# ── Case 10: every job declaring timeout-minutes is accepted (Check 7) ──────
timeout_ok="${TMP}/ci-timeout-ok.yml"
write_header "$timeout_ok"
append_job_with_timeout "$timeout_ok"
if run_guard "$timeout_ok"; then
  pass "every job declaring timeout-minutes is accepted"
else
  fail "every job declaring timeout-minutes should be ACCEPTED"
fi

# ── Case 11: a job missing timeout-minutes is rejected (root cause of #470) ─
timeout_missing="${TMP}/ci-timeout-missing.yml"
write_header "$timeout_missing"
append_job_without_timeout "$timeout_missing"
if run_guard "$timeout_missing"; then
  fail "a job missing timeout-minutes should be REJECTED"
else
  pass "a job missing timeout-minutes is rejected"
fi

# ── Case 12: timeout-minutes: 0 (not a positive integer) is rejected ────────
timeout_zero="${TMP}/ci-timeout-zero.yml"
write_header "$timeout_zero"
append_job_zero_timeout "$timeout_zero"
if run_guard "$timeout_zero"; then
  fail "timeout-minutes: 0 should be REJECTED"
else
  pass "timeout-minutes: 0 is rejected"
fi

# ── Case 13: timeout-minutes: "10" (quoted string) is rejected ───────────────
timeout_quoted="${TMP}/ci-timeout-quoted.yml"
write_header "$timeout_quoted"
append_job_with_quoted_timeout "$timeout_quoted"
if run_guard "$timeout_quoted"; then
  fail 'timeout-minutes: "10" (quoted string) should be REJECTED'
else
  pass 'timeout-minutes: "10" (quoted string) is rejected'
fi

echo ""
if [[ "$fails" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
