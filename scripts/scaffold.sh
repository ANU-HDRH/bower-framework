#!/usr/bin/env bash
#
# scaffold.sh — copy the Bower framework footprint into a target directory.
#
# Usage: scripts/scaffold.sh <target-dir>
#
# Preflight:
#   - Every directory this script manages is probed for writability BEFORE
#     anything is written. If any probe fails, the script names the paths and
#     exits 1 having written nothing. Some agent runtimes mount .agents/ and
#     .codex/ read-only inside their sandbox and fail the write outright rather
#     than prompting — a half-finished run would leave the runtime adapters on
#     different framework versions.
#
# Always copies (overwrites):
#   - _bower/                 (excluding the project-* templates, VERSION, and
#                              SOURCE — VERSION is owned by /b-upgrade in the
#                              project; SOURCE is preserved so forks/mirrors are
#                              respected; the templates are seeded out, not
#                              copied in.)
#   - .claude/agents/         (Bower subagents)
#   - .claude/commands/       (Bower /b-* slash commands)
#   - .agents/skills/b-*/     (Bower skills, the runtime-neutral location)
#   - .codex/agents/bower-*   (Bower custom agents for Codex)
#
# Prunes:
#   - Anything in <target>/_bower/ that the framework no longer ships, except
#     VERSION and SOURCE (project-owned). Directories are replaced wholesale,
#     so files retired inside them (e.g. a renamed viewer/ asset) go too.
#   - Entries in <target>/.agents/skills/ and <target>/.codex/agents/ that are
#     in a framework-owned namespace (`b-*`, `bower-*`) but have no counterpart
#     in this framework version. Anything outside those two namespaces is left
#     alone — .agents/skills/ is the standard skills location and a project may
#     keep its own skills there.
#     Each removal is named in the closing summary.
#
# Conditionally creates:
#   - <target>/AGENTS.md             only if the target has no AGENTS.md, seeded
#                                    from _bower/project-AGENTS.md. Thin: the
#                                    router directive plus project content. A
#                                    grown AGENTS.md is never edited.
#   - <target>/CLAUDE.md             only if the target has no CLAUDE.md, seeded
#                                    from _bower/project-CLAUDE.md — a two-line
#                                    shim that includes AGENTS.md and the
#                                    framework router.
#   - <target>/.codex/config.toml    only if absent, seeded from
#                                    _bower/project-codex-config.toml. Codex
#                                    convenience defaults; the project owns it
#                                    afterwards.
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
#   - target's existing AGENTS.md, CLAUDE.md, .codex/config.toml,
#     .claude/settings.json, _bower/VERSION, _bower/SOURCE
#   - target's docs/, .claude/settings.local.json, non-framework skills, or
#     anything else.
#
# Warns (but never edits) when a *preserved* AGENTS.md carries no reference to
# _bower/framework.md, or a preserved CLAUDE.md is missing either include line.
# An unwired instruction file means the runtime loads no router, and on a fresh
# adoption nothing downstream repairs it: VERSION is seeded at the current
# version, so /b-upgrade has no migration to walk. The warning prints last, names
# the exact lines, and says whether /b-upgrade or the operator should add them.
#
# Idempotent: re-running upgrades an existing project to the current framework
# version by refreshing _bower/ and the runtime adapter trees in place. The
# project should then run /b-upgrade to apply any per-version migrations and
# bump VERSION.

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

# 0. Preflight: can we write everywhere we intend to? A directory that doesn't
#    exist yet is judged by its nearest existing ancestor, which is where the
#    mkdir would land. Probe files are removed immediately; a failed probe
#    creates nothing.
probe_writable() {
  local d="$1" parent probe
  while [[ ! -d "$d" ]]; do
    parent="$(dirname "$d")"
    [[ "$parent" != "$d" ]] || return 1
    d="$parent"
  done
  probe="$d/.bower-write-probe.$$"
  if : > "$probe" 2>/dev/null; then
    rm -f "$probe"
    return 0
  fi
  return 1
}

unwritable=()
for d in "$target" "$target/_bower" "$target/.claude" "$target/.agents/skills" "$target/.codex/agents"; do
  probe_writable "$d" || unwritable+=("$d")
