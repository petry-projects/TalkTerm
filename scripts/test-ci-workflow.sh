#!/usr/bin/env bash
# Regression guard for ci.yml. Locks durable invariants whose loss inflates the
# Fleet Monitor failure rate:
#
#   1. (#380) ci.yml serializes redundant runs per Git ref via a top-level
#      `concurrency:` block. Without one, a bot pushing several commits to a PR
#      branch in quick succession fans out redundant runs that pile up as
#      `action_required`. Mirrors every sibling caller (pr-review.yml,
#      ci-failure-analyst.yml, add-to-project.yml, ...). See Checks 2-4.
#   2. (#430) any `Install yq` step extracts the SHA-256 from the mikefarah/yq
#      `checksums` release asset correctly (filename anchored at line start,
#      column 19). The buggy end-anchored / column-1 extraction produced an empty
#      checksum and a deterministic `sha256sum: no properly formatted checksum
#      lines found` failure that degraded CI. See Check 5.
#   3. (#438) every `curl` download retries on transient network failures
#      (`--retry`), so a DNS/connection blip is absorbed rather than failing CI
#      deterministically. See Check 6.
#   4. (#470) every job declares a positive-integer `timeout-minutes`, so a
#      stalled step fails fast instead of inheriting GitHub's 6-hour default and
#      landing as a timeout failure. See Check 7.
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

# ── Check 6: every `curl` download retries on transient network failures ───
# A curl without --retry turns a transient network blip (DNS hiccup, connection
# reset, 429/5xx from the release host) into a hard, deterministic-looking CI
# failure — exactly the class of noise that inflates the Fleet Monitor failure
# rate (#438). Require every curl invocation to pass --retry so such blips are
# absorbed. Backslash line-continuations are folded first so a curl whose flags
# span multiple lines is evaluated as a single logical command. No-op when the
# workflow contains no curl.
runs=""
if ! runs=$(yq '.jobs[].steps[].run' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi

# Fold "\<newline>" continuations into one line so multi-line curls are whole.
folded=""
if ! folded=$(printf '%s\n' "$runs" | sed -e ':a' -e '/\\$/{N;s/\\\n/ /;ba}'); then
  echo "FAIL: failed to fold multi-line commands."
  exit 1
fi

# Split chained commands (&&, ||, ;, |) so a curl missing --retry is not
# masked by another command on the same line that has --retry.
split_commands=""
if ! split_commands=$(awk '{gsub(/&&|\|\||;|\|/, "\n"); print}' <<< "$folded"); then
  echo "FAIL: failed to split chained commands."
  exit 1
fi

curl_missing_retry=false
while IFS= read -r line; do
  # Match `curl` only as a command word (line start or after a non-name char
  # such as the `$(` of a command substitution), not as a substring.
  if grep -Eq '(^|[^[:alnum:]_-])curl([[:space:]]|$)' <<< "$line" \
    && ! grep -Fq -- '--retry' <<< "$line"; then
    curl_missing_retry=true
  fi
done <<< "$split_commands"

if [[ "$curl_missing_retry" == "true" ]]; then
  echo "FAIL: a 'curl' download in $WORKFLOW has no '--retry' flag. A transient"
  echo "      network failure would then fail CI deterministically and inflate"
  echo "      the Fleet Monitor failure rate. Add e.g."
  echo "      '--retry 3 --retry-delay 2 --retry-all-errors' to every curl."
  PASS=false
else
  echo "PASS: every 'curl' download retries on transient failures in $WORKFLOW"
fi

# ── Check 7: every job declares a positive-integer `timeout-minutes` ───────
# Root cause class for Fleet Monitor #470: a job without `timeout-minutes`
# inherits GitHub's 6-hour default. A step that *stalls* rather than errors — a
# curl that connects then hangs (which --retry does not cover), or any wedged
# process — then runs for hours before being killed and counted as a timeout
# failure, inflating the Fleet Monitor failure rate and burning runner minutes.
# p95 for this workflow is ~150s, so a bounded per-job timeout turns a hang into
# a fast, obvious failure instead of a 6-hour one. Mirrors the timeout-minutes
# convention already used by sonarcloud.yml, copilot-setup-steps.yml,
# initiative-driver.yml and feature-ideation.yml.
if ! job_names=$(yq '.jobs | keys | .[]' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi

while IFS= read -r job; do
  [[ -z "$job" ]] && continue
  if ! timeout=$(J="$job" yq '.jobs[env(J)]["timeout-minutes"]' "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to read timeout-minutes for job '$job' in $WORKFLOW."
    exit 1
  fi
  if [[ "$timeout" == "null" || -z "$timeout" ]]; then
    echo "FAIL: job '$job' in $WORKFLOW declares no 'timeout-minutes'. Without one"
    echo "      it inherits GitHub's 6-hour default, so a stalled step runs for"
    echo "      hours and lands as a timeout failure. Add e.g. 'timeout-minutes: 10'."
    PASS=false
  elif [[ ! "$timeout" =~ ^[0-9]+$ || "$timeout" -le 0 ]]; then
    echo "FAIL: job '$job' in $WORKFLOW has an invalid 'timeout-minutes'"
    echo "      (found: '$timeout'). It must be a positive integer."
    PASS=false
  else
    echo "PASS: job '$job' declares timeout-minutes ($timeout) in $WORKFLOW"
  fi
done <<< "$job_names"

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
