# Bower Framework Reference

Detailed specifications behind the router in `_bower/framework.md`. This file is **not** loaded into every session — commands and agents read the section they need, when they need it.

## Document Layers and Ownership

Bower splits documentation into three layers by *audience* and *style*, not by directory. Design-layer docs (`architecture.md`, `ui.md`, `problem-space.md`, `constitution.md`, `scope.md`, ADRs) are narrative and human-primary. Operational-layer docs (`plan.md`, `status.md`, `module-status.md`, `index.md`) are terse, bulleted, agent-primary; word budgets apply here. Reference-layer docs (`docs/reference/**`) are external or vendored material consulted during implementation.

**Ownership semantics:** *human-owned* docs (`problem-space.md`, `constitution.md`) may be drafted by the agent during full design, but must not be rewritten unprompted afterwards. *Co-authored* docs (`architecture.md`, `ui.md`, `scope.md`, `plan.md`) are agent-updated in place as changes land, human-reviewed and edited freely. *Agent-owned* docs (`status.md`, `module-status.md`, the two index files) are routinely maintained by the agent. *External/vendored* material is read-only — consult it, don't edit it; refresh by re-vendoring. *ADR bodies* are immutable once accepted — only frontmatter (status, supersession links, applicability classification) is updated; new decisions go in new ADRs.

**The two index files are derived-state-with-preserved-structure.** `docs/index.md` and `docs/adr/index.md` are agent-owned, but `/b-index` does not own their *prose*. On regeneration it recomputes only the derived state — status markers, ADR table rows, counts — and updates those in place, preserving any curated structure the project has grown around them (status dashboards, documentation maps, rationale narrative, an elaborated ADR schema reference). You may hand-author such narrative into these files; `/b-index` will refresh the numbers without flattening it.

**Documentation style:** design layer is narrative and explains *why*; operational layer is terse bullets and tables. Write for future-you in 6 months. Update docs as part of implementation, not after.

## status.md — Resumption Framing

`status.md` answers one question: *if I picked this up tomorrow, what's the state and what's the next move?* Current state in a short paragraph or bullets; next move explicit (a literal slash command); open issues only if they affect resumption. No history, no changelog, no solved-issue residue. Bug backlog belongs in the external tracker, not here. Budget ~150 words — over budget is a signal to compress, not to split.

If any acceptance criterion agreed at a gate has not yet been verified (typically manual checks the user deferred), include a `Pending verification:` line listing those checks. Empty or omitted means fully verified. A feature with pending verification is marked 🚧 in `module-status.md`, not ✓.

## module-status.md — Integration and Build Order

`module-status.md` captures three things: the module-boundary integration test (location and status), the build order of features within the module, and free-form integration notes. Populated during full design (Stage 4), maintained as features progress. Budget ~250 words total.

```markdown
## Module integration

Test: <path or "not yet defined"> — ✓ | 🚧 | ⏸ | 🟡 | 🔴
Notes: <one-line behavioural rationale carried forward from Stage 4>
```

