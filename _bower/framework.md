# Bower Framework v0.16

This project uses the Bower AI-assisted development pattern. Bower optimises for small-team research velocity across the full prototype-to-infrastructure lifecycle.

## Core Principles

- **Planning before building** — Design and document before implementing. Avoid vibe coding.
- **Living documentation** — All docs represent current state, not history. Update in place; git is the change log.
- **Feature modules** — Group related features into modules that persist as system boundaries post-MVP.
- **AI-readable context** — Structure documentation for discoverability by AI agents and humans alike.

**Module definition:** A module is a set of features that share data concerns and can be meaningfully integration-tested together. Data concerns are the underlying property; shared integration tests are the observable consequence. If two feature sets don't share data and don't warrant a shared integration test, they belong in separate modules. Each module's boundary rationale — its purpose, the data concern that justifies the seam, constituent features, and inter-module dependencies — is recorded in `architecture.md` under `## Software architecture`.

## Navigation

- **Start here:** `docs/index.md` — Auto-generated project state and navigation
- **Current boundary:** `docs/scope.md` — What's in scope now, what's deferred, success criteria met/unmet
- **Process conventions:** `docs/constitution.md` — How to contribute, plan, and update documentation
- **System design:** `docs/architecture.md` — Runtime view (topology, components, data flow, stack) plus a `## Software architecture` section listing each Bower module's boundary rationale
- **Experience surface:** `docs/ui.md` — Current state of the UI: navigation map, screen inventory, layout grammar, interaction patterns. Surface-agnostic (web, TUI, desktop, mobile). Created lazily when UI work begins; absent in projects without one.
- **Design context:** `docs/design/problem-space.md` — Day-1 framing of the problem (created during full design)
- **Decision log:** `docs/adr/` — Architectural Decision Records, indexed by `docs/adr/index.md` (created when the first decision is recorded)
- **Reference material:** `docs/reference/` — Vendored external docs for agent lookup (optional; created when needed)

## Document Layers

Bower splits documentation into three layers by *audience* and *style*, not by directory. Design-layer docs are narrative and human-primary; operational-layer docs are terse, bulleted, and agent-primary; reference-layer docs are external or vendored material consulted during implementation. Word budgets apply only to operational volatile docs.

| Document | Layer | Primary audience | Ownership | Style | Budget |
|---|---|---|---|---|---|
| `docs/architecture.md` | design | human | co-authored | narrative | — |
| `docs/ui.md` | design | both | co-authored | narrative + lists | — |
| `docs/design/problem-space.md` | design | human | human-owned | narrative | — |
| `docs/adr/NNNN-*.md` | design | both | append-only body, mutable status | structured (frontmatter + two required sections, two optional) | ~150 words |
| `docs/adr/index.md` | design | both | agent-generated | tables | — |
| `docs/constitution.md` | design | human | human-owned | narrative | — |
| `docs/scope.md` | design | human | co-authored | narrative | — |
| `docs/modules/**/plan.md` | operational | agent | co-authored | terse bullets / tables | — |
| `docs/modules/**/status.md` | operational | agent | agent-owned | terse bullets | ~150 words |
| `docs/modules/**/module-status.md` | operational | agent | agent-owned | terse bullets | ~250 words |
| `docs/index.md` | operational | agent | agent-owned | tables | — |
| `docs/reference/**` | reference | agent | external/vendored | as-delivered | — |

**Ownership semantics:** *human-owned* docs may be drafted by the agent during full design, but must not be rewritten unprompted afterwards. *Co-authored* docs are agent-updated in place as changes land, human-reviewed and edited freely. *Agent-owned* docs are routinely maintained by the agent. *External/vendored* material is treated as read-only — consult it, don't edit it; refresh by re-vendoring. *ADR bodies* are immutable once accepted — only frontmatter (status, supersession links) is updated; new decisions go in new ADRs.

## Documentation Structure

