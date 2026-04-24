# Process Flow Improvements — Change Proposal

**Status:** Implemented in Bower v0.6
**Scope:** Tighten the flow from `/bower-design` through first implementation, and add fresh-session orientation.

## Motivation

First real use of Bower v0.5 on a greenfield project surfaced five gaps:

1. `/bower-design-full` ends with a file summary and no explicit next step; the agent improvised an unclear choice between "build a feature" and "build a module." or which in particular is suggested to start with.
2. `/bower-feature` is the only implementation entry point. For simple projects where the design *is* the plan, feature-at-a-time gating adds friction without adding review value.
3. Feature build order within a module isn't persisted anywhere, so "what's next?" is ambiguous when multiple features sit at ⏸.
4. Project scaffolding (package manifest, README, linter config, `.gitignore`) has no home in the flow — it happens ad hoc during the first feature, or not at all.
5. Fresh-session orientation ("where am I, what's next?") requires the user to read several docs and synthesise manually. The information exists; the synthesis doesn't.

The information needed to fix 3 and 5 already exists in the Stage 4 output — it's just not captured in a way a future session can use directly.

## Summary of changes

| # | Change | Affected files |
|---|---|---|
| 1 | Harden `/bower-design` routing: greenfield ⇒ Full Design is required, not recommended | `.claude/commands/bower-design.md` |
| 2 | Add Stage 5 (Scaffolding) to `/bower-design-full` | `.claude/commands/bower-design-full.md` |
| 3 | Add explicit post-design handoff with next-step + commit suggestion | `.claude/commands/bower-design-full.md` |
| 4 | Persist feature build order in `module-status.md` | `.claude/commands/bower-design-full.md`, `CLAUDE.md` |
| 5 | Add `/bower-module` command for whole-module build | `.claude/commands/bower-module.md` (new) |
| 6 | Add `/bower-recap` command for read-only orientation | `.claude/commands/bower-recap.md` (new) |

Each is detailed below.

---

## 1. Harden the `/bower-design` router

**Current behaviour:** `/bower-design` presents Full vs. Lightweight as a choice with a recommendation. A new project with no `docs/architecture.md` gets "recommend Full Design" but the user can still pick Lightweight.

**Proposed:** If no `docs/architecture.md` exists, treat this as a **hard gate** — Full Design is required, not offered as a choice. The router states the situation and proceeds to `/bower-design-full` without `AskUserQuestion`. Lightweight is only a valid option when architecture already exists.

**Rationale:** Lightweight Change reads architecture/index/scope as its first step. If those don't exist, the workflow has no foundation. Offering the choice invites the user to skip design on exactly the projects that need it most.

**Scope:** The gate is greenfield-only. For existing projects the current recommend-with-choice behaviour is unchanged.

---

## 2. Stage 5: Scaffolding (new)

**Goal:** Produce a runnable project skeleton aligned with Stage 2's technology decisions, before any feature work.

**Process:**

1. Based on confirmed architecture and decisions, identify the scaffolding actions needed:
   - Package manifest (`package.json`, `pyproject.toml`, `Cargo.toml`, etc.)
   - `README.md` — generate a project-specific README from scope + architecture. If a stock README exists (e.g. from `create-*` tooling or framework adoption), archive it under `_bower/` rather than overwrite.
   - `.gitignore` appropriate to the stack
   - Linter/formatter config per Stage 2 decisions
   - Test runner setup per the testing approach in `constitution.md`
   - Directory skeleton matching the module breakdown (empty module folders with placeholder `module-status.md`)

2. Present the scaffolding plan via `AskUserQuestion`: list of actions, each marked *create* / *modify* / *archive*. Recommend defaults; let the user strike items.

3. After confirmation, execute the plan.

**Gate:** Scaffolding plan is presented and confirmed before execution.

**Why inside `/bower-design-full` rather than a separate `/bower-scaffold`:** Stage 2's tech decisions need to be fresh in context; a separate command would re-read everything. Scaffolding is a design output, not implementation.

---

## 3. Post-design handoff

**Current:** Stage 4 writes files and ends with "present a summary of files created/updated." Nothing tells the user (or the agent in a fresh session) what to do next.

**Proposed:** After Stage 5 completes, emit an explicit handoff block:

```
Design and scaffolding complete.

Suggested commit point — stage the design docs and scaffolding:

  <proposed commit message>

Next move:
  - Start with module: <first module in build order>
  - Recommended command: /bower-module <name>   (build entire module)
                     or: /bower-feature <first feature>  (one feature at a time)

Run /bower-recap any time to re-orient.
```

The handoff is advisory — it does not execute the commit. The "recommended command" picks one based on module size: if the module has ≤3 features and no unresolved design ambiguity, recommend `/bower-module`; otherwise `/bower-feature`.

---

## 4. Feature build order in `module-status.md`

