#!/usr/bin/env bash
# Cuts a GitHub release for the current _bower/VERSION, using the matching
# section of _bower/changes.md as the release notes.
#
# Usage:
#   scripts/release.sh             # cut the release
#   scripts/release.sh --dry-run   # show what would be released, no side effects
#   scripts/release.sh --help      # show this usage and stop
#
# Aborts if the working tree is dirty, HEAD is not the published main commit,
# the tag already exists, the changes.md section is missing, the checked-in
# runtime adapters have drifted from skills-src/, any of the docs viewer,
# adapter generator, or scaffold acceptance tests fail, or there is no
# PowerShell parity evidence for this version (a real parity run here, or a PASS
# row in tools/scaffold-test/PS1-PARITY.md).
set -euo pipefail

DRY_RUN=0
case "${1:-}" in
  '') ;;
  --dry-run|-n) DRY_RUN=1 ;;
  --help|-h)
    sed -n '2,9p' "$0" | sed -E 's/^# ?//'
    exit 0
    ;;
  *)
    echo "error: unknown argument '$1' (use --dry-run or --help)" >&2
    exit 2
    ;;
esac
[[ "$#" -le 1 ]] || { echo "error: expected at most one argument" >&2; exit 2; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/_bower/VERSION"
CHANGES_FILE="$REPO_ROOT/_bower/changes.md"
VIEWER_TEST="$REPO_ROOT/tools/viewer-test/run.cjs"
ADAPTER_BUILD="$REPO_ROOT/scripts/build-adapters.cjs"
ADAPTER_TEST="$REPO_ROOT/tools/adapter-test/run.cjs"
SCAFFOLD_TEST="$REPO_ROOT/tools/scaffold-test/run.sh"
PS1_PARITY="$REPO_ROOT/tools/scaffold-test/PS1-PARITY.md"

[[ -f "$VERSION_FILE" ]] || { echo "error: $VERSION_FILE not found" >&2; exit 1; }
[[ -f "$CHANGES_FILE" ]] || { echo "error: $CHANGES_FILE not found" >&2; exit 1; }

VERSION="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ -n "$VERSION" ]] || { echo "error: $VERSION_FILE is empty" >&2; exit 1; }
TAG="v$VERSION"

# A release is a statement about a commit, never about the caller's working
# tree. Refuse to publish notes/version/tests read from uncommitted files, and
# pin the tag to the exact commit those checks describe. Dry-run deliberately
# remains available while preparing a release.
HEAD_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD)"
if [[ "$DRY_RUN" != "1" ]]; then
  [[ -z "$(git -C "$REPO_ROOT" status --porcelain)" ]] || {
    echo "error: working tree is dirty — commit the release contents before publishing" >&2
    exit 1
  }
  REMOTE_MAIN="$(git -C "$REPO_ROOT" ls-remote origin refs/heads/main | awk '{print $1}')"
  [[ -n "$REMOTE_MAIN" ]] || { echo "error: could not resolve origin/main" >&2; exit 1; }
  [[ "$HEAD_SHA" == "$REMOTE_MAIN" ]] || {
    echo "error: HEAD ($HEAD_SHA) is not origin/main ($REMOTE_MAIN) — push the release commit first" >&2
    exit 1
  }