```
docs/
├── index.md                          # Navigation and project state
├── scope.md                          # Current scope, non-goals, success criteria
├── constitution.md                   # Process conventions (reusable)
├── architecture.md                   # System design: runtime view + `## Software architecture` (per-module boundary rationale); cross-references ADRs
├── ui.md                             # Experience surface: navigation, screens, layout grammar, interaction patterns (created when UI work begins)
├── design/                           # Day-1 framing
│   └── problem-space.md
├── adr/                              # Architectural Decision Records
│   ├── index.md                      # Schema reference + decision index (regenerated by /b-index)
│   └── NNNN-kebab-title.md           # One file per decision; body immutable once accepted
├── reference/                        # Vendored external docs for lookup (optional)
└── modules/
    └── <module-name>/
        ├── <feature-name>/
        │   ├── plan.md               # How it works, components, testing, trajectory
        │   └── status.md             # Resumption snapshot
        └── module-status.md          # Integration testing notes
```

## Status Markers

Used in `index.md` and `status.md` files:

| Marker | Meaning |
|--------|---------|
| ✓ | Complete and stable |
| 🚧 | In active development |
| ⏸ | Planned but not started |
| 🟡 | Complete with known issues |
| 🔴 | Broken or degraded |
| 🔧 | Under revision/refactor |

## status.md — Resumption Framing

`status.md` answers one question: *if I picked this up tomorrow, what's the state and what's the next move?* Current state in a short paragraph or bullets; next move explicit; open issues only if they affect resumption. No history, no changelog, no solved-issue residue. Bug backlog belongs in the external tracker, not here. Budget ~150 words — over budget is a signal to compress, not to split.

If any acceptance criterion agreed at the gate has not yet been verified (typically manual checks the user deferred), include a `Pending verification:` line listing those checks. Empty or omitted means fully verified. A feature with pending verification is marked 🚧 in `module-status.md`, not ✓.

## module-status.md — Integration and Build Order

`module-status.md` captures three things: the module-boundary integration test (its location and status), the build order of features within the module, and any free-form integration notes. Build order and the module-integration placeholder are populated during full design (Stage 4) and maintained as features progress.

Module-integration schema:

```markdown
## Module integration

Test: <path or "not yet defined"> — ✓ | 🚧 | ⏸ | 🟡 | 🔴
Notes: <one-line behavioural rationale carried forward from Stage 4>
```

Only `/b-integration` (or `/b-module`'s in-pass integration step) flips this marker. `/b-feature` may refresh `Notes:` when a feature shifts what the integration test will need to assert, but does not touch the marker.

Build-order schema:

```markdown
## Build order

1. <feature-name> — ✓ | 🚧 | ⏸ | 🟡 | 🔴 | 🔧
2. <feature-name> — ⏸
3. <feature-name> — ⏸
```

Order reflects intra-module dependencies identified at design time. Reorderings should be rare and driven by a genuine plan change, not preference. `/b-feature` and `/b-module` update build-order markers as features complete. Budget ~250 words total.

**Module-level status is a floor, not a sum.** `/b-index` derives a module's status as the worst across both feature markers and the module-integration marker. A module with all features ✓ but `## Module integration` still ⏸ surfaces as 🚧 — making the constitution's verified-for-✓ rule observable rather than aspirational.

## ADRs — Architectural Decision Records

`docs/adr/` is the project's decision log. One file per decision, named `NNNN-kebab-case-title.md` with a zero-padded four-digit ID. IDs are immutable and never reused, even if a decision is later superseded; gaps are fine. ADRs cover any **cross-cutting commitment** — a choice that constrains more than one feature and would surprise a future reader if not written down (technology choices, data-flow patterns, contract decisions, operational constraints). Single-feature implementation detail belongs in that feature's `plan.md`, not in an ADR.

**Frontmatter schema:**

```yaml
---
id: ADR-NNNN
title: <Title>
status: accepted | superseded | deprecated
date: YYYY-MM-DD
modules: [<bower-module-name>, ...]   # omit entirely for cross-cutting decisions
supersedes: [ADR-NNNN, ...]           # omit if empty
superseded-by: [ADR-NNNN, ...]        # omit if empty
---
```

`modules` references **exact Bower module names** (the directory names under `docs/modules/`). Omit the field entirely for cross-cutting decisions; do not use sentinels.

