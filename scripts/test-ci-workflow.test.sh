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
pass() { echo "ok   - $1"; }
fail() {
  echo "FAIL - $1"
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
  cat > "$1" <<'YAML'
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
    steps:
      - run: echo scan
YAML
}

# The buggy Install yq step that caused #430: the filename is matched with an
# end-anchor (never matches — it is the first column) and column 1 (the
# filename) is selected instead of the SHA-256 column.
append_buggy_yq() {
  cat >> "$1" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
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
  cat >> "$1" <<'YAML'
  workflow-tests:
    name: Workflow regression guards
    runs-on: ubuntu-latest
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

run_guard() { bash "$GUARD" "$1" >/dev/null 2>&1; }

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
    steps:
      - run: echo scan
YAML
if run_guard "$noconc"; then
  fail "workflow missing a concurrency block should be REJECTED"
else
  pass "workflow missing a concurrency block is rejected"
fi

echo ""
if [[ "$fails" -eq 0 ]]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
