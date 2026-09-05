#!/usr/bin/env bash
# test-gitleaks-config.sh — regression guard for .gitleaks.toml
#
# Why this exists (Fleet Monitor #483):
#   ci.yml's `secret-scan` job runs a full-history `gitleaks detect`. Reviewed
#   false positives (SHA-256 content checksums in _bmad/_config/files-manifest.csv)
#   are meant to be suppressed by PATH-based allowlists in .gitleaks.toml (#474).
#   Those allowlists used `regexTarget = "line"` with a leading `^` anchor
#   (`^"..."$`). But gitleaks feeds the allowlist a MULTI-LINE fragment — the
#   finding line PLUS leading context, beginning with a newline — as the "line"
#   target, so an anchored `^` never matches the row start and the allowlist
#   silently no-ops. The false positives then fail CI on every run: a 45.5%
#   failure rate that Fleet Monitor flagged as DEGRADED. Dropping the leading
#   `^` (the trailing `$` still binds the match to the finding's own row) fixes it.
#
# The invariant this guard locks: no `regexTarget = "line"` allowlist regex in
# .gitleaks.toml may begin with a `^` start-of-text anchor. A trailing `$` is
# fine and desirable; a leading `^` is the footgun. `regexTarget = "secret"`
# (the default) matches only the extracted secret value, not the multi-line
# fragment, so a leading `^` there is legitimate and is not flagged.
#
# Accepts an optional config path (default: .gitleaks.toml) so the checks can be
# exercised against fixtures — see test-gitleaks-config.test.sh.
# Run: bash scripts/test-gitleaks-config.sh
set -euo pipefail

CONFIG="${1:-.gitleaks.toml}"
PASS=true

echo "=== test-gitleaks-config ==="

# ── Check 0: yq is available ───────────────────────────────────────────────
if ! command -v yq &> /dev/null; then
  echo "FAIL: 'yq' is required to parse TOML safely but was not found."
  exit 1
fi
echo "PASS: 'yq' is available"

# ── Check 1: the config file exists ────────────────────────────────────────
if [[ ! -f "$CONFIG" ]]; then
  echo "FAIL: $CONFIG not found. ci.yml's gitleaks step loads it with --config;"
  echo "      a missing file silently falls back to the default config and its"
  echo "      reviewed false-positive allowlists never apply (#474)."
  exit 1
fi
echo "PASS: $CONFIG exists"

# ── Check 2: the config is tracked by git ──────────────────────────────────
# Only meaningful inside a git repo (fixtures live in throwaway temp dirs).
if git rev-parse --git-dir >/dev/null 2>&1; then
  if git ls-files --error-unmatch "$CONFIG" >/dev/null 2>&1; then
    echo "PASS: $CONFIG is tracked by git"
  else
    echo "FAIL: $CONFIG exists but is not tracked by git. The config must be"
    echo "      committed so its allowlists load in CI and cannot be bypassed by"
    echo "      an untracked substitute placed before the scan."
    PASS=false
  fi
else
  echo "PASS: not a git repo — skipping the git-tracking check (fixture mode)"
fi

# ── Check 3: no `regexTarget = "line"` allowlist regex starts with `^` ──────
# Extract every regex belonging to an allowlist whose regexTarget is exactly
# "line". Support both the `[[allowlists]]` array and a single `[allowlist]`
# object, so the guard covers either gitleaks config shape. Each regex is
# base64-encoded so an arbitrary pattern (quotes, newlines, YAML-special leading
# characters) survives the round trip through yq and the shell intact.
if ! encoded_regexes=$(yq -p toml -o json '
    ((.allowlists // []) + ([.allowlist] | map(select(. != null))))
    | .[]
    | select(.regexTarget == "line")
    | .regexes[]
    | @base64
  ' "$CONFIG" 2>/dev/null); then
  echo "FAIL: yq failed to parse $CONFIG. Please check that it is valid TOML."
  exit 1
fi

if [[ -z "$encoded_regexes" || "$encoded_regexes" == "null" ]]; then
  echo "PASS: no 'regexTarget = \"line\"' allowlist regexes in $CONFIG"
else
  bad_anchor=false
  while IFS= read -r encoded; do
    [[ -z "$encoded" ]] && continue
    # yq emits each value as a JSON string ("..."); strip the wrapping quotes
    # before decoding.
    encoded="${encoded%\"}"
    encoded="${encoded#\"}"
    if ! rx=$(printf '%s' "$encoded" | base64 -d 2>/dev/null); then
      echo "FAIL: could not decode an allowlist regex from $CONFIG."
      exit 1
    fi
    # Flag a leading `^` start-of-text anchor, allowing an optional inline-flag
    # group (e.g. `(?i)^...`) before it. An escaped `\^` (first char `\`) is a
    # literal caret, not an anchor, and is correctly left alone.
    if [[ "$rx" =~ ^(\(\?[a-zA-Z]*\))?\^ ]]; then
      echo "FAIL: an allowlist in $CONFIG uses regexTarget = \"line\" with a regex"
      echo "      anchored at the start (^): ${rx}"
      echo "      gitleaks passes a multi-line fragment (finding line + leading"
      echo "      context, starting with a newline) as the \"line\" target, so a"
      echo "      leading ^ never matches and the allowlist silently no-ops — the"
      echo "      root cause of Fleet Monitor #483. Remove the leading ^ (keep any"
      echo "      trailing \$, which binds the match to the finding's own line)."
      bad_anchor=true
      PASS=false
    fi
  done <<< "$encoded_regexes"
  if [[ "$bad_anchor" == "false" ]]; then
    echo "PASS: no 'regexTarget = \"line\"' allowlist regex starts with a ^ anchor"
  fi
fi

echo ""
if [[ "$PASS" == "true" ]]; then
  echo "All checks passed."
else
  echo "One or more checks failed."
  exit 1
fi
