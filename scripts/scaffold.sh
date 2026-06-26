#!/usr/bin/env bash
#
# scaffold.sh — seed the Bower framework footprint into a target directory.
#
# Usage:
#   scripts/scaffold.sh [--plugin] <target-dir>
#
# Source layout (this repo / the installed plugin):
#   commands/<cmd>.md         the /bower:<cmd> slash commands (plugin-native names)
#   agents/bower-*.md         the Bower subagents
#   _bower/*.md               reference files (framework.md, changes.md, …)
#   _bower/VERSION            canonical framework version
#   _bower/project-CLAUDE.md  CLAUDE.md template seeded into new projects
#   _bower/project-settings.json  .claude/settings.json template
#
# Source root resolves to ${CLAUDE_PLUGIN_ROOT} when set (so this script works
# when shipped inside the `bower` plugin); otherwise to this repo (so the legacy
# `git clone + scaffold.sh` path is unchanged).
#
# TWO MODES
# ---------
# Legacy mode (default) — for projects that DON'T install the plugin:
#   Seeds the full footprint, transforming the plugin-native command refs back to
#   the flat scaffold form so the project gets `/b-*` commands:
#     - commands/<cmd>.md  → <target>/.claude/commands/b-<cmd>.md   (refs /bower:x → /b-x)
#     - agents/*.md        → <target>/.claude/agents/                (refs /bower:x → /b-x)
#     - _bower/*.md        → <target>/_bower/                        (refs /bower:x → /b-x)
#   This output is byte-identical to historical scaffold output. `commands/init.md`
#   is plugin-only and is NOT copied in legacy mode.
#
# --plugin mode — for projects that DO install the `bower` plugin:
#   Seeds PROJECT STATE ONLY. The plugin supplies the commands and agents, so this
#   mode does NOT create .claude/commands or .claude/agents, and copies _bower/*.md
#   VERBATIM (keeping the /bower: command refs the plugin cohort actually types).
#   This is what `/bower:init` runs.
#
# Always copies (overwrites), per mode as above:
#   - _bower/                 (excluding project-CLAUDE.md, project-settings.json,
#                              VERSION, and SOURCE — VERSION is owned by /b-upgrade
#                              (legacy) or /bower:upgrade (plugin) in the project;
#                              SOURCE is preserved so forks/mirrors are respected;
#                              the two templates are seeded out, not copied in.)
#   - .claude/agents/, .claude/commands/   (legacy mode only)
#
# Conditionally creates (both modes):
#   - <target>/CLAUDE.md             only if absent, seeded from
#                                    _bower/project-CLAUDE.md.
#   - <target>/.claude/settings.json only if absent, seeded from
#                                    _bower/project-settings.json. Pre-allows
#                                    safe read-only Bash patterns Bower skills
#                                    use (find, ls, git status/diff/log/show,
#                                    rg, grep, wc) to cut permission-prompt
#                                    friction. The project owns this file
#                                    afterwards; edit freely.
#   - <target>/_bower/VERSION        only if absent. Holds the framework version
#                                    this project was last migrated to.
#   - <target>/_bower/SOURCE         only if absent. Holds the git URL of the
#                                    framework repo to clone from when an upgrade
#                                    runs. Written from this repo's `origin` remote
#                                    (skipped when sourcing from a plugin cache with
#                                    no git remote).
#
# Does not touch:
#   - target's existing CLAUDE.md, .claude/settings.json, _bower/VERSION, _bower/SOURCE
#   - target's docs/, .claude/settings.local.json, or anything else.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing the footprint in place. The project should then run
# /b-upgrade (legacy) or /bower:upgrade (plugin) to apply per-version migrations.

set -euo pipefail

plugin_mode=0
args=()
for arg in "$@"; do
  case "$arg" in
    --plugin) plugin_mode=1 ;;
    *) args+=("$arg") ;;
  esac
done

