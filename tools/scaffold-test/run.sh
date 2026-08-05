#!/usr/bin/env bash
#
# Acceptance test for scripts/scaffold.sh (and scaffold.ps1 where pwsh exists).
#
#   bash tools/scaffold-test/run.sh
#
# Zero dependencies beyond coreutils, exits non-zero on failure.
# scripts/release.sh runs it, so a release cannot be cut with a scaffold that
# clobbers project-owned files or leaves a half-written footprint behind.
#
# WHAT THIS IS FOR. The scaffold is the only thing in the framework that writes
# into somebody else's repository, and three of its properties are the sort that
# break silently:
#
#   - Seed-if-absent. A regression here overwrites a project's grown AGENTS.md
#     or CLAUDE.md, and the project only finds out by reading a diff it did not
#     expect.
#   - Namespace-scoped replace. .agents/skills/ is the standard skills location,
#     not ours alone. Widening the prune from `b-*`/`bower-*` to everything
#     would delete a project's own skills.
#   - Preflight. Some runtimes mount .agents/ and .codex/ read-only and fail the
#     write outright with no approval prompt. Without the preflight, a run under
#     one of those refreshes _bower/ and .claude/ and then dies, leaving the
#     runtime adapters on different framework versions — the exact split
#     footprint the check exists to prevent.
#
# Each case below runs the real script against a real temp directory. Nothing is
# mocked; the assertions are about the resulting tree.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCAFFOLD="$REPO_ROOT/scripts/scaffold.sh"
SCAFFOLD_PS1="$REPO_ROOT/scripts/scaffold.ps1"

checks=0
failures=0
TMPDIRS=()

cleanup() {
  for d in ${TMPDIRS+"${TMPDIRS[@]}"}; do
    [[ -n "$d" && -d "$d" ]] || continue
    chmod -R u+w "$d" 2>/dev/null || true
    rm -rf "$d"
  done
}
trap cleanup EXIT

mktarget() {
  local d
  d="$(mktemp -d)"
  TMPDIRS+=("$d")
  printf '%s\n' "$d"
}

pass() { checks=$((checks + 1)); echo "  ✓ $1"; }
fail() {
  failures=$((failures + 1))
  echo "  ✗ $1" >&2
  [[ $# -lt 2 ]] || echo "      $2" >&2
}
assert() {
  if [[ "$1" == "0" ]]; then pass "$2"; else fail "$2" "${3:-}"; fi
}
assert_exists() {
  [[ -e "$1" ]] && pass "$2" || fail "$2" "missing: $1"
}
assert_absent() {
  [[ ! -e "$1" ]] && pass "$2" || fail "$2" "unexpectedly present: $1"
}
assert_same() {
  if cmp -s "$1" "$2"; then pass "$3"; else fail "$3" "differs: $1 vs $2"; fi
}
assert_contains() {
  if grep -qF -- "$2" <<<"$1"; then pass "$3"; else fail "$3" "output did not contain: $2"; fi
}

sha() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$@"
  else shasum -a 256 "$@"
  fi
}

# A tree snapshot: every path (files and dirs), plus a content hash per file.
# Used to prove idempotence and, in the preflight case, that nothing was written.
# $2 = 'norm' strips CR before hashing, for the bash-vs-PowerShell comparison.
snapshot() {
  local root="$1" mode="${2:-}" f
  ( cd "$root" && find . -mindepth 1 | LC_ALL=C sort )
  ( cd "$root" && find . -type f -print0 | LC_ALL=C sort -z | while IFS= read -r -d '' f; do
      if [[ "$mode" == "norm" ]]; then
        printf '%s  %s\n' "$(tr -d '\r' < "$f" | sha | cut -d' ' -f1)" "$f"
      else
        printf '%s  %s\n' "$(sha < "$f" | cut -d' ' -f1)" "$f"
      fi
    done )
}

run_scaffold() { # stdout+stderr captured into $OUT, status into $STATUS
  OUT="$("$SCAFFOLD" "$1" 2>&1)"
  STATUS=$?
}

FRAMEWORK_VERSION="$(tr -d '[:space:]' < "$REPO_ROOT/_bower/VERSION")"

echo "scaffold-test — framework v$FRAMEWORK_VERSION"

# ─────────────────────────────────────────────────────────── 1. fresh install

echo
echo "1. fresh install seeds the full footprint"

T1="$(mktarget)"
run_scaffold "$T1"
assert "$STATUS" "exits 0" "$OUT"

assert_exists "$T1/_bower/framework.md"           "  _bower/ copied"
assert_exists "$T1/_bower/viewer/lib/extract.cjs" "  _bower/ subdirectories copied"
assert_exists "$T1/.claude/commands/b-feature.md" "  .claude/commands/ copied"
assert_exists "$T1/.claude/agents/bower-analyst.md" "  .claude/agents/ copied"
assert_exists "$T1/.agents/skills/b-feature/SKILL.md" "  .agents/skills/b-*/ copied"
assert_exists "$T1/.codex/agents/bower-analyst.toml"  "  .codex/agents/bower-*.toml copied"

assert_same "$T1/AGENTS.md"          "$REPO_ROOT/_bower/project-AGENTS.md"        "  AGENTS.md seeded from template"
assert_same "$T1/CLAUDE.md"          "$REPO_ROOT/_bower/project-CLAUDE.md"        "  CLAUDE.md seeded from template"
assert_same "$T1/.codex/config.toml" "$REPO_ROOT/_bower/project-codex-config.toml" "  .codex/config.toml seeded from template"
assert_same "$T1/.claude/settings.json" "$REPO_ROOT/_bower/project-settings.json" "  .claude/settings.json seeded from template"

# The CLAUDE.md shim must keep both includes: Codex follows AGENTS.md's pointer,
# Claude Code needs the router include to guarantee the router is loaded.
shim="$(cat "$T1/CLAUDE.md")"
assert_contains "$shim" "@AGENTS.md"           "  CLAUDE.md shim includes AGENTS.md"
assert_contains "$shim" "@_bower/framework.md" "  CLAUDE.md shim includes the router"
agents_md="$(cat "$T1/AGENTS.md")"
assert_contains "$agents_md" '_bower/framework.md' "  AGENTS.md points at the router"

# Templates are seeded out, never copied in.
for tpl in project-AGENTS.md project-CLAUDE.md project-settings.json project-codex-config.toml; do
  assert_absent "$T1/_bower/$tpl" "  _bower/$tpl not copied into the project"
done

assert "$([[ "$(tr -d '[:space:]' < "$T1/_bower/VERSION")" == "$FRAMEWORK_VERSION" ]] && echo 0 || echo 1)" \
  "  _bower/VERSION seeded at $FRAMEWORK_VERSION"

assert_contains "$OUT" "start a new session" "  summary warns about stale instruction files"

# ─────────────────────────────────────────────────────────── 2. idempotence

echo
echo "2. a second run changes nothing"

before="$(snapshot "$T1")"
run_scaffold "$T1"
assert "$STATUS" "exits 0" "$OUT"
after="$(snapshot "$T1")"
if [[ "$before" == "$after" ]]; then
  pass "  tree is byte-identical after a second run"
else
  fail "  tree is byte-identical after a second run" \
    "$(diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") | head -20)"
