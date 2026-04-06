#!/usr/bin/env bash
# setup-labels.sh — Create required repository labels from .github/labels.yml
#
# Usage:
#   bash scripts/setup-labels.sh [--repo OWNER/REPO]
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Repository admin or write access
#
# This script is idempotent: existing labels are updated, new ones are created.

set -euo pipefail

REPO="${GH_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

if [ -n "$1" ] && [ "$1" = "--repo" ]; then
  REPO="$2"
fi

echo "Setting up labels for: $REPO"
echo ""

# Define labels inline (matches .github/labels.yml)
declare -a LABEL_NAMES=(
  "bug"
  "documentation"
  "duplicate"
  "enhancement"
  "good first issue"
  "help wanted"
  "invalid"
  "question"
  "security"
  "wontfix"
)

declare -a LABEL_COLORS=(
  "d73a4a"
  "0075ca"
  "cfd3d7"
  "a2eeef"
  "7057ff"
  "008672"
  "e4e669"
  "d876e3"
  "e11d48"
  "ffffff"
)

declare -a LABEL_DESCS=(
  "Something isn't working"
  "Improvements or additions to documentation"
  "This issue or pull request already exists"
  "New feature or request"
  "Good for newcomers"
  "Extra attention is needed"
  "This doesn't seem right"
  "Further information is requested"
  "Security vulnerability or concern"
  "This will not be worked on"
)

for i in "${!LABEL_NAMES[@]}"; do
  name="${LABEL_NAMES[$i]}"
  color="${LABEL_COLORS[$i]}"
  desc="${LABEL_DESCS[$i]}"

  if gh label list --repo "$REPO" --json name -q '.[].name' | grep -qx "$name"; then
    echo "  Updating : $name"
    gh label edit "$name" --repo "$REPO" --color "$color" --description "$desc"
  else
    echo "  Creating : $name"
    gh label create "$name" --repo "$REPO" --color "$color" --description "$desc"
  fi
done

echo ""
echo "Done. All required labels are in place."
