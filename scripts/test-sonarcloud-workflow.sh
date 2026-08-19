#!/usr/bin/env bash
# Regression guard for sonarcloud.yml. Locks the flaky-scan resilience invariant
# whose loss inflates the Fleet Monitor failure rate (#439):
#
#   The SonarCloud analysis endpoint is occasionally flaky, so a single transient
#   blip must not fail the job. sonarcloud.yml mitigates this — per its own header
#   convention — by running the scan with `continue-on-error: true` and following
#   it with a retry step guarded on the first scan's `outcome == 'failure'`. If
#   that pair silently drifts away (someone deletes the retry, or drops
#   continue-on-error), every transient blip becomes a hard failure again and the
#   workflow degrades. This guard fails the build the moment that happens.
#
# It also asserts every third-party action stays SHA-pinned (never a mutable tag),
# matching the workflow's own "SHA-pin every third-party action" convention.
#
# Accepts an optional workflow path (default: .github/workflows/sonarcloud.yml) so
# the checks can be exercised against fixtures — see test-sonarcloud-workflow.test.sh.
# Run: bash scripts/test-sonarcloud-workflow.sh
set -euo pipefail

WORKFLOW="${1:-.github/workflows/sonarcloud.yml}"
SCAN_ACTION="SonarSource/sonarqube-scan-action"
PASS=true

echo "=== test-sonarcloud-workflow ==="

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

# ── Check 2: the primary scan runs with continue-on-error: true ────────────
# The primary scan is the SonarSource scan step marked continue-on-error so a
# transient endpoint blip is swallowed rather than failing the job outright.
if ! primary_ce=$(yq "
  [ .jobs[].steps[]
    | select((.uses // \"\") | test(\"^${SCAN_ACTION}@\"))
    | select(.[\"continue-on-error\"] == true) ] | length
" "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$primary_ce" -lt 1 ]]; then
  {
    echo "FAIL: no '${SCAN_ACTION}' scan step with 'continue-on-error: true' in $WORKFLOW"
    echo "      The first scan must be continue-on-error so a flaky endpoint blip"
    echo "      does not fail the job before the retry runs."
  } >&2
  PASS=false
else
  echo "PASS: primary scan step is 'continue-on-error: true' in $WORKFLOW"
fi

# ── Check 3: a retry scan step is guarded on the primary's failure ─────────
# The retry re-runs the scan only when the primary reported failure, expressed as
# `steps.<id>.outcome == 'failure'` in its `if:` condition — bound to the primary
# step's specific id so the guard fires reliably. This is what turns a single
# flaky blip into a self-healing run instead of a red build.
if [[ "$primary_ce" -ge 1 ]]; then
  if ! primary_id=$(yq "
    [.jobs[].steps[]
      | select((.uses // \"\") | test(\"^${SCAN_ACTION}@\"))
      | select(.[\"continue-on-error\"] == true)
      | .id // \"\"] | .[0]
  " "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML." >&2
    exit 1
  fi
  if [[ -z "$primary_id" || "$primary_id" == "null" ]]; then
    {
      echo "FAIL: the '${SCAN_ACTION}' step with 'continue-on-error: true' in $WORKFLOW has no 'id:'"
      echo "      Give the primary scan step an 'id:' so the retry step can reference"
      echo "        steps.<id>.outcome == 'failure'"
    } >&2
    PASS=false
  else
    if ! retry_guards=$(yq "
      [ .jobs[].steps[]
        | select((.uses // \"\") | test(\"^${SCAN_ACTION}@\"))
        | select((.[\"continue-on-error\"] // false) != true)
        | select((.if // \"\") | test(\"steps\\.${primary_id}\\.outcome *== *'failure'\")) ] | length
    " "$WORKFLOW" 2>/dev/null); then
      echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML." >&2
      exit 1
    fi
    if [[ "$retry_guards" -lt 1 ]]; then
      {
        echo "FAIL: no '${SCAN_ACTION}' retry step guarded on \"steps.${primary_id}.outcome == 'failure'\" in $WORKFLOW"
        echo "      Add a second scan step with:"
        echo "        if: ... && steps.${primary_id}.outcome == 'failure'"
        echo "      so a transient first-scan failure is retried instead of failing CI."
      } >&2
      PASS=false
    else
      echo "PASS: failure-guarded retry scan step present in $WORKFLOW"
    fi
  fi
fi

# ── Check 4: every third-party action is SHA-pinned ────────────────────────
# A mutable tag (e.g. @v8.2.1) lets an upstream change alter behavior without a
# commit here — a supply-chain and flakiness risk. Require a 40-hex commit SHA.
if ! mapfile -t uses < <(yq '.jobs[].steps[] | .uses // "" ' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
sha_regex='@[0-9a-f]{40}$'
unpinned=""
for ref in "${uses[@]}"; do
  [[ -z "$ref" || "$ref" == "null" ]] && continue
  if [[ ! "$ref" =~ $sha_regex ]]; then
    unpinned+="  - ${ref}"$'\n'
  fi
done
if [[ -n "$unpinned" ]]; then
  {
    echo "FAIL: unpinned action(s) in $WORKFLOW (SHA-pin every third-party action):"
    printf '%s' "$unpinned"
  } >&2
  PASS=false
else
  echo "PASS: all third-party actions are SHA-pinned in $WORKFLOW"
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