fi
assert_contains "$OUT" "preserved (already exists)" "  seeds report as preserved"

# ────────────────────────────────────────────── 3. project-owned files survive

echo
echo "3. grown project-owned files are never edited"

T3="$(mktarget)"
printf '# My project\n\nHand-written.\n' > "$T3/AGENTS.md"
printf '@AGENTS.md\n\nHand-written too.\n'  > "$T3/CLAUDE.md"
mkdir -p "$T3/.codex"
printf 'sandbox_mode = "read-only"\n' > "$T3/.codex/config.toml"
mkdir -p "$T3/.claude"
printf '{"permissions":{"allow":[]}}\n' > "$T3/.claude/settings.json"
mkdir -p "$T3/docs/modules/thing"
printf '# Thing\n' > "$T3/docs/modules/thing/module-status.md"

a_before="$(cat "$T3/AGENTS.md")"
c_before="$(cat "$T3/CLAUDE.md")"
x_before="$(cat "$T3/.codex/config.toml")"
s_before="$(cat "$T3/.claude/settings.json")"
d_before="$(snapshot "$T3/docs")"

run_scaffold "$T3"
assert "$STATUS" "exits 0" "$OUT"

assert "$([[ "$a_before" == "$(cat "$T3/AGENTS.md")" ]] && echo 0 || echo 1)"  "  grown AGENTS.md untouched"
assert "$([[ "$c_before" == "$(cat "$T3/CLAUDE.md")" ]] && echo 0 || echo 1)"  "  grown CLAUDE.md untouched"
assert "$([[ "$x_before" == "$(cat "$T3/.codex/config.toml")" ]] && echo 0 || echo 1)" "  existing .codex/config.toml untouched"
assert "$([[ "$s_before" == "$(cat "$T3/.claude/settings.json")" ]] && echo 0 || echo 1)" "  existing .claude/settings.json untouched"
assert "$([[ "$d_before" == "$(snapshot "$T3/docs")" ]] && echo 0 || echo 1)"  "  docs/ untouched"

# ───────────────────────────────────────── 4. namespace-scoped replace + prune

echo
echo "4. only the framework namespaces are replaced or pruned"

