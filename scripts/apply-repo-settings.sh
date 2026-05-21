#!/usr/bin/env bash
# Apply repository-level security settings via the GitHub API.
#
# Called by the apply-repo-settings workflow on every push to main so that
# settings documented in .github/settings.yml stay in effect even if they
# are reset manually.
#
# Required token scope: administration:write
# Usage (local): GH_TOKEN=<token> GITHUB_REPOSITORY=petry-projects/TalkTerm \
#                  ./scripts/apply-repo-settings.sh
set -euo pipefail

REPO="${GITHUB_REPOSITORY:?GITHUB_REPOSITORY must be set (e.g. petry-projects/TalkTerm)}"

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

echo "Disabling CodeRabbit (app 347564) check-suite auto-trigger ..."

# CodeRabbit's queued check suites are never completed, which permanently
# blocks auto-merge. Disabling auto-trigger prevents GitHub from creating
# those ghost check suites on every push.
gh api -X PATCH "repos/${REPO}/check-suites/preferences" \
  --input - <<'JSON'
{
  "auto_trigger_checks": [
    { "app_id": 347564, "setting": false }
  ]
}
JSON

echo "Done."