if [[ ${#args[@]} -ne 1 ]]; then
  echo "Usage: $0 [--plugin] <target-dir>" >&2
  exit 2
fi

target="${args[0]}"

# Source root: the installed plugin dir if present, else this repo.
if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  src="$CLAUDE_PLUGIN_ROOT"
else
  src="$(cd "$(dirname "$0")/.." && pwd)"
fi

if [[ ! -d "$target" ]]; then
  mkdir -p "$target"
fi

framework_version="$(tr -d '[:space:]' < "$src/_bower/VERSION")"

# Capture project's old version (if any) before we touch anything.
old_version=""
if [[ -f "$target/_bower/VERSION" ]]; then
  old_version="$(tr -d '[:space:]' < "$target/_bower/VERSION")"
fi

# transform-down: rewrite plugin-native command refs (/bower:cmd) to the flat
# scaffold form (/b-cmd). [a-z-]+ so multi-word historical refs (e.g.
# /bower:design-full) round-trip exactly. No-op in plugin mode.
transform_down() {
  sed -E 's#/bower:([a-z-]+)#/b-\1#g'
}

# Copy a single file. In legacy mode, .md files are transformed-down; everything
# else (and everything in plugin mode) is copied verbatim.
copy_file() {
  local from="$1" to="$2"
  if [[ $plugin_mode -eq 0 && "$from" == *.md ]]; then
    transform_down < "$from" > "$to"
  else
    cp "$from" "$to"
  fi
}

# 1. _bower/ — copy reference files, excluding template seeds, VERSION, SOURCE.
mkdir -p "$target/_bower"
for f in "$src"/_bower/*; do
  name="$(basename "$f")"
  case "$name" in
    project-CLAUDE.md|project-settings.json|VERSION|SOURCE) continue ;;
  esac
  if [[ -d "$f" ]]; then
    cp -R "$f" "$target/_bower/"
  else
    copy_file "$f" "$target/_bower/$name"
  fi
done

# 2. Commands and agents — legacy mode only (the plugin supplies these otherwise).
if [[ $plugin_mode -eq 0 ]]; then
  rm -rf "$target/.claude/commands" "$target/.claude/agents"
  mkdir -p "$target/.claude/commands" "$target/.claude/agents"
  # commands/<cmd>.md → .claude/commands/b-<cmd>.md (init.md is plugin-only: skip).
  for f in "$src"/commands/*.md; do
    name="$(basename "$f")"          # e.g. feature.md
    [[ "$name" == "init.md" ]] && continue
    copy_file "$f" "$target/.claude/commands/b-$name"
  done
  # agents/*.md → .claude/agents/ (names unchanged; plugins don't namespace agents).
  for f in "$src"/agents/*.md; do
    copy_file "$f" "$target/.claude/agents/$(basename "$f")"
  done
fi

# 3. CLAUDE.md — seed only if absent.
claude_action="preserved (already exists)"
if [[ ! -f "$target/CLAUDE.md" ]]; then
  copy_file "$src/_bower/project-CLAUDE.md" "$target/CLAUDE.md"
  claude_action="created from _bower/project-CLAUDE.md"
fi

# 4. .claude/settings.json — seed only if absent. The project owns it after that.
mkdir -p "$target/.claude"
settings_action="preserved (already exists)"
if [[ ! -f "$target/.claude/settings.json" ]]; then
  cp "$src/_bower/project-settings.json" "$target/.claude/settings.json"
  settings_action="created from _bower/project-settings.json"
fi

# 5. _bower/VERSION — seed only if absent. Upgrade owns it from then on.
version_action="preserved (already exists, was $old_version)"
if [[ -z "$old_version" ]]; then
  cp "$src/_bower/VERSION" "$target/_bower/VERSION"
  version_action="created at $framework_version"
fi

# 6. _bower/SOURCE — seed only if absent. Read from this repo's `origin` remote so
#    forks naturally point projects back at themselves. When sourcing from a plugin
#    cache (no git remote), it's skipped and the upgrade flow prompts for the URL.
source_action="preserved (already exists)"
if [[ ! -f "$target/_bower/SOURCE" ]]; then
  if remote_url="$(git -C "$src" remote get-url origin 2>/dev/null)"; then
    printf '%s\n' "$remote_url" > "$target/_bower/SOURCE"
    source_action="created ($remote_url)"
  else
    source_action="skipped (no git remote at source; upgrade will prompt)"
  fi
fi

mode_label="legacy (in-tree /b-* commands)"
[[ $plugin_mode -eq 1 ]] && mode_label="plugin (project state only)"
echo "Bower v$framework_version → $target  [$mode_label]"
echo "  _bower/                  refreshed"
if [[ $plugin_mode -eq 0 ]]; then
  echo "  .claude/agents/          refreshed"
  echo "  .claude/commands/        refreshed"
else
  echo "  .claude/commands,agents  skipped (provided by plugin)"
fi
echo "  CLAUDE.md                $claude_action"
echo "  .claude/settings.json    $settings_action"
echo "  _bower/VERSION           $version_action"
echo "  _bower/SOURCE            $source_action"

# Hint about upgrade when the project was already on an older version.
if [[ -n "$old_version" && "$old_version" != "$framework_version" ]]; then
  echo
  echo "Project was at v$old_version, framework is now v$framework_version."
  if [[ $plugin_mode -eq 1 ]]; then
    echo "Run /bower:upgrade in the project to apply migration notes and bump VERSION."
  else
    echo "Run /b-upgrade in the project to apply migration notes and bump VERSION."
  fi
fi