**Body:** two required sections (`## Context`, `## Decision`) and two optional (`## Consequences` when there's a non-obvious cost or ongoing burden not already implied by the Decision; `## Alternatives considered` when real alternatives were weighed). Order is fixed when sections are present. A good ADR is **~150 words** and rarely over 300. ADRs may bundle several closely-related decisions under one coherent umbrella title — the split test is whether the title honestly covers the scope, not whether more than one commitment is named in the body. If the title would have to be "X and also Y," that's two ADRs.

**Lifecycle rules.** ADR bodies are **immutable once accepted**. Reversals are not edits — write a new ADR with `supersedes: [ADR-NNNN]` and update the old ADR's frontmatter (`status: superseded`, `superseded-by: [ADR-NNNN]`). Both files in one commit. Partial supersession (a new decision scopes an exception to an old one) is handled by writing a new ADR and *not* marking the old one superseded — both remain `accepted`, with the relationship described in the new ADR's body.

**Access pattern.** `docs/adr/index.md` is the canonical entry point — it's the schema reference and the navigable index, regenerated from frontmatter by `/b-index`. Read the index first; open individual ADRs only when one is relevant to the current change. Do not grep frontmatter directly — schema evolution would break searches; the index absorbs that change. Filter by **status: accepted** for "what's true now"; older statuses are historical.

**Code is truth, ADR is hypothesis.** An `accepted` ADR records what the project *decided*, not necessarily what the code currently *does*. Libraries get swapped, flags get removed, decisions drift from reality. If an ADR names a specific library, file, or flag and the current code contradicts it, the ADR is the stale one — flag it and supersede, do not silently trust it. This is the same posture as the memory system's verify-before-relying rule: read ADRs as constraints to confirm, not as ground truth to act on.

**When to write a new ADR.** During `/b-design` Stage 2, every major decision gets an ADR. During `/b-feature` or `/b-module` reconcile, if the change introduced or invalidated a cross-cutting decision, write or supersede an ADR before closing the change. Don't pre-emptively write ADRs for decisions that haven't been made; don't retroactively backfill historical decisions unless the project is migrating from `design-decisions.md`.

## Implementation Trajectory (multi-session features)

Multi-session features maintain an `## Implementation trajectory` section in `plan.md`. As each phase completes, its description is rewritten in place as a one-paragraph précis of *why* that direction was taken — not the steps, which are in git. Current and future phases stay detailed. Single-session features skip the section entirely.

## Reference Material

Two kinds of persistent reference material have a home in Bower:

- **Vendored external docs** (e.g. LLM-friendly framework indexes) live in `docs/reference/`. Create the directory only when needed. Treat contents as read-only; refresh by re-vendoring.
- **Out-of-tree source references** (e.g. a sibling prototype treated as a behavioural oracle) are pointed to from `docs/constitution.md` under working conventions, with the rationale for the pointer logged as an ADR in `docs/adr/`. The material itself stays where it lives on disk.

Reference material is consulted during implementation but never synthesised into project docs — if insight from it needs to persist, it belongs in `plan.md` or in an ADR, not copied into `docs/reference/`.

## What to Update When

| Change Type | plan.md | status.md | module-status.md | scope.md | index.md | architecture.md | ui.md | adr/ |
|-------------|---------|-----------|------------------|----------|----------|-----------------|-------|------|
| Bug fix | Maybe | Yes | — | — | — | — | — | — |
| Feature (existing) | Yes | Yes | Maybe | Maybe | — | — | Maybe | Maybe |
| New component | Create | Create | Yes | Maybe | Yes | — | Maybe | Maybe |
| New module | Create | Create | Create | Maybe | Yes | Yes | Maybe | Maybe |
| Architecture change | Yes | — | Maybe | Maybe | — | Yes | Maybe | Yes |
| UI change (structural) | Maybe | Maybe | — | — | — | — | Yes | Maybe |
| UI change (visual only) — *no doc update; git is the undo* | — | — | — | — | — | — | — | — |
| Scope shift / criterion closed | — | — | — | Yes | — | — | — | — |
| Cross-cutting decision changed | — | — | — | — | — | Maybe | Maybe | Yes |

## Working Conventions

**Before touching any component:** Read its `plan.md` first — it contains purpose, source file locations, and integration points. Don't search the codebase when the map exists.

**Changes made outside `/b-*` commands.** The `/b-feature`, `/b-module`, and `/b-design` skills bake in a reconcile step that updates docs in step with the change. When a change happens by direct request rather than through a skill — ad-hoc edits, "fix this bug", "tweak how X works" — apply the same reconcile yourself before declaring the change complete:

- **Code change inside a feature** → update that feature's `status.md` to reflect current state and any pending verification. If the change shifted behaviour, components, or testing strategy, update `plan.md` too.
- **Bug fix** → `status.md` is usually enough.
- **UI change (visual / non-structural)** — move an icon, tweak colour, adjust spacing, change copy → just do it; no doc update; `git` is the undo button. See *UI Changes — Paths and the Gate* below.
- **UI change (structural, well-specified)** — the operator named a specific shape ("add a logout item that opens a confirm modal") → just do it; reconcile `docs/ui.md` and any affected feature `plan.md`. Same shape as the rest of this list.
- **UI change (structural with branching choices)** — operator named a goal without a shape ("add tab navigation"), ≥2 viable shapes exist → soft-redirect to `/b-ui`. The gate exists to commit to options.
- **Cross-cutting decision introduced or invalidated** → run `/b-adr` to record or supersede. Don't bury a cross-cutting decision in a feature's `plan.md`.
- **New feature appearing in code** → surface this and recommend `/b-feature add`. A new feature deserves the propose-and-confirm gate.
- **Architecture, module structure, or scope affected** → stop and redirect to `/b-design`. Architectural changes must go through the gate. UI work that crosses into architectural territory (swapping the UI framework, introducing a new top-level navigation pattern, adopting new state management) is hard-redirected here, not soft-redirected to `/b-ui`.

The redirect is *soft* for features, decisions, and bug fixes — surface what's happening, recommend the skill, and proceed with the reconcile above if the user confirms ad-hoc is the right call. The redirect for architectural changes is *hard*: refuse to make them ad-hoc even on user instruction, name what makes the change architectural, and recommend `/b-design`. The architectural gate is the reason a project adopted Bower; honouring it is the framework's job, not the operator's discipline. The reasoning for this split lives in `_bower/rationale.md` under "Holding the Line on Architecture."

**Testing:** End-to-end tests for pipelines and workflows, integration tests at module boundaries, unit tests for complex logic. Generate tests alongside implementation when the plan is clear. Project-specific test location, fixtures, runner commands, and verification-required-for-✓ rules live in `docs/constitution.md` — consult it before declaring a feature complete.

**Documentation style:** Design layer is narrative and explains *why*; operational layer is terse bullets and tables. Write for future-you in 6 months. Update docs as part of implementation, not after.

**Literal-command handoffs.** Every command that emits a "next move" — in `status.md`, in handoff blocks, in `/b-recap` output — names the exact slash command the operator should type next. "`Run /b-integration foundation`" — yes. "Write the integration test next" — no. The point is to remove the gap between *knowing what should happen next* and *being able to do it without thinking*. If there is genuinely no next command, the explicit form is `(none — <reason>)`.

## UI Changes — Paths and the Gate

Interface work has a different cadence from feature work — applies whether the interface is a web frontend, TUI, desktop GUI, or otherwise. UI iteration is often exploratory: the right answer is discovered by trying, not designed up front. The propose-confirm-implement-reconcile cycle of `/b-feature` is the wrong shape for "move the icon left a bit" and not quite the right shape for "what should this navigation feel like?" The framework recognises three paths for UI changes.

<path_decision>
Three questions, in order:

1. **Is this UI?** Touches navigation, screens, layout, copy, interaction patterns, visual styling. If no, this section does not apply — route as feature, bug, or architecture change.
2. **Is it structural?** "Structural" means it changes *what's there or how it relates*, not *how it looks*. Adding a screen, moving an item between menus, introducing a modal pattern, adding keyboard shortcuts globally — structural. Tweaking colour, copy, spacing, an icon — not structural.
3. **If structural, is it well-specified?** Test: did the user name a *specific shape* (modal, tab, dropdown, drawer, page) or only a *goal* (settings, navigation, content browsing)? Shape named → well-specified. Only goal → underspecified. If two or more plausible shapes exist and you'd have to pick one, treat it as underspecified.

|                  | Non-structural                          | Structural                                 |
|------------------|-----------------------------------------|--------------------------------------------|
| **Well-specified**   | Path 1 — Just do it. No doc update.       | Path 2 — Just do it; reconcile `docs/ui.md`. |
| **Underspecified**   | Ask one clarifying question, then Path 1. | Path 3 — Use `/b-ui` — propose with options. |
</path_decision>

**Path 1 — Ad-hoc, no doc impact.** Visual tweaks: move an icon, adjust colour, change copy, tighten spacing. The agent makes the change directly. `docs/ui.md` records invariants, not pixels — pixel-level UI changes are the code, not the doc.

**Path 2 — Ad-hoc, reconcile the doc.** Structural changes tight enough not to need a proposal: "add a logout item to the user menu, opens a confirm modal." The agent makes the change and updates `docs/ui.md` (and any affected feature `plan.md`) as part of the reconcile. This is the same shape as out-of-band feature work — reconcile the doc, no skill needed.

**Path 3 — `/b-ui`.** Structural changes with branching choices the user should pick between. "Add tab-based content navigation" is the canonical example: which tabs, what happens on switch, mobile behaviour, URL state — these are choices, not specifications. `/b-ui` runs a propose-with-alternatives gate, implements the chosen option, and reconciles the docs.

<path_examples>
Concrete requests and their path:

- "move the icon to the right" → Path 1
- "change the button colour to brand blue" → Path 1
- "rename 'Submit' to 'Save changes'" → Path 1
- "add a logout item to the user menu, opens a confirm modal" → Path 2 (structural + specified)
- "the date picker should close on outside click" → Path 2 (interaction pattern + specified)
- "add a keyboard shortcut to close modals: ESC" → Path 2 (interaction pattern + specified)
- "let's improve the dashboard" → underspecified; ask one clarifying question; result lands in Path 1, 2, or 3
- "add tab-based content navigation" → Path 3 (structural + underspecified: which tabs, switch behaviour, mobile, URL state)
- "add a settings page" → Path 3 (structural + underspecified: page vs modal vs drawer, what sections)
- "introduce a wizard flow for onboarding" → Path 3 if structural-only; **hard-redirect to `/b-design`** if it requires new state-management or routing infrastructure
- "swap React Router for TanStack Router" → architectural → `/b-design`
- "switch the design system from MUI to shadcn/ui" → architectural → `/b-design`
</path_examples>

**The gate sits at branching choices, not at structural-ness.** A structural change that is tightly specified (path 2) does not warrant a gate — the operator has already made the choices. The gate exists for the moment commitment to options is being made.

**Architectural changes are still hard-redirected.** Introducing a new top-level navigation pattern, swapping the design system or UI framework, adopting new state-management for the UI layer, or any change that reshapes architecture rather than the experience surface — these cross architectural boundaries and require `/b-design`. The hard-redirect rule from elsewhere in the framework applies unchanged.

<commit_discipline>
Before a Path 1 or Path 2 UI burst, check `git status`. If the working tree is dirty *and* the dirty changes are unrelated to the UI work about to start, surface this once and ask whether to commit first or proceed. "Non-trivial" means: touches multiple files, includes deletions or renames, or you can't describe the rollback in one sentence. For a single one-line tweak the check is overhead — use judgement. The DX trade-off is deliberate: speed for the everyday case, with `git` as the undo button. The protections that remain on are the architectural hard-redirect and the no-ad-hoc-cross-cutting-decisions rule; what's lifted is the proposal-and-acceptance ceremony for changes that don't warrant it.
</commit_discipline>

Out-of-band UI chat is, by design, *cheaper* than out-of-band feature chat. Read that as deliberate, not as a hole.

## Bower Commands

Design and change:

- `/b-design` — Six-stage design process for new projects and architectural revisions. Stage 0 spawns the `bower-analyst` subagent to produce a **change brief** identifying the per-stage delta; Stages 1–5 execute against the confirmed brief (problem framing → decisions/ADRs → architecture → module/feature plans → scaffolding). Stages with no delta emit "nothing to do" cleanly, so the heavy flow stays proportionate to the actual change. Required for greenfield and for changes that shift architecture, decisions, scope, or module structure.
- `/b-feature` — The everyday change command. Covers **add**, **modify**, and **remove** intents within existing architecture: propose → acceptance-criteria → confirm → implement → reconcile. Loads relevant ADRs at propose time; reconcile prompts for ADR creation/supersession when a cross-cutting decision was introduced or invalidated. Redirects back to `/b-design` if the request turns out to need architectural change; redirects to `/b-ui` if the request is primarily about the experience surface.
- `/b-ui` — Gated path for **structural and underspecified** UI changes — propose with alternatives → confirm → implement → reconcile `docs/ui.md`. Narrower than `/b-feature`: most UI work happens out-of-band (see *UI Changes — Paths and the Gate* above). Use when the change touches navigation, screen composition, layout grammar, or interaction patterns *and* the request has branching choices the user should pick between.
- `/b-module` — Build all features in a module in one pass, one gate up front, one integration pass at the end. Loads relevant ADRs at propose time; reconcile prompts for ADR creation/supersession at module finalisation. Use when the module is small (≤3–4 features) and well-specified.
- `/b-integration` — Build the module-boundary integration test for a module. Use when a module was built feature-by-feature and the test is the residual, or when a `/b-feature` change shifted what the test must assert.
- `/b-adr` — Scaffold a new ADR (or supersede an existing one). Auto-increments ID, fills date, prompts for the four body sections. Called from `/b-feature` and `/b-design`; can also be invoked directly when a decision needs recording outside those flows.

Orientation and export:

- `/b-recap` — Read-only, advisory "where am I, what's next?" synthesis across `index.md`, `scope.md`, `module-status.md`, and any in-progress `status.md` files. Never writes.
- `/b-analysis` — Read-only, advisory. Spawns the `bower-analyst` subagent against a proposed change and prints its **change brief** — what each `/b-design` stage would do if executed, including "nothing to do" outcomes. Same subagent runs at `/b-design` Stage 0; this is an inspection tool for the brief itself.
- `/b-index` — Regenerate `docs/index.md` and `docs/adr/index.md` from current state.
- `/b-spec` — Export a single specification document from project documentation, suitable for sharing with stakeholders or other teams.

Maintenance:

- `/b-upgrade` — Upgrade this project to the current Bower framework version. Requires a clean git working tree. Clones the framework repo (URL in `_bower/SOURCE`), runs the scaffold script to refresh `_bower/` and `.claude/`, then walks each intermediate version's migration notes in `_bower/changes.md`, applying them step-by-step and bumping `_bower/VERSION` after each. Emits a self-assessment so the operator can decide whether to `git reset --hard` if a step looks wrong.

## Post-MVP Work: When to Use Which

Once the initial design is in place, the bias is toward `/b-feature` (or, for UI work, the ad-hoc paths described above). The framework is for lightweight cases — don't reach for design when a change command will do.

- **Use `/b-feature`** for adding a new feature within an existing module (just append to `## Build order`), modifying behaviour of an existing feature, fixing bugs, removing features, and adjusting tests. The build order is a living document, not a Stage-4 contract — appending to it during a `/b-feature` add is normal.
- **Use `/b-ui`** when the change is primarily about the experience surface and has branching choices to commit to. Most UI work skips the skill entirely — see *UI Changes — Paths and the Gate* — but the gated path exists when the operator wants to choose between alternatives.
- **Use `/b-design`** when the change crosses architectural boundaries: introducing a new module, adopting a new technology, fundamentally re-shaping data flow, or expanding scope in a way that warrants re-examining `scope.md` and `architecture.md`. If you're unsure, start with `/b-feature` — its propose-and-confirm gate will redirect to `/b-design` if the request turns out to be bigger than it looked.
- **Don't run both pre-emptively.** Updating `architecture.md` "just in case" before a feature change is the kind of large-process overhead Bower is meant to avoid. Run `/b-design` only when you actually need design treatment.

Living documentation does the heavy lifting: `/b-feature` updates `plan.md` and the relevant sibling plans in place, so post-MVP docs stay accurate without a separate "documentation pass" between feature work.

## Framework Reference

- `_bower/rationale.md` — Why Bower works this way, design principles, comparison to alternatives
- `_bower/brief-schema.md` — Schema for the change brief produced by `bower-analyst` and consumed by `/b-design` Stage 0
- `_bower/roadmap.md` — Deferred framework improvements and their revisit triggers
- `_bower/changes.md` — Versioned log of framework changes (most recent first)
- `_bower/framework.md` — This file. Project CLAUDE.md `@`-includes it so framework guidance can be refreshed by re-copying `_bower/` without touching project-specific content in CLAUDE.md.
- `_bower/VERSION` — The framework version this project was last migrated to. Owned by `/b-upgrade`; preserved by the scaffold script across re-runs.
- `_bower/SOURCE` — The git URL of the framework repo, used by `/b-upgrade` to clone the latest framework. Seeded by the scaffold script from the framework repo's `origin` remote; edit if you need to point at a fork or mirror.
