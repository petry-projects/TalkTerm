#!/usr/bin/env bash
# Apply repository-level security settings via the GitHub API.
#
# Called by the apply-repo-settings workflow on path-filtered pushes to main,
# on a weekly schedule (Mondays 06:00 UTC), and via manual dispatch.
# This ensures settings documented in .github/settings.yml stay in effect
# even if they are reset manually or drift over time.
#
# Required token scope: administration:write
# Usage (local): GH_TOKEN=<token> GITHUB_REPOSITORY=petry-projects/TalkTerm \
#                  ./scripts/apply-repo-settings.sh
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set (e.g. petry-projects/TalkTerm)}"

# Settings: secret_scanning, secret_scanning_push_protection, secret_scanning_ai_detection,
#           secret_scanning_non_provider_patterns, dependabot_security_updates
# Standard: https://github.com/petry-projects/.github/blob/main/standards/push-protection.md
echo "Applying security_and_analysis settings to ${REPO} ..."

gh api -X PATCH "repos/${REPO}" \
  --input - <<'JSON'
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

echo "Disabling CodeRabbit (app 347564) and Claude (app 1236702) check-suite auto-trigger ..."

# These apps create queued check suites on every push that are never completed,
# which permanently blocks auto-merge. Disabling auto-trigger prevents GitHub
# from creating those ghost check suites.
gh api -X PATCH "repos/${REPO}/check-suites/preferences" \
  --input - <<'JSON'
{
  "auto_trigger_checks": [
    { "app_id": 347564, "setting": false },
    { "app_id": 1236702, "setting": false }
  ]
}
JSON

echo "Done."
