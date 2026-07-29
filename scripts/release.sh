#!/usr/bin/env bash
# Cuts a GitHub release for the current _bower/VERSION, using the matching
# section of _bower/changes.md as the release notes.
#
# Usage:
#   scripts/release.sh             # cut the release
#   scripts/release.sh --dry-run   # show what would be released, no side effects
#
# Aborts if the tag already exists, the changes.md section is missing, or the
# docs viewer's acceptance test fails.
set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" || "${1:-}" == "-n" ]]; then
  DRY_RUN=1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/_bower/VERSION"
CHANGES_FILE="$REPO_ROOT/_bower/changes.md"
VIEWER_TEST="$REPO_ROOT/tools/viewer-test/run.cjs"

[[ -f "$VERSION_FILE" ]] || { echo "error: $VERSION_FILE not found" >&2; exit 1; }
[[ -f "$CHANGES_FILE" ]] || { echo "error: $CHANGES_FILE not found" >&2; exit 1; }

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ -n "$VERSION" ]] || { echo "error: $VERSION_FILE is empty" >&2; exit 1; }
TAG="v$VERSION"

# The docs viewer parses the document schemas this release ships, and it fails
# silently — wrong findings, not a crash. Gate the release on its fixtures so a
# schema change cannot be published with the viewer misreading it.
if [[ -f "$VIEWER_TEST" ]]; then
  if command -v node >/dev/null 2>&1; then
    echo "Checking the docs viewer against framework v$VERSION schemas…"
    if ! node "$VIEWER_TEST"; then
      echo "error: the docs viewer's acceptance test failed — see _bower/viewer/README.md," >&2
      echo "       'Keeping it honest when the framework changes'. Fix the viewer, or the" >&2
      echo "       fixtures if a schema genuinely changed, before releasing." >&2
      exit 1
    fi
    # SCHEMA_VERSION should track the version being released; a stale one makes
    # every project on the new version report a spurious skew.
    VIEWER_SCHEMA="$(grep -oE "SCHEMA_VERSION = '[^']+'" "$REPO_ROOT/_bower/viewer/lib/extract.cjs" \
      | head -1 | sed -E "s/.*'([^']+)'.*/\1/")"
    if [[ "$VIEWER_SCHEMA" != "$VERSION" ]]; then
      echo "error: _bower/viewer/lib/extract.cjs declares SCHEMA_VERSION '$VIEWER_SCHEMA'," >&2
      echo "       but this release is v$VERSION. Bump it, or confirm no schema changed" >&2
      echo "       and set it to $VERSION anyway — every project on v$VERSION will otherwise" >&2
      echo "       see a version-skew notice." >&2
      exit 1
    fi
  else
    echo "warning: node not found — skipping the docs viewer acceptance test" >&2
  fi
fi

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
