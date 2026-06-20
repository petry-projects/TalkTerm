#!/usr/bin/env bash
# apply-repo-settings.test.sh — portable unit tests for the pure helpers in
# apply-repo-settings.sh. No bats dependency: sourcing the script must not run
# its main body (guarded by the BASH_SOURCE check), so the helpers can be tested
# in isolation. Run: bash scripts/apply-repo-settings.test.sh
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Sourcing must not execute main; if it errors the whole test run aborts here.
# shellcheck source=scripts/apply-repo-settings.sh
source "${SCRIPT_DIR}/apply-repo-settings.sh"

fails=0
pass() { echo "ok   - $1"; }
fail() { echo "FAIL - $1"; fails=$((fails + 1)); }

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    pass "$desc"
  else
    fail "$desc (expected '$expected', got '$actual')"
  fi
}

# ── auto_trigger_status ───────────────────────────────────────────────────────
prefs_true='{"preferences":{"auto_trigger_checks":[{"app_id":1236702,"setting":true},{"app_id":347564,"setting":false}]}}'
prefs_missing='{"preferences":{"auto_trigger_checks":[{"app_id":999,"setting":true}]}}'
prefs_empty='{"preferences":{"auto_trigger_checks":[]}}'

assert_eq "auto_trigger_status: enabled app -> true" \
  "true" "$(auto_trigger_status "$prefs_true" 1236702)"
assert_eq "auto_trigger_status: disabled app -> false" \
  "false" "$(auto_trigger_status "$prefs_true" 347564)"
assert_eq "auto_trigger_status: app absent -> missing" \
  "missing" "$(auto_trigger_status "$prefs_missing" 1236702)"
assert_eq "auto_trigger_status: empty list -> missing" \
  "missing" "$(auto_trigger_status "$prefs_empty" 1236702)"
assert_eq "auto_trigger_status: empty string -> missing" \
  "missing" "$(auto_trigger_status "" 1236702)"

# ── resolve_repo ──────────────────────────────────────────────────────────────
assert_eq "resolve_repo: bare name -> org/name" \
  "petry-projects/TalkTerm" "$(ORG=petry-projects resolve_repo "TalkTerm")"
assert_eq "resolve_repo: owner/repo passthrough" \
  "acme/widgets" "$(ORG=petry-projects resolve_repo "acme/widgets")"
assert_eq "resolve_repo: GITHUB_REPOSITORY fallback" \
  "petry-projects/TalkTerm" "$(ORG=petry-projects GITHUB_REPOSITORY=petry-projects/TalkTerm resolve_repo "")"
assert_eq "resolve_repo: REPO env fallback" \
  "petry-projects/TalkTerm" "$(ORG=petry-projects REPO=petry-projects/TalkTerm resolve_repo "")"

if [ "$fails" -eq 0 ]; then
  echo "All tests passed."
  exit 0
fi
echo "$fails test(s) failed." >&2
exit 1