mkdir -p "$T1/.agents/skills/my-skill"
printf -- '---\nname: my-skill\n---\nMine.\n' > "$T1/.agents/skills/my-skill/SKILL.md"
mkdir -p "$T1/.agents/skills/b-old"
printf -- '---\nname: b-old\n---\nRetired.\n' > "$T1/.agents/skills/b-old/SKILL.md"
printf 'name = "my-agent"\n'    > "$T1/.codex/agents/my-agent.toml"
printf 'name = "bower-old"\n'   > "$T1/.codex/agents/bower-old.toml"
printf 'notes\n'                > "$T1/.agents/skills/README.md"

run_scaffold "$T1"
assert "$STATUS" "exits 0" "$OUT"

assert_exists "$T1/.agents/skills/my-skill/SKILL.md" "  a project's own skill survives"
assert_exists "$T1/.agents/skills/README.md"         "  a non-skill file in .agents/skills/ survives"
assert_exists "$T1/.codex/agents/my-agent.toml"      "  a project's own Codex agent survives"
assert_absent "$T1/.agents/skills/b-old"             "  a retired b-* skill is pruned"
assert_absent "$T1/.codex/agents/bower-old.toml"     "  a retired bower-*.toml agent is pruned"
assert_contains "$OUT" ".agents/skills/b-old  removed (retired upstream)"  "  the pruned skill is named in the summary"
assert_contains "$OUT" ".codex/agents/bower-old.toml  removed (retired upstream)" "  the pruned agent is named in the summary"

# A framework skill is replaced wholesale, so a stale file inside one goes too.
printf 'stale\n' > "$T1/.agents/skills/b-feature/STALE.md"
run_scaffold "$T1"
assert_absent "$T1/.agents/skills/b-feature/STALE.md" "  stale files inside a framework skill are replaced away"

# ─────────────────────────────────────────────────── 5. preflight, zero writes

echo
echo "5. an unwritable managed path aborts before any write"

if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
  echo "  ! running as root — chmod cannot make a path unwritable; case skipped" >&2
else
  T5="$(mktarget)"
  mkdir -p "$T5/.agents"
  printf 'keep me\n' > "$T5/marker.txt"
  chmod a-w "$T5/.agents"

  p_before="$(snapshot "$T5")"
  run_scaffold "$T5"
  p_after="$(snapshot "$T5")"
  chmod u+w "$T5/.agents"

  assert "$([[ "$STATUS" -eq 1 ]] && echo 0 || echo 1)" "  exits 1" "status was $STATUS"
  assert_contains "$OUT" ".agents/skills"      "  names the unwritable path"
  assert_contains "$OUT" "Nothing was written" "  says nothing was written"
  assert_contains "$OUT" "scripts/scaffold.sh" "  hands over the exact command to run outside the sandbox"
  if [[ "$p_before" == "$p_after" ]]; then
    pass "  zero writes — the target is unchanged"
  else
    fail "  zero writes — the target is unchanged" \
      "$(diff <(printf '%s\n' "$p_before") <(printf '%s\n' "$p_after") | head -20)"
  fi
  assert_absent "$T5/_bower" "  _bower/ was not partially refreshed"
  assert_absent "$T5/.claude" "  .claude/ was not partially refreshed"
fi

# ───────────────────────────────────────────────────────── 6. PowerShell parity

echo
echo "6. scaffold.ps1 produces the same tree"

PWSH=""
for c in pwsh powershell; do
  if command -v "$c" >/dev/null 2>&1; then PWSH="$c"; break; fi
done

if [[ -z "$PWSH" ]]; then
  echo "  ! no pwsh/powershell on PATH — parity case skipped (run it on a box that has one)" >&2
else
  T6BASH="$(mktarget)"
  T6PS="$(mktarget)"
  "$SCAFFOLD" "$T6BASH" >/dev/null 2>&1
  ps_status=0
  "$PWSH" -NoProfile -File "$SCAFFOLD_PS1" "$T6PS" >/dev/null 2>&1 || ps_status=$?
  assert "$ps_status" "  scaffold.ps1 exits 0"

  # Compare paths and content, normalising line endings — PowerShell writes
  # SOURCE through Set-Content, whose terminator is platform-dependent.
  b_snap="$(snapshot "$T6BASH" norm)"
  p_snap="$(snapshot "$T6PS" norm)"
  if [[ "$b_snap" == "$p_snap" ]]; then
    pass "  bash and PowerShell trees match"
  else
    fail "  bash and PowerShell trees match" \
      "$(diff <(printf '%s\n' "$b_snap") <(printf '%s\n' "$p_snap") | head -30)"
  fi
fi

# ────────────────────────────────────────────────────────────────────── result

echo
if [[ "$failures" -eq 0 ]]; then
  echo "scaffold-test: $checks checks passed."
  exit 0
fi
echo "scaffold-test: $failures failed, $checks passed." >&2
exit 1
