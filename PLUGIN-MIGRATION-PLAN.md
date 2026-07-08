# Bower → Claude Code Plugin: migration plan (EPHEMERAL working doc)

> Scratch doc to survive a session restart. Delete once the work lands or is
> folded into `_bower/roadmap.md`. Not framework guidance; no `changes.md` entry.
> Branch: `plugin-marketplace`. Origin: `https://github.com/ANU-HDRH/bower-framework.git`.

> **STATUS (as of 2026-07-08).** Phase 1 landed on `plugin-marketplace` (commit
> `b2de60d`). The plugin is packaged (`.claude-plugin/plugin.json`), commands +
> agents moved to the repo root, and the `claude-goodies` marketplace references
> this branch. **README, contributor `CLAUDE.md`, and `docs/bower-state.svg` have
> been updated to match.** Phases 2–4 (throwaway-project proof, merge to `main`,
> per-project migration) are still open.
>
> **Naming correction:** the shipped commands **dropped** the `b-` prefix — they
> are `/bower:design`, `/bower:feature`, … (NOT `/bower:b-design`). Ignore every
> `/bower:b-*` spelling below; those predate the decision and are wrong. The
> scaffold path still emits legacy `/b-*` for the pre-plugin cohort.
>
> **`init` correction:** the init entry shipped as the `/bower:init` *command*
> (`commands/init.md`, runs `scaffold.sh --plugin`), not the `bin/bower-init`
> binary sketched in Phase 1 below.

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

### Phase 1 — add plugin packaging, change nothing else (on `plugin-marketplace`) — ✅ DONE (`b2de60d`)
- Add `.claude-plugin/plugin.json` (`name: "bower"`, `version` mirroring `_bower/VERSION`).
- Add `.claude-plugin/marketplace.json` (this repo is both marketplace and plugin;
  single entry, `"source": "."`).
- Place `scaffold.sh`/`.ps1` + a master `_bower/` where `${CLAUDE_PLUGIN_ROOT}` reaches them.
- Expose an init entry via `bin/` (e.g. `bower-init` → runs scaffold against `${CLAUDE_PROJECT_DIR}`).
- `claude plugin validate .` until clean.
- Non-destructive: pure additions on a branch.

### Phase 2 — prove it in a throwaway project (test from the BRANCH, before `main`) — ⏳ OPEN
- Marketplace can point at the branch for testing — either:
  - local path: `/plugin marketplace add /home/lingomat/innovation/bower-framework`
    with the branch checked out, OR
  - github ref: marketplace entry `{ "source": "github", "repo": "ANU-HDRH/bower-framework", "ref": "plugin-marketplace" }`.
- `/plugin install bower@bower`.
- Scratch project: run `/bower:init`, confirm it seeds `_bower/` + CLAUDE.md + VERSION + SOURCE.
- Run one real `/bower:design` end-to-end; confirm `_bower/` refs resolve and `${CLAUDE_PLUGIN_ROOT}` substitutes.
- Run `/bower:upgrade` across a version bump; confirm migration notes still apply.
- **Gate:** the sibling-command grep + fix — DONE in Phase 1 (`b2de60d` flipped all `/b-<cmd>` → `/bower:<cmd>` across `commands/`, `agents/`, `_bower/*.md`). Re-verify in the live scratch project.

### Phase 3 — publish, migrate nothing — ⏳ OPEN (merge to `main` pending)
- Merge to `main`, cut the marketplace.
- Team uses `/plugin install` for NEW projects.
- Existing important projects stay exactly as they are (in-tree tooling, untouched).
- Two cohorts run in parallel, both working.

### Phase 4 — migrate existing projects one at a time, only when chosen — ⏳ OPEN
- Per project, on a branch: install plugin, delete redundant in-tree
  `.claude/commands/b-*.md` + `.claude/agents/bower-*.md`, KEEP `_bower/`.
- Run the `/b-*` commands actually used; confirm parity.
- Merge or `git reset --hard` — fully reversible.
- Least-critical project first; important ones last, after the pattern is boring.
- Coexistence is safe meanwhile: in-tree `/b-design` and plugin `/bower:design`
  don't conflict (different namespaces).

## Open decisions (defer)
- Does a migrated project keep ANY in-tree tooling, or go pure-plugin? (Decide before Phase 4.)
- Retire `scaffold.sh` for non-plugin/air-gapped/CI consumers, or keep both paths? (Keep both = safe default.)
- Namespacing collateral: every doc/prose mention of bare `/b-foo` → `/bower:foo`.
  (DONE for README, contributor `CLAUDE.md`, and `docs/bower-state.svg`.)

## Resume checklist for next session
1. `git checkout plugin-marketplace` (this doc lives here).
2. Phase 2: install the plugin from the branch into a scratch project
   (`/plugin marketplace add ANU-HDRH/claude-goodies` → `/plugin install bower@claude-goodies`),
   run `/bower:init`, then one real `/bower:design` and a `/bower:upgrade` end-to-end.
3. Phase 3: merge `plugin-marketplace` → `main`; the marketplace ref then points at `main`.
4. Phase 4: migrate existing projects one at a time (least-critical first).
