#!/usr/bin/env bash
# Cuts a GitHub release for the current _bower/VERSION, using the matching
# section of _bower/changes.md as the release notes.
#
# Usage:
#   scripts/release.sh             # cut the release
#   scripts/release.sh --dry-run   # show what would be released, no side effects
#
# Aborts if the tag already exists or the changes.md section is missing.
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/_bower/VERSION"
CHANGES_FILE="$REPO_ROOT/_bower/changes.md"

[[ -f "$VERSION_FILE" ]] || { echo "error: $VERSION_FILE not found" >&2; exit 1; }
[[ -f "$CHANGES_FILE" ]] || { echo "error: $CHANGES_FILE not found" >&2; exit 1; }

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ -n "$VERSION" ]] || { echo "error: $VERSION_FILE is empty" >&2; exit 1; }
TAG="v$VERSION"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  echo "error: tag $TAG already exists on origin" >&2
  exit 1
fi

# Locate the version's section in changes.md
HEADING_REGEX="^## v${VERSION} — "
START_LINE=$(grep -n "$HEADING_REGEX" "$CHANGES_FILE" | head -1 | cut -d: -f1 || true)
[[ -n "$START_LINE" ]] || { echo "error: no '## v$VERSION — ...' heading in $CHANGES_FILE" >&2; exit 1; }

# Extract date from the heading (e.g. "## v0.17 — 2026-05-28")
DATE=$(sed -n "${START_LINE}p" "$CHANGES_FILE" | sed -E "s/^## v${VERSION} — //")
TITLE="v$VERSION — $DATE"

# Find the next "## v" heading after START_LINE, or fall through to EOF
REL_NEXT=$(tail -n +$((START_LINE + 1)) "$CHANGES_FILE" | grep -n "^## v[0-9]" | head -1 | cut -d: -f1 || true)
if [[ -n "$REL_NEXT" ]]; then
  END_LINE=$((START_LINE + REL_NEXT - 1))
else
  END_LINE=$(wc -l < "$CHANGES_FILE")
fi

# Notes = body lines (skip the heading), strip the trailing '---' separator
NOTES=$(sed -n "$((START_LINE + 1)),${END_LINE}p" "$CHANGES_FILE" | sed -E '/^---[[:space:]]*$/d')

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Tag:    $TAG"
  echo "Title:  $TITLE"
  echo "Target: origin/main (current HEAD)"
  echo "---- Notes ----"
  printf '%s\n' "$NOTES"
  echo "---- End ----"
  exit 0
fi

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
printf '%s\n' "$NOTES" > "$TMPFILE"

gh release create "$TAG" \
  --target main \
  --title "$TITLE" \
  --notes-file "$TMPFILE"

echo "Released $TAG."