Only `/b-integration` (or `/b-module`'s in-pass integration step) flips this marker. `/b-feature` may refresh `Notes:` when a feature shifts what the integration test must assert, but does not touch the marker.

```markdown
## Build order

1. <feature-name> — ✓ | 🚧 | ⏸ | 🟡 | 🔴 | 🔧
2. <feature-name> — ⏸
```

Order reflects intra-module dependencies identified at design time; reorderings should be rare and driven by a genuine plan change. `/b-feature` and `/b-module` update build-order markers as features complete. Appending a new feature during a `/b-feature` add is normal — the build order is a living document, not a Stage-4 contract.

**Module-level status is a floor, not a sum.** `/b-index` derives a module's status as the worst across both feature markers and the module-integration marker. A module with all features ✓ but `## Module integration` still ⏸ surfaces as 🚧 — making the constitution's verified-for-✓ rule observable rather than aspirational.

## ADRs — Architectural Decision Records

`docs/adr/` is the project's decision log. One file per decision, named `NNNN-kebab-case-title.md` with a zero-padded four-digit ID. IDs are immutable and never reused, even if a decision is later superseded; gaps are fine. ADRs cover any **cross-cutting commitment** — a choice that constrains more than one feature and would surprise a future reader if not written down. Single-feature implementation detail belongs in that feature's `plan.md`, not in an ADR.

**Frontmatter schema:**

```yaml
---
id: ADR-NNNN
title: <Title>
status: accepted | superseded | deprecated
date: YYYY-MM-DD
scope: universal | module | integration | operational
modules: [<bower-module-name>, ...]   # required when scope: module
topics: [<kebab-keyword>, ...]        # optional subject keywords
supersedes: [ADR-NNNN, ...]           # omit if empty
superseded-by: [ADR-NNNN, ...]        # omit if empty
---
```

`scope` decides which changes load the ADR: `universal` (rare — constrains every feature; the only value that loads unconditionally), `module` (constrains the modules listed in `modules`), `integration` (constrains module interactions; loaded for integration-shaped work), `operational` (deployment, tooling, versioning; loaded for ops-shaped work). `topics` enables topical matching regardless of module. An accepted ADR with **no `scope` field is an unclassified pre-v0.20 entry** — commands load it on module, topic, or title match only, never wholesale. `modules` references exact directory names under `docs/modules/`; do not use sentinels.

**Body:** two required sections (`## Context`, `## Decision`) and two optional (`## Consequences` when there's a non-obvious cost or ongoing burden not already implied by the Decision; `## Alternatives considered` when real alternatives were weighed). Order is fixed. A good ADR is **~150 words** and rarely over 300. ADRs may bundle several closely-related decisions under one coherent umbrella title — the split test is whether the title honestly covers the scope. If the title would have to be "X and also Y," that's two ADRs.

**Lifecycle.** Bodies are **immutable once accepted**. Reversals are new ADRs with `supersedes: [ADR-NNNN]`; the old ADR's frontmatter gains `status: superseded`, `superseded-by: [ADR-NNNN]` — both files in one commit. Partial supersession (a new decision scopes an exception): write the new ADR, leave the old one `accepted`, describe the relationship in the new body. Frontmatter is mutable — adding `scope`/`topics` classification to a legacy ADR is allowed and encouraged.

**Access pattern.** `docs/adr/index.md` is the canonical entry point — schema reference plus navigable index, regenerated from frontmatter by `/b-index`. Read the index first; open individual ADRs only when relevant to the current change. Do not grep frontmatter directly — the index absorbs schema evolution. Filter by `status: accepted` for "what's true now."

**Code is truth, ADR is hypothesis.** An accepted ADR records what the project *decided*, not necessarily what the code currently *does*. If an ADR names a library, file, or flag the code contradicts, the ADR is the stale one — flag it and supersede; do not silently trust it.

**When to write.** During `/b-design` Stage 2, every major decision gets an ADR. During `/b-feature` or `/b-module` reconcile, a change that introduced or invalidated a cross-cutting decision writes or supersedes one before closing. Don't pre-emptively record decisions that haven't been made; don't backfill history unless migrating from an older log format.

## Implementation Trajectory (multi-session features)

Multi-session features maintain an `## Implementation trajectory` section in `plan.md`. As each phase completes, its description is rewritten in place as a one-paragraph précis of *why* that direction was taken — not the steps, which are in git. Current and future phases stay detailed. Single-session features skip the section entirely.

## Reference Material

Two kinds of persistent reference material have a home in Bower:

- **Vendored external docs** (e.g. LLM-friendly framework indexes) live in `docs/reference/`. Create the directory only when needed. Treat contents as read-only; refresh by re-vendoring.
- **Out-of-tree source references** (e.g. a sibling prototype treated as a behavioural oracle) are pointed to from `docs/constitution.md` under working conventions, with the rationale logged as an ADR. The material itself stays where it lives on disk.

Reference material is consulted during implementation but never synthesised into project docs — if insight from it needs to persist, it belongs in `plan.md` or an ADR, not copied into `docs/reference/`.

## UI Changes — Paths in Detail

The router carries the decision table; this section carries the reasoning and worked examples. "Structural" means the change alters *what's there or how it relates*, not *how it looks*. "Well-specified" means the user named a *shape* (modal, tab, drawer, page), not only a *goal* (settings, navigation); if two or more plausible shapes exist and you'd have to pick one, treat it as underspecified.

**Path 1 — Ad-hoc, no doc impact.** Visual tweaks: move an icon, adjust colour, change copy, tighten spacing. Make the change directly; `docs/ui.md` records invariants, not pixels.

**Path 2 — Ad-hoc, reconcile the doc.** Structural changes tight enough not to need a proposal: "add a logout item to the user menu, opens a confirm modal." Make the change; update `docs/ui.md` (and any affected feature `plan.md`) as part of the reconcile.

**Path 3 — `/b-ui`.** Structural changes with branching choices the user should pick between: "add tab-based content navigation" — which tabs, switch behaviour, mobile, URL state are choices, not specifications.

Examples:

- "move the icon to the right" → Path 1
- "rename 'Submit' to 'Save changes'" → Path 1
- "add a logout item to the user menu, opens a confirm modal" → Path 2
- "the date picker should close on outside click" → Path 2 (interaction pattern + specified)
- "let's improve the dashboard" → underspecified; ask one clarifying question; lands in Path 1, 2, or 3
- "add a settings page" → Path 3 (page vs modal vs drawer, what sections)
- "swap React Router for TanStack Router" / "switch MUI to shadcn/ui" → architectural → `/b-design`

**Commit discipline.** Before a Path 1/2 burst, check `git status`. If the tree is dirty with unrelated non-trivial changes (multiple files, deletions/renames, rollback not describable in one sentence), surface it once and ask whether to commit first. For a one-line tweak the check is overhead — use judgement. The DX trade-off is deliberate: speed for the everyday case, `git` as the undo button; the architectural hard-redirect and the no-ad-hoc-cross-cutting-decisions rule stay on.

Out-of-band UI chat is, by design, *cheaper* than out-of-band feature chat. Read that as deliberate, not as a hole.

## Module Review

When a module reaches completion — every feature ✓ and the `## Module integration` marker ✓ — `/b-feature` and `/b-module` offer `/b-review <module>` as an *optional* next move. It is the one moment the module's emergent properties first become reviewable: whether tests cover the *interactions* between features, whether docs still match code, whether features built weeks apart answer the same question the same way, whether an accepted ADR has quietly drifted from the implementation.

Review delegates diagnosis to the read-only `bower-reviewer` subagent — the isolation buys adversarial freshness: the implementing agent is biased to read its own code as correct; a subagent given only docs, criteria, ADRs, and code hunts for where they *disagree*. The report is scoped to six dimensions (test coverage, spec↔code drift, cross-feature consistency, status honesty, ADR drift, boundary integrity) — deliberately not a linter or security audit.

Findings split into **owned** classes `/b-review` reconciles itself behind one triage gate (stale doc lines, missing tests for agreed behaviour, dishonest markers, drifted ADRs via `/b-adr`) and **routed** classes surfaced as literal-command next moves (behavioural fixes → `/b-feature`; boundary erosion → *always* `/b-design`). Accepted reconciliations land in a transient `docs/modules/<module>/review-plan.md` written before any are applied — the recovery anchor — and deleted when every item is checked. One open plan per module; re-invoking `/b-review` while one is open resumes the apply rather than re-diagnosing. `/b-recap` surfaces an open plan; `/b-index` ignores it.