done
if [[ ${#unwritable[@]} -gt 0 ]]; then
  {
    echo "error: cannot write to paths this scaffold manages:"
    for d in "${unwritable[@]}"; do
      echo "  $d"
    done
    echo
    echo "Nothing was written — the target is unchanged."
    echo
    echo "Some agent runtimes mount .agents/ and .codex/ read-only inside their"
    echo "sandbox and fail the write outright rather than prompting for approval."
    echo "If that is what happened, run this yourself in a terminal outside the"
    echo "sandbox:"
    echo
    echo "  bash $src/scripts/scaffold.sh $target"
  } >&2
  exit 1
fi

# 1. _bower/ — copy everything except the project-* template seeds, VERSION
#    (owned by /b-upgrade), and SOURCE (preserved across upgrades).
mkdir -p "$target/_bower"
for f in "$src"/_bower/*; do
  name="$(basename "$f")"
  case "$name" in
    project-*) continue ;;
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

# 2. .claude/agents and .claude/commands — refresh in place. Both trees are
#    wholly framework-owned, so they are replaced wholesale.
mkdir -p "$target/.claude"
for sub in agents commands; do
  if [[ -d "$src/.claude/$sub" ]]; then
    rm -rf "$target/.claude/$sub"
    cp -R "$src/.claude/$sub" "$target/.claude/$sub"
  fi
done

# 3. .agents/skills/ — namespace-scoped replace. This is the standard skills
#    location and the project may keep its own skills alongside ours, so only
#    the framework-owned namespaces (b-*, bower-*) are ever touched.
mkdir -p "$target/.agents/skills"
skills_src="$src/.agents/skills"
for d in "$skills_src"/b-* "$skills_src"/bower-*; do
  [[ -d "$d" ]] || continue
  name="$(basename "$d")"
  rm -rf "$target/.agents/skills/$name"
  cp -R "$d" "$target/.agents/skills/$name"
done

skills_pruned=()
for d in "$target"/.agents/skills/b-* "$target"/.agents/skills/bower-*; do
  [[ -d "$d" ]] || continue
  name="$(basename "$d")"
  if [[ ! -d "$skills_src/$name" ]]; then
    rm -rf "$d"
    skills_pruned+=("$name")
  fi
done

# 4. .codex/agents/ — same namespace-scoped rule, over bower-*.toml files.
mkdir -p "$target/.codex/agents"
codex_src="$src/.codex/agents"
for f in "$codex_src"/bower-*.toml "$codex_src"/b-*.toml; do
  [[ -f "$f" ]] || continue
  cp "$f" "$target/.codex/agents/$(basename "$f")"
done

codex_pruned=()
for f in "$target"/.codex/agents/bower-*.toml "$target"/.codex/agents/b-*.toml; do
  [[ -f "$f" ]] || continue
  name="$(basename "$f")"
  if [[ ! -f "$codex_src/$name" ]]; then
    rm -f "$f"
    codex_pruned+=("$name")
  fi
done

# 5. AGENTS.md — seed only if absent. A grown AGENTS.md is never edited; adding
#    the router directive to one is /b-upgrade's judgement step.
agents_action="preserved (already exists)"
if [[ ! -f "$target/AGENTS.md" ]]; then
  cp "$src/_bower/project-AGENTS.md" "$target/AGENTS.md"
  agents_action="created from _bower/project-AGENTS.md"
fi

# 6. CLAUDE.md — seed only if absent.
claude_action="preserved (already exists)"
if [[ ! -f "$target/CLAUDE.md" ]]; then
  cp "$src/_bower/project-CLAUDE.md" "$target/CLAUDE.md"
  claude_action="created from _bower/project-CLAUDE.md"
fi

# 7. .codex/config.toml — seed only if absent. The project owns it after that.
codex_config_action="preserved (already exists)"
if [[ ! -f "$target/.codex/config.toml" ]]; then
  cp "$src/_bower/project-codex-config.toml" "$target/.codex/config.toml"
  codex_config_action="created from _bower/project-codex-config.toml"
fi

# 8. .claude/settings.json — seed only if absent. The project owns it after that.
settings_action="preserved (already exists)"
if [[ ! -f "$target/.claude/settings.json" ]]; then
  cp "$src/_bower/project-settings.json" "$target/.claude/settings.json"
  settings_action="created from _bower/project-settings.json"
fi

# 9. _bower/VERSION — seed only if absent. /b-upgrade owns it from then on.
version_action="preserved (already exists, was $old_version)"
if [[ -z "$old_version" ]]; then
  cp "$src/_bower/VERSION" "$target/_bower/VERSION"
  version_action="created at $framework_version"
fi

# 10. _bower/SOURCE — seed only if absent. Used by /b-upgrade to find the
#     framework repo to clone from. Read from this repo's `origin` remote so
#     forks naturally point projects back at themselves.
source_action="preserved (already exists)"
if [[ ! -f "$target/_bower/SOURCE" ]]; then
  if remote_url="$(git -C "$src" remote get-url origin 2>/dev/null)"; then
    printf '%s\n' "$remote_url" > "$target/_bower/SOURCE"
    source_action="created ($remote_url)"
  else
    source_action="skipped (no git remote in framework repo; /b-upgrade will prompt)"
  fi
fi

# 11. Wiring check on *preserved* instruction files. Seeding-if-absent is right —
#     a grown AGENTS.md or CLAUDE.md is project-owned and this script must never
#     edit one. But preserving an unwired file silently is not: neither runtime
#     loads `_bower/framework.md`, so every gate, runtime binding and document
#     schema the skills cite is missing from the session, and the commands run
#     anyway and produce non-conformant work. For a project newly adopting Bower
#     nothing downstream repairs it either — VERSION is seeded current, so
#     /b-upgrade has no migration to walk. Name it, with the exact lines, as the
#     last thing on screen.
agents_unwired=0
if [[ "$agents_action" == preserved* ]] \
   && ! grep -qF '_bower/framework.md' "$target/AGENTS.md" \
   && ! grep -qF '_bower\framework.md' "$target/AGENTS.md"; then
  agents_unwired=1
fi
claude_missing=()
if [[ "$claude_action" == preserved* ]]; then
  grep -qF '@AGENTS.md'           "$target/CLAUDE.md" || claude_missing+=('@AGENTS.md')
  grep -qF '@_bower/framework.md' "$target/CLAUDE.md" || claude_missing+=('@_bower/framework.md')
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
echo "  .agents/skills/          refreshed (framework skills only)"
if [[ ${#skills_pruned[@]} -gt 0 ]]; then
  for name in "${skills_pruned[@]}"; do
    echo "  .agents/skills/$name  removed (retired upstream)"
  done
fi
echo "  .codex/agents/           refreshed (framework agents only)"
if [[ ${#codex_pruned[@]} -gt 0 ]]; then
  for name in "${codex_pruned[@]}"; do
    echo "  .codex/agents/$name  removed (retired upstream)"
  done
fi
echo "  AGENTS.md                $agents_action"
echo "  CLAUDE.md                $claude_action"
echo "  .codex/config.toml       $codex_config_action"
echo "  .claude/settings.json    $settings_action"
echo "  _bower/VERSION           $version_action"
echo "  _bower/SOURCE            $source_action"

echo
echo "This rewrote instruction files. Agent runtimes do not reliably reload them"
echo "mid-session — if this ran under one, start a new session before further"
echo "Bower work."

# Hint about /b-upgrade when the project was already on an older version.
if [[ -n "$old_version" && "$old_version" != "$framework_version" ]]; then
  echo
  echo "Project was at v$old_version, framework is now v$framework_version."
  echo "Run /b-upgrade in the project to apply migration notes and bump VERSION."
fi

# The wiring warning goes last, so it is what the operator is left looking at.
if [[ $agents_unwired -eq 1 || ${#claude_missing[@]} -gt 0 ]]; then
  cat <<'EOF'

================================================================================
ACTION REQUIRED — your instruction files do not reach the Bower router
================================================================================

These files already existed, so they were preserved exactly as they are — this
script never edits a project's own instruction files. What is missing below is
how a session reaches `_bower/framework.md`, and through it every gate, runtime
binding and document schema the Bower commands cite. On the runtime whose path
is broken the commands still run, and produce non-conformant work.
EOF
  if [[ $agents_unwired -eq 1 ]]; then
    cat <<'EOF'

AGENTS.md — add this paragraph near the top, as its own paragraph:

  **Before any Bower work — any `/b-*` or `$b-*` skill, any question about
  project state, any change to `docs/` — read `_bower/framework.md` in full.**
  It is the router for how this project is designed, documented, and changed;
  acting without it produces non-conformant work.

This is the whole of Codex's path to the router: AGENTS.md is the file it always
loads, and it has no include mechanism to follow.
EOF
  fi
  if [[ ${#claude_missing[@]} -gt 0 ]]; then
    echo
    echo "CLAUDE.md — add the missing include line(s), conventionally at the top:"
    echo
    for line in "${claude_missing[@]}"; do
      echo "  $line"
    done
    cat <<'EOF'

Neither line is redundant: `@AGENTS.md` pulls in the project's own instructions,
`@_bower/framework.md` loads the router. Claude Code needs both — it is the only
runtime that reads CLAUDE.md at all.
EOF
  fi
  if [[ -n "$old_version" && "$old_version" != "$framework_version" ]]; then
    cat <<'EOF'

You are mid-upgrade, so there is a better path than editing by hand: /b-upgrade's
migration step does exactly this as a gated edit, moving your own content into
place rather than overwriting it. The lines above are what it will add.
EOF
  else
    cat <<'EOF'

Nothing downstream will do this for you. This project starts at the current
framework version, so /b-upgrade has no migration to walk. Add the lines above
before your first Bower command.
EOF
  fi
  echo
fi
