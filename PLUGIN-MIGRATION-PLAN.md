# Bower → Claude Code Plugin: migration plan (EPHEMERAL working doc)

> Scratch doc to survive a session restart. Delete once the work lands or is
> folded into `_bower/roadmap.md`. Not framework guidance; no `changes.md` entry.
> Branch: `plugin-marketplace`. Origin: `https://github.com/ANU-HDRH/bower-framework.git`.

## Goal

Distribute Bower's tooling (the `/b-*` skills + `bower-analyst`/`bower-reviewer`
agents) as a Claude Code **plugin** served from a **marketplace** in this same
repo — so the team installs once and auto-updates, instead of cloning + running
`scaffold.sh`. Do this **without disturbing existing projects already running
Bower the old way.**

## The decisive insight (why this is low-risk)

Bower has **two payloads**:

1. **Tooling** — `.claude/commands/b-*.md`, `.claude/agents/bower-*.md`.
   Read-only. This is exactly what a plugin distributes. Auto-updates, namespaced.
2. **In-tree project state** — `_bower/` reference files, the `@_bower/framework.md`
   include in the project's `CLAUDE.md`, `_bower/VERSION`, `_bower/SOURCE`, and the
   generated `docs/` tree. This MUST live in the project working tree.

A plugin distributes payload #1 cleanly. It **cannot** distribute payload #2
(plugins can't drop loose files into the project tree; `@`-includes and the
skills' `_bower/...` references resolve against the project, not the plugin cache).

**Therefore the plugin does NOT replace scaffold/`/b-upgrade` — it replaces only
the tooling-distribution half.** Project-state seeding and per-version doc
migration still need a script + the `/b-upgrade` skill.

### Big de-risker

Skills reference `_bower/...` with **project-relative** paths, and `_bower/`
keeps being seeded into the project tree. So those references keep resolving and
the skills mostly **don't need rewriting**. The only master copies that move into
the plugin are the files `scaffold.sh` copies *from*.

### The one real code-touch risk (not yet sized)

If any skill invokes a *sibling* command as `/b-x`, that becomes `/bower:b-x`
under plugin namespacing. **TODO next session:** grep `.claude/commands` for
`/b-` invocations and fix any. (Deferred per user; do in Phase 2.)

## Division of labour after migration

- **Script (`scaffold.sh`/`.ps1`, shipped in the plugin):** all deterministic
  copying — seed `_bower/`, CLAUDE.md, VERSION, SOURCE. Sources from
  `${CLAUDE_PLUGIN_ROOT}` instead of a git clone. NO LLM in the loop.
- **`/b-upgrade` (skill):** only the irreducibly judgement-heavy part — walking
  `changes.md` migration notes and editing project `docs/`. Its file-refresh step
  changes from "clone repo + run scaffold" to "run the plugin's scaffold against
  `${CLAUDE_PLUGIN_ROOT}`".

## Phased rollout (each step reversible via git; existing projects untouched until Phase 4)

### Phase 1 — add plugin packaging, change nothing else (on `plugin-marketplace`)
- Add `.claude-plugin/plugin.json` (`name: "bower"`, `version` mirroring `_bower/VERSION`).
- Add `.claude-plugin/marketplace.json` (this repo is both marketplace and plugin;
  single entry, `"source": "."`).
- Place `scaffold.sh`/`.ps1` + a master `_bower/` where `${CLAUDE_PLUGIN_ROOT}` reaches them.
- Expose an init entry via `bin/` (e.g. `bower-init` → runs scaffold against `${CLAUDE_PROJECT_DIR}`).
- `claude plugin validate .` until clean.
- Non-destructive: pure additions on a branch.

### Phase 2 — prove it in a throwaway project (test from the BRANCH, before `main`)
- Marketplace can point at the branch for testing — either:
  - local path: `/plugin marketplace add /home/lingomat/innovation/bower-framework`
    with the branch checked out, OR
  - github ref: marketplace entry `{ "source": "github", "repo": "ANU-HDRH/bower-framework", "ref": "plugin-marketplace" }`.
- `/plugin install bower@bower`.
- Scratch project: run `bower-init`, confirm it seeds `_bower/` + CLAUDE.md + VERSION + SOURCE.
- Run one real `/bower:b-design` end-to-end; confirm `_bower/` refs resolve and `${CLAUDE_PLUGIN_ROOT}` substitutes.
- Run `/bower:b-upgrade` across a version bump; confirm migration notes still apply.
- **Gate:** do the sibling-command grep + fix here.

### Phase 3 — publish, migrate nothing
- Merge to `main`, cut the marketplace.
- Team uses `/plugin install` for NEW projects.
- Existing important projects stay exactly as they are (in-tree tooling, untouched).
- Two cohorts run in parallel, both working.

### Phase 4 — migrate existing projects one at a time, only when chosen
- Per project, on a branch: install plugin, delete redundant in-tree
  `.claude/commands/b-*.md` + `.claude/agents/bower-*.md`, KEEP `_bower/`.
- Run the `/b-*` commands actually used; confirm parity.
- Merge or `git reset --hard` — fully reversible.
- Least-critical project first; important ones last, after the pattern is boring.
- Coexistence is safe meanwhile: in-tree `/b-design` and plugin `/bower:b-design`
  don't conflict (different namespaces).

## Open decisions (defer)
- Does a migrated project keep ANY in-tree tooling, or go pure-plugin? (Decide before Phase 4.)
- Retire `scaffold.sh` for non-plugin/air-gapped/CI consumers, or keep both paths? (Keep both = safe default.)
- Namespacing collateral: every doc/prose mention of bare `/b-foo` → `/bower:b-foo`.

## Resume checklist for next session
1. `git checkout plugin-marketplace` (this doc lives here).
2. Start Phase 1: write the two manifests + `bin/` entry.
3. Run the sibling-command grep (Phase 2 gate, currently unsized).
4. `claude plugin validate .`.