fi
TARGET_LABEL="$HEAD_SHA (current HEAD)"
if [[ "$DRY_RUN" == "1" && -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  TARGET_LABEL="$HEAD_SHA (current HEAD; working tree dirty — a real release would refuse)"
fi

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

# The four runtime adapter trees are generated from skills-src/ and checked in,
# so a release can ship generated files that no longer say what their source
# says — and a stale adapter reads as perfectly valid on its own. Byte-compare
# the tree against a fresh build before publishing it.
if [[ -f "$ADAPTER_BUILD" ]]; then
  if command -v node >/dev/null 2>&1; then
    echo "Checking the generated runtime adapters against skills-src/…"
    if ! node "$ADAPTER_BUILD" --check; then
      echo "error: the checked-in runtime adapters have drifted from skills-src/ (or a" >&2
      echo "       source failed lint). Regenerate with" >&2
      echo "           node scripts/build-adapters.cjs" >&2
      echo "       and commit sources and generated files together before releasing." >&2
      exit 1
    fi
  else
    echo "warning: node not found — skipping the runtime adapter drift check" >&2
  fi
fi

# --check only proves the tree matches the generator. These two prove the
# generator and the scaffold are themselves still correct.
if [[ -f "$ADAPTER_TEST" ]]; then
  if command -v node >/dev/null 2>&1; then
    echo "Checking the adapter generator against its fixtures…"
    if ! node "$ADAPTER_TEST"; then
      echo "error: the adapter generator's acceptance test failed — see" >&2
      echo "       tools/adapter-test/run.cjs. Fix the generator, or the fixture if the" >&2
      echo "       emission genuinely changed, before releasing." >&2
      exit 1
    fi
  else
    echo "warning: node not found — skipping the adapter generator acceptance test" >&2
  fi
fi

# The scaffold is the only thing here that writes into somebody else's
# repository; a regression clobbers project-owned files or leaves a split
# footprint behind. Never publish past a failure in it.
if [[ -f "$SCAFFOLD_TEST" ]]; then
  echo "Checking the scaffold against its fixtures…"
  scaffold_status=0
  SCAFFOLD_OUT="$(bash "$SCAFFOLD_TEST" 2>&1)" || scaffold_status=$?
  printf '%s\n' "$SCAFFOLD_OUT"
  if [[ "$scaffold_status" -ne 0 ]]; then
    echo "error: the scaffold's acceptance test failed — see tools/scaffold-test/run.sh." >&2
    echo "       Fix the scaffold, or the test if its footprint genuinely changed," >&2
    echo "       before releasing." >&2
    exit 1
  fi

  # scaffold.ps1 is maintained by hand against scaffold.sh, and the parity case
  # is the only thing that proves it — but it needs pwsh on PATH, so on most
  # boxes it skips and every PowerShell edit would ship unexecuted. Accept either
  # a real run here or a PASS attestation naming this version.
  if grep -q 'ps1-parity ran' <<<"$SCAFFOLD_OUT"; then
    echo "scaffold.ps1 parity: verified in this environment."
  else
    VERSION_RE="${VERSION//./\\.}"
    if [[ -f "$PS1_PARITY" ]] && grep -qE "^\|[[:space:]]*${VERSION_RE}[[:space:]]*\|.*PASS" "$PS1_PARITY"; then
      echo "scaffold.ps1 parity: attested for v$VERSION in tools/scaffold-test/PS1-PARITY.md."
    else
      {
        echo "error: no PowerShell parity evidence for v$VERSION."
        echo
        echo "       The parity case skipped (no pwsh/powershell on PATH), and"
        echo "       tools/scaffold-test/PS1-PARITY.md has no PASS row for $VERSION. Every"
        echo "       scaffold.ps1 edit in this release is therefore unexecuted."
        echo
        echo "       On a box with bash and PowerShell both on PATH, run:"
        echo "           bash tools/scaffold-test/run.sh"
        echo "       confirm 'ps1-parity ran' and 0 failed, then add a row to"
        echo "       tools/scaffold-test/PS1-PARITY.md and commit it with the release."
      } >&2
      exit 1
    fi
  fi
fi

if git -C "$REPO_ROOT" rev-parse "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi
if git -C "$REPO_ROOT" ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
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
  echo "Target: $TARGET_LABEL"
  echo "---- Notes ----"
  printf '%s\n' "$NOTES"
  echo "---- End ----"
  exit 0
fi

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
printf '%s\n' "$NOTES" > "$TMPFILE"

gh release create "$TAG" \
  --target "$HEAD_SHA" \
  --title "$TITLE" \
  --notes-file "$TMPFILE"

echo "Released $TAG."
