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
  # NOSONAR(shelldre:S7677): false positive — this is a success ("PASS: ...")
  # message that correctly goes to stdout, like every other PASS line here. It is
  # only flagged because it sits in the else-branch of a check whose then-branch
  # does error handling; redirecting it to stderr would be semantically wrong.
  echo "PASS: primary scan step is 'continue-on-error: true' in $WORKFLOW" # NOSONAR(shelldre:S7677)
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

# ── Check 5: the concurrency group is scoped to the commit SHA ─────────────
# Root cause of the Fleet Monitor warning (#445): a per-ref concurrency group
# with cancel-in-progress: true cancels an in-progress run for an earlier commit
# the moment a newer commit lands on the same ref, so quick-succession pushes
# leave earlier commits cancelled — inflating the workflow's instability metric.
# ci.yml already fixed this (Fleet Monitor #380) by including github.sha in the
# group, giving each commit its own slot. This check locks the same invariant
# here: the group must be keyed on github.sha and cancel-in-progress must be true
# (safe unconditionally once the group is SHA-scoped — it then only affects
# duplicate runs of the same ref + SHA).
group_sha_regex='\$\{\{[^}]*github\.sha[^}]*\}\}'
group=""
if ! group=$(yq '.concurrency.group' "$WORKFLOW" 2>/dev/null); then
  echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
  exit 1
fi
if [[ "$group" == "null" || -z "$group" ]]; then
  {
    echo "FAIL: no top-level 'concurrency.group' block in $WORKFLOW"
    echo "      Add a SHA-scoped group so quick-succession commits do not cancel each other."
  } >&2
  PASS=false
elif [[ ! "$group" =~ $group_sha_regex ]]; then
  {
    echo "FAIL: concurrency group ($group) is not scoped to github.sha in $WORKFLOW"
    echo "      A per-ref group with cancel-in-progress cancels in-progress runs for"
    echo "      earlier commits (Fleet Monitor #445). Include github.sha so each commit"
    echo "      gets its own slot, e.g.:"
    echo "        group: \${{ github.workflow }}-\${{ github.ref }}-\${{ github.sha }}"
  } >&2
  PASS=false
else
  echo "PASS: concurrency group is scoped to github.sha in $WORKFLOW"
  cancel=""
  if ! cancel=$(yq '.concurrency.cancel-in-progress' "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML."
    exit 1
  fi
  if [[ "$cancel" != "true" ]]; then
    {
      echo "FAIL: 'concurrency.cancel-in-progress' (found: '$cancel') must be 'true' in $WORKFLOW"
    } >&2
    PASS=false
  else
    echo "PASS: 'concurrency.cancel-in-progress' is unconditionally true in $WORKFLOW"
  fi
fi

# ── Check 6: a backoff delay precedes the retry ────────────────────────────
# Root cause of the residual Fleet Monitor failure rate (#447): the retry fires
# immediately after the primary scan, so a transient endpoint blip lasting more
# than a second or two fails both the primary and the back-to-back retry and the
# job goes red. A short backoff between the two attempts gives the endpoint time
# to recover, turning most double-blips into a self-healing run. Require a step
# that runs `sleep`, is guarded on the primary scan's `outcome == 'failure'` (so
# it only costs wall-clock on the rare retry path), and appears before the retry.
if [[ "$primary_ce" -ge 1 && -n "$primary_id" && "$primary_id" != "null" ]]; then
  guard_re="steps\\.${primary_id}\\.outcome *== *'failure'"
  # Emit one boolean per step (in order) for "is a failure-guarded backoff sleep"
  # and "is the failure-guarded scan retry", then find each one's first position
  # in bash. mikefarah yq has no if/then/else, so ordering is checked here rather
  # than in the query. A backoff is a step that runs `sleep` and is guarded on the
  # primary scan's failure; the retry is the scan re-run guarded on the same.
  # Wrapping each step in a single-element array and chaining `select` filters
  # (rather than `and`-ing piped predicates) sidesteps a mikefarah yq quirk where
  # `((x)|test) and ((y)|test)` collapses to false; `map(select…)|length > 0`
  # evaluates each condition against the same node and yields the right boolean.
  if ! mapfile -t is_backoff < <(yq "
    .jobs[].steps[] | [.]
    | (map(
        select((.run // \"\") | test(\"(^|\\n)[[:space:]]*sleep[[:space:]]+30([[:space:]]|\$)\"))
        | select((.if // \"\") | test(\"${guard_re}\"))
      ) | length) > 0
  " "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML." >&2
    exit 1
  fi
  if ! mapfile -t is_retry < <(yq "
    .jobs[].steps[] | [.]
    | (map(
        select((.uses // \"\") | test(\"^${SCAN_ACTION}@\"))
        | select((.[\"continue-on-error\"] // false) != true)
        | select((.if // \"\") | test(\"${guard_re}\"))
      ) | length) > 0
  " "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML." >&2
    exit 1
  fi
  if ! mapfile -t is_primary < <(yq "
    .jobs[].steps[] | [.]
    | (map(
        select((.uses // \"\") | test(\"^${SCAN_ACTION}@\"))
        | select(.[\"continue-on-error\"] == true)
      ) | length) > 0
  " "$WORKFLOW" 2>/dev/null); then
    echo "FAIL: yq failed to parse $WORKFLOW. Please check if it is valid YAML." >&2
    exit 1
  fi
  primary_pos=-1
  backoff_pos=-1
  retry_pos=-1
  for i in "${!is_backoff[@]}"; do
    if [[ "${is_primary[$i]:-false}" == "true" && "$primary_pos" -lt 0 ]]; then
      primary_pos="$i"
    fi
    if [[ "${is_backoff[$i]}" == "true" && "$backoff_pos" -lt 0 ]]; then
      backoff_pos="$i"
    fi
    if [[ "${is_retry[$i]:-false}" == "true" && "$retry_pos" -lt 0 ]]; then
      retry_pos="$i"
    fi
  done
  if [[ "$backoff_pos" -lt 0 ]]; then
    {
      echo "FAIL: no backoff step (run: sleep 30) guarded on \"steps.${primary_id}.outcome == 'failure'\" in $WORKFLOW"
      echo "      Add a step between the primary scan and the retry, e.g.:"
      echo "        - name: Back off before retry"
      echo "          if: ... && steps.${primary_id}.outcome == 'failure'"
      echo "          run: sleep 30"
      echo "      so a transient endpoint blip has time to clear before the retry runs."
    } >&2
    PASS=false
  elif [[ "$primary_pos" -ge 0 && "$backoff_pos" -le "$primary_pos" ]]; then
    {
      echo "FAIL: the backoff (run: sleep 30) step must appear after the primary scan step in $WORKFLOW"
      echo "      A backoff before the primary scan is skipped by GitHub Actions"
      echo "      (steps.${primary_id}.outcome is not available yet) — move the sleep"
      echo "      to between the primary scan and the retry."
    } >&2
    PASS=false
  elif [[ "$retry_pos" -ge 0 && "$backoff_pos" -gt "$retry_pos" ]]; then
    {
      echo "FAIL: the backoff (run: sleep 30) step must appear before the retry step in $WORKFLOW"
      echo "      A backoff after the retry does nothing — move the sleep between the"
      echo "      primary scan and the retry."
    } >&2
    PASS=false
  else
    echo "PASS: backoff delay precedes the failure-guarded retry in $WORKFLOW"
  fi
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
