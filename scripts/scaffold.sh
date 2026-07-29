#!/usr/bin/env bash
#
# scaffold.sh — copy the Bower framework footprint into a target directory.
#
# Usage: scripts/scaffold.sh <target-dir>
#
# Always copies (overwrites):
#   - _bower/                 (excluding project-CLAUDE.md, project-settings.json,
#                              VERSION, and SOURCE — VERSION is owned by /b-upgrade
#                              in the project; SOURCE is preserved so forks/mirrors
#                              are respected; the two templates are seeded out, not
#                              copied in.)
#   - .claude/agents/         (Bower subagents)
#   - .claude/commands/       (Bower /b-* slash commands)
#
# Prunes:
#   - Anything in <target>/_bower/ that the framework no longer ships, except
#     VERSION and SOURCE (project-owned). Directories are replaced wholesale,
#     so files retired inside them (e.g. a renamed viewer/ asset) go too.
#     Each removal is named in the closing summary.
#
# Conditionally creates:
#   - <target>/CLAUDE.md             only if the target has no CLAUDE.md, seeded
#                                    from _bower/project-CLAUDE.md.
#   - <target>/.claude/settings.json only if absent, seeded from
#                                    _bower/project-settings.json. Pre-allows
#                                    safe read-only Bash patterns Bower skills
#                                    use (find, ls, git status/diff/log/show,
#                                    rg, grep, wc) to cut permission-prompt
#                                    friction. The project owns this file
#                                    afterwards; edit freely.
#   - <target>/_bower/VERSION        only if absent. Holds the framework version
#                                    this project was last migrated to.
#                                    /b-upgrade in the project bumps this
#                                    step-by-step as migrations apply.
#   - <target>/_bower/SOURCE         only if absent. Holds the git URL of the
#                                    framework repo to clone from when
#                                    /b-upgrade runs. Written from this repo's
#                                    `origin` remote.
#
# Does not touch:
#   - target's existing CLAUDE.md, .claude/settings.json, _bower/VERSION, _bower/SOURCE
#   - target's docs/, .claude/settings.local.json, or anything else.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing _bower/ and .claude/agents,commands in place. The project
# should then run /b-upgrade to apply any per-version migrations and bump VERSION.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <target-dir>" >&2
  exit 2
fi

target="$1"
src="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$target" ]]; then
  mkdir -p "$target"
fi

framework_version="$(cat "$src/_bower/VERSION" | tr -d '[:space:]')"

# Capture project's old version (if any) before we touch anything.
old_version=""
if [[ -f "$target/_bower/VERSION" ]]; then
  old_version="$(cat "$target/_bower/VERSION" | tr -d '[:space:]')"
fi

# 1. _bower/ — copy everything except the template seeds (project-CLAUDE.md,
#    project-settings.json), VERSION (owned by /b-upgrade), and SOURCE
#    (preserved across upgrades).
mkdir -p "$target/_bower"
for f in "$src"/_bower/*; do
  name="$(basename "$f")"
  case "$name" in
    project-CLAUDE.md) continue ;;
    project-settings.json) continue ;;
    VERSION) continue ;;
    SOURCE)  continue ;;
  esac
  # Replace directories wholesale rather than merging, so files retired
  # inside them don't linger downstream.
  if [[ -d "$f" && -d "$target/_bower/$name" ]]; then
    rm -rf "$target/_bower/$name"
  fi
  cp -R "$f" "$target/_bower/"
done

# 1b. Prune _bower/ entries the framework no longer ships. VERSION and SOURCE
#     are project-owned and never pruned.
pruned=()
for f in "$target"/_bower/*; do
  [[ -e "$f" ]] || continue
  name="$(basename "$f")"
  case "$name" in
    VERSION|SOURCE) continue ;;
  esac
  if [[ ! -e "$src/_bower/$name" ]]; then
    rm -rf "$f"
    pruned+=("$name")
  fi
done

# 2. .claude/agents and .claude/commands — refresh in place.
mkdir -p "$target/.claude"
for sub in agents commands; do
  if [[ -d "$src/.claude/$sub" ]]; then
    rm -rf "$target/.claude/$sub"
    cp -R "$src/.claude/$sub" "$target/.claude/$sub"
  fi
done

# 3. CLAUDE.md — seed only if absent.
claude_action="preserved (already exists)"
if [[ ! -f "$target/CLAUDE.md" ]]; then
  cp "$src/_bower/project-CLAUDE.md" "$target/CLAUDE.md"
  claude_action="created from _bower/project-CLAUDE.md"
fi

# 4. .claude/settings.json — seed only if absent. The project owns it after that.
settings_action="preserved (already exists)"
if [[ ! -f "$target/.claude/settings.json" ]]; then
  cp "$src/_bower/project-settings.json" "$target/.claude/settings.json"
  settings_action="created from _bower/project-settings.json"
fi

# 5. _bower/VERSION — seed only if absent. /b-upgrade owns it from then on.
version_action="preserved (already exists, was $old_version)"
if [[ -z "$old_version" ]]; then
  cp "$src/_bower/VERSION" "$target/_bower/VERSION"
  version_action="created at $framework_version"
fi

# 6. _bower/SOURCE — seed only if absent. Used by /b-upgrade to find the
#    framework repo to clone from. Read from this repo's `origin` remote so
#    forks naturally point projects back at themselves.
source_action="preserved (already exists)"
if [[ ! -f "$target/_bower/SOURCE" ]]; then
  if remote_url="$(git -C "$src" remote get-url origin 2>/dev/null)"; then
    printf '%s\n' "$remote_url" > "$target/_bower/SOURCE"
    source_action="created ($remote_url)"
  else
    source_action="skipped (no git remote in framework repo; /b-upgrade will prompt)"
  fi
fi

echo "Bower v$framework_version → $target"
echo "  _bower/                  refreshed"
if [[ ${#pruned[@]} -gt 0 ]]; then
  for name in "${pruned[@]}"; do
    echo "  _bower/$name  removed (retired upstream)"
  done
fi
echo "  .claude/agents/          refreshed"
echo "  .claude/commands/        refreshed"
echo "  CLAUDE.md                $claude_action"
echo "  .claude/settings.json    $settings_action"
echo "  _bower/VERSION           $version_action"
echo "  _bower/SOURCE            $source_action"

# Hint about /b-upgrade when the project was already on an older version.
if [[ -n "$old_version" && "$old_version" != "$framework_version" ]]; then
  echo
  echo "Project was at v$old_version, framework is now v$framework_version."
  echo "Run /b-upgrade in the project to apply migration notes and bump VERSION."
fi
