#!/usr/bin/env bash
# Regression guard for ci.yml. Locks two durable invariants whose loss inflates
# the Fleet Monitor failure rate:
#
#   1. (#380) ci.yml serializes redundant runs per Git ref via a top-level
#      `concurrency:` block. Without one, a bot pushing several commits to a PR
#      branch in quick succession fans out redundant runs that pile up as
#      `action_required`. Mirrors every sibling caller (pr-review.yml,
#      ci-failure-analyst.yml, add-to-project.yml, ...).
#   2. (#430) any `Install yq` step extracts the SHA-256 from the mikefarah/yq
#      `checksums` release asset correctly (filename anchored at line start,
#      column 19). The buggy end-anchored / column-1 extraction produced an empty
#      checksum and a deterministic `sha256sum: no properly formatted checksum
#      lines found` failure that degraded CI. See Check 5.
#
# Accepts an optional workflow path (default: .github/workflows/ci.yml) so the
# checks can be exercised against fixtures — see test-ci-workflow.test.sh.
# Run: bash scripts/test-ci-workflow.sh
set -euo pipefail

WORKFLOW="${1:-.github/workflows/ci.yml}"
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

# ── Check 4: cancel-in-progress is unconditionally true ───────────────────
# With a SHA-scoped concurrency group each commit gets its own slot, so runs for
# different commits never compete. cancel-in-progress: true only affects duplicate
# runs within the same slot (same ref + SHA), making it safe to set unconditionally.
if ! cancel=$(yq '.concurrency.cancel-in-progress' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$cancel" == "null" || -z "$cancel" ]]; then
  echo "FAIL: 'concurrency.cancel-in-progress' is missing in $WORKFLOW"
  PASS=false
elif [[ "$cancel" != "true" ]]; then
  echo "FAIL: 'concurrency.cancel-in-progress' (found: '$cancel') must be 'true' in $WORKFLOW"
  PASS=false
else
  echo "PASS: 'concurrency.cancel-in-progress' is unconditionally true in $WORKFLOW"
fi

# ── Check 5: any `Install yq` step extracts the SHA-256 correctly ──────────
# Root cause of Fleet Monitor #430: ci.yml's `workflow-tests` job installs yq by
# downloading the mikefarah/yq `checksums` release asset and comparing it to the
# binary. That file is a *multi-hash table* — the asset filename is the FIRST
# column and SHA-256 is column 19 (see the release's `checksums_hashes_order`).
# The step that degraded CI matched the filename with an end-anchor
# (`grep "yq_linux_amd64$"`, which never matches — the name is at line start) and
# selected column 1 (the filename) via `awk '{print $1}'`. Either mistake yields
# an empty checksum and a deterministic `sha256sum: no properly formatted
# checksum lines found` failure. This check locks the correct extraction so the
# drift cannot return. It is a no-op when no `Install yq` step is present.
if ! yq_run=$(yq '.jobs[].steps[] | select(.name == "Install yq") | .run' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi

if [[ -z "$yq_run" || "$yq_run" == "null" ]]; then
  echo "PASS: no 'Install yq' step in $WORKFLOW — yq checksum check not applicable"
else
  # The filename must be anchored at line start; an end-anchor never matches the
  # `checksums` table (the filename is column 1), leaving the checksum empty.
  if grep -Fq 'yq_linux_amd64$' <<< "$yq_run"; then
    echo "FAIL: 'Install yq' matches the checksum line with an end-anchor"
    echo "      ('yq_linux_amd64\$'). The filename is column 1 — anchor at line"
    echo "      start ('^yq_linux_amd64  ') so the match succeeds."
    PASS=false
  # Column 1 is the filename, not a hash; selecting it yields an empty checksum.
  elif grep -Fq "awk '{print \$1}'" <<< "$yq_run"; then
    echo "FAIL: 'Install yq' extracts checksum column 1 (the filename) via"
    echo "      awk '{print \$1}'. SHA-256 is column 19 in the mikefarah/yq"
    echo "      checksums table — use awk '{print \$19}'."
    PASS=false
  # SHA-256 lives in column 19 (per checksums_hashes_order); require it explicitly.
  elif ! grep -Fq "\$19" <<< "$yq_run"; then
    echo "FAIL: 'Install yq' does not select checksum column 19 (SHA-256) in"
    echo "      $WORKFLOW. The mikefarah/yq checksums file lists SHA-256 as"
    echo "      column 19 — use awk '{print \$19}'."
    PASS=false
  else
    echo "PASS: 'Install yq' extracts the SHA-256 (column 19) in $WORKFLOW"
  fi
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