**Current:** `module-status.md` budget is ~200 words, described as "integration testing notes" and agent-owned. No schema for build order.

**Proposed:** Add a `## Build order` section, populated by Stage 4 of `/bower-design-full` and maintained by `/bower-module` / `/bower-feature` as features progress.

Schema:

```markdown
## Build order

1. <feature-name> — ✓ | 🚧 | ⏸ | 🟡 | 🔴 | 🔧
2. <feature-name> — ⏸
3. <feature-name> — ⏸
```

Order is determined by intra-module dependencies (identified during Stage 4 planning — this is architectural thinking, which is why it belongs at design time, not implementation time). Items may be reordered when a plan changes, but reorderings should be rare.

**Budget impact:** Build order adds maybe 30–60 words to `module-status.md`; total budget bumps to ~250 words. Update `CLAUDE.md` accordingly.

---

## 5. `/bower-module` (new command)

**Purpose:** Build all features in a module in one pass, with one gate up front and one acceptance pass at the end.

**When to use:** Module is small (≤3–4 features), features are well-specified in Stage 4, no architectural ambiguity.

**When NOT to use:** Large module, exploratory features, features that will likely need mid-flight design revision — use `/bower-feature` for those.

**Flow:**

1. Read `docs/architecture.md`, `docs/scope.md`, module's `module-status.md`
2. For each feature in the module's build order, draft a brief plan (what files, what tests, what acceptance criteria)
3. Present the combined proposal via `AskUserQuestion`: feature list, per-feature acceptance criteria, integration test at module boundary
4. On confirmation, implement feature-by-feature, creating `plan.md` and `status.md` per feature as built
5. Run the module-level integration test
6. Update `module-status.md` build-order markers as each feature completes; update `index.md` at the end

**Gate contract:** one up-front gate covers all features in the module plus the integration test. If an in-flight feature reveals the plan was wrong, stop and re-gate (same rule as `/bower-feature`).

---

## 6. `/bower-recap` (new command)

**Purpose:** Read-only, advisory orientation. Answers "where am I, what's next?" in a fresh session.

**Inputs (read-only, never modifies):**
- `docs/index.md`
- `docs/scope.md` (unmet success criteria)
- `docs/modules/**/module-status.md` (build order + status)
- `docs/modules/**/<feature>/status.md` for any 🚧 features

**Output:** A short block, structured:

```
Project: <name>
Scope: <1-line summary from scope.md>

Progress:
  - Module A: ✓ complete
  - Module B: 🚧 2 of 4 features built
  - Module C: ⏸ not started

Currently in progress:
  - <module>/<feature> — <one-line state from status.md>

Recommended next action:
  - <concrete next step, derived from build order>

Open questions / blockers:
  - <any flagged in status.md>
```

**Strictly read-only.** The command does not write, does not commit, does not ask clarifying questions. It's a dashboard.

**Relationship to `docs/index.md`:** `/bower-recap` complements but does not replace `/bower-index`. `/bower-index` regenerates `index.md` from current state (writes). `/bower-recap` synthesises next-step guidance without writing anything.

---

## Interactions and open questions

- **Stage 5 in existing projects:** When `/bower-design-full` is run on an existing project (architectural revision), Stage 5 should detect existing scaffolding and only propose delta — do not recreate `package.json` if one exists. Needs a clear "scaffolding already present, skipping" path.
- **Build order conflicts:** If a user wants to work on a later feature before an earlier one, should `/bower-feature <name>` Warn but allow proceed-anyway. Hard-blocking is wrong.
- **`/bower-module` partial failure:** If feature 2 of 3 fails acceptance, the module is in a half-built state. `status.md` for the failed feature captures it, `module-status.md` build-order markers reflect reality, `/bower-recap` will surface it cleanly. No special recovery flow needed.
- **README archival path:** Proposed `_bower/original-README.md` for archived stock READMEs. Needs confirmation. When writing a fresh project README, the agent should inject a brief section about the Bower framework and link to the default README (which should have be mobed) in `_bower/`.

## Non-goals for this change

- No changes to `/bower-spec` or `/bower-index`.
- No changes to the three-layer documentation model.
- No changes to `status.md` / `plan.md` schemas beyond what's listed.
- No automated commits — all commit suggestions remain advisory.

## Rollout

These are framework-level changes to the commands themselves. No migration needed for existing projects — new commands are additive, modified commands (`bower-design`, `bower-design-full`) change behaviour only for new runs.

Suggested implementation order:

1. Change 4 (build order schema) — foundational for 5 and 6
2. Change 1 (router hard gate) — small, isolated
3. Change 2 + 3 (Stage 5 + handoff) — together, same file
4. Change 5 (`/bower-module`) — depends on 4
5. Change 6 (`/bower-recap`) — depends on 4

Each step is independently reviewable.
