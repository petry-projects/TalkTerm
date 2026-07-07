#!/usr/bin/env bash
# Apply repository-level standard settings via the GitHub API.
#
# Applies security_and_analysis settings and disables check-suite auto-trigger
# for apps that queue suites on every push without completing them (Claude,
# CodeRabbit), which permanently blocks GitHub auto-merge.
#
# Standard: petry-projects/.github/standards/github-settings.md
#           #check-suite-auto-trigger-preferences
#
# Usage:
#   bash scripts/apply-repo-settings.sh <repo-name>      # e.g. TalkTerm
#   bash scripts/apply-repo-settings.sh <owner/repo>
#   GITHUB_REPOSITORY=owner/repo bash scripts/apply-repo-settings.sh   # CI form
#
# Environment:
#   GH_TOKEN           GitHub token. The check-suites API rejects OAuth app
#                      tokens — use a classic PAT with `repo` scope (or admin).
#   ORG                GitHub org used to expand a bare repo name (default:
#                      petry-projects).
#   GITHUB_REPOSITORY  owner/repo, used when no positional argument is given
#                      (set automatically by GitHub Actions).
#
# The helpers below are pure and side-effect-free so they can be sourced and
# unit-tested; main only runs when the script is executed directly.

# App IDs whose check-suite auto-trigger must be disabled. GitHub creates a
# queued suite on every push when auto-trigger is on; these apps never complete
# those suites, permanently blocking auto-merge.
readonly -a CHECK_SUITE_APP_IDS=(1236702 347564) # Claude, CodeRabbit

# resolve_repo <arg>
# Resolves the target "owner/repo". Precedence: positional arg, then
# GITHUB_REPOSITORY, then REPO. A bare name is expanded to "<ORG>/<name>".
# Returns non-zero if no repo can be determined.
resolve_repo() {
  local repo="${1:-}"
  [[ -z "$repo" ]] && repo="${GITHUB_REPOSITORY:-}"
  [[ -z "$repo" ]] && repo="${REPO:-}"
  [[ -z "$repo" ]] && return 1
  case "$repo" in
    */*) printf '%s' "$repo" ;;
    *) printf '%s/%s' "${ORG:-petry-projects}" "$repo" ;;
  esac
}

# auto_trigger_status <prefs_json> <app_id>
# Echoes the current auto_trigger setting for app_id: "true", "false", or
# "missing" (app absent from preferences — never run in repo, so compliant).
auto_trigger_status() {
  local json="${1:-}" app_id="$2"
  if [[ -z "$json" ]]; then
    printf 'missing'
    return 0
  fi
  printf '%s' "$json" | jq -r --argjson id "$app_id" \
    '.preferences.auto_trigger_checks // []
     | map(select(.app_id == $id))
     | if length == 0 then "missing" else (.[0].setting | tostring) end'
}

# apply_security_and_analysis <owner/repo>
apply_security_and_analysis() {
  local repo="$1"
  echo "Applying security_and_analysis settings to ${repo} ..."
  gh api -X PATCH "repos/${repo}" --input - <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" },
    "secret_scanning_ai_detection": { "status": "enabled" },
    "secret_scanning_non_provider_patterns": { "status": "enabled" },
    "dependabot_security_updates": { "status": "enabled" }
  }
}
JSON
}

# apply_check_suite_prefs <owner/repo>
# Disables auto-trigger for any configured app that currently has it enabled.
# Apps that are "missing" (never run) or already "false" are compliant and left
# untouched. The check-suites/preferences GET endpoint is PATCH-only on GitHub
# and returns 404, so when preferences cannot be read we conservatively apply
# the disabling PATCH for every configured app.
apply_check_suite_prefs() {
  local repo="$1"
  echo "Configuring check-suite auto-trigger preferences for ${repo} ..."

  local prefs status app_id
  local -a to_disable=()
  if prefs=$(gh api "repos/${repo}/check-suites/preferences" 2>/dev/null) && [[ -n "$prefs" ]]; then
    for app_id in "${CHECK_SUITE_APP_IDS[@]}"; do
      status=$(auto_trigger_status "$prefs" "$app_id")
      case "$status" in
        missing) echo "  app ${app_id}: never run in repo — compliant, skipping" ;;
        false) echo "  app ${app_id}: already disabled — skipping" ;;
        *) echo "  app ${app_id}: auto-trigger enabled — disabling"; to_disable+=("$app_id") ;;
      esac
    done
  else
    echo "  could not read current preferences — applying disable for all configured apps"
    to_disable=("${CHECK_SUITE_APP_IDS[@]}")
  fi

  if [[ "${#to_disable[@]}" -eq 0 ]]; then
    echo "  already compliant — nothing to do"
    return 0
  fi

  local payload
  payload=$(printf '%s\n' "${to_disable[@]}" |
    jq -Rcn '[inputs | tonumber] | map({app_id: ., setting: false}) | {auto_trigger_checks: .}')
  gh api -X PATCH "repos/${repo}/check-suites/preferences" --input - <<<"$payload"
}

# Run main only when executed directly, so tests can source the helpers.
if [[ "${BASH_SOURCE[0]:-$0}" == "$0" ]]; then
  set -euo pipefail
  repo="$(resolve_repo "${1:-}")" || {
    echo "Usage: $0 <repo-name|owner/repo>  (or set GITHUB_REPOSITORY)" >&2
    exit 1
  }
  apply_security_and_analysis "$repo"
  apply_check_suite_prefs "$repo"
  echo "Done."
fi
