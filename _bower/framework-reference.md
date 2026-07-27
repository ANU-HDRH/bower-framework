# Bower Framework Reference

Detailed specifications behind the router in `_bower/framework.md`. This file is **not** loaded into every session — commands and agents read the section they need, when they need it.

## Document Layers and Ownership

Bower splits documentation into three layers by *audience* and *style*, not by directory. Design-layer docs (`architecture.md`, `ui.md`, `problem-space.md`, `constitution.md`, `scope.md`, ADRs) are narrative and human-primary. Operational-layer docs (`plan.md`, `status.md`, `module-status.md`, `index.md`) are terse, bulleted, agent-primary; word budgets apply here. Reference-layer docs (`docs/reference/**`) are external or vendored material consulted during implementation.

**Ownership semantics:** *human-owned* docs (`problem-space.md`, `constitution.md`) may be drafted by the agent during full design, but must not be rewritten unprompted afterwards. *Co-authored* docs (`architecture.md`, `ui.md`, `scope.md`, `plan.md`) are agent-updated in place as changes land, human-reviewed and edited freely. *Agent-owned* docs (`status.md`, `module-status.md`, the two index files) are routinely maintained by the agent. *External/vendored* material is read-only — consult it, don't edit it; refresh by re-vendoring. *ADR bodies* are immutable once accepted — only frontmatter (status, supersession links, applicability classification) is updated; new decisions go in new ADRs.

**Ownership governs edits, not truth.** Ownership answers *who may write this file*; it says nothing about whether the file is accurate, and for human-owned docs the two pull in opposite directions — the stronger the "don't touch" norm, the longer a false claim survives, because every agent that notices it has been told to leave it alone. Ownership protects the file from agents; nothing protects it from decay. So agents carry a **flag-don't-fix** duty on `constitution.md` and `problem-space.md`, exactly as they already do for immutable ADR bodies: when a claim in one of these contradicts the code, surface it — never silently obey the false claim, and never silently correct it.

Surfacing has a required shape, because a paraphrase invites a rubber-stamp and the point is to get the human into the file:

- Quote the claim **verbatim**, with its `docs/constitution.md:NN` location.
- State the contradicting evidence with its own exact path and line, or the command that was run and what it did.
- Ask whether to edit. If the human authorises it, that is *prompted* and the edit is permitted; absent that, the file is untouched.

**Coverage is opportunistic, not an audit.** Nothing in Bower verifies the constitution as a whole. Contradictions are caught only where an agent already reads the file *for a purpose* and happens to exercise the claim — `bower-implementer` runs the testing section's runner and fixtures, so it finds out empirically; `bower-reviewer` uses the constitution as the yardstick for coverage and status honesty, so it can see when the yardstick itself is false. A claim nothing executes (a deployment convention, a review process, "all endpoints are rate-limited") will not be caught by anyone. This is a backstop, and describing it as more than that would reproduce the very failure it guards against.

## constitution.md — Normative Shape

`constitution.md` is **normative**: it states rules the project has committed to — where tests live, the runner command, what "verified" means for a `✓`, contribution and review conventions. A rule can be *unmet*, but it cannot be *false*; an unmet rule shows up as work. That property is what makes the doc safe to treat as authority.

The failure mode is a **descriptive** claim smuggled into a normative doc — a statement about what *exists* ("CI runs the integration suite on every PR", "all modules have contract tests") written in the same register as a rule. Agents read it as fact and act on it, and the ownership norm keeps it from ever being corrected. Aspiration is welcome in a constitution; aspiration wearing the clothes of fact is not.

Two rules follow:

- **Every statement about what exists must be verifiable from the repo** — the file, the config, the command is really there — **or it does not go in the normative body.**
- **Aspirations live under a `## Not yet in force` heading**, and agents must treat everything under it as **non-existent**: do not rely on it, do not cite it as a convention, do not mark work `✓` on the strength of it. Moving an item out of that section is the human's act of putting it in force.

```markdown
## Not yet in force

Intended, but not true of the repo today. Agents: treat these as non-existent.

- Contract tests at every module boundary — only `auth` has one.
- CI gating on the integration suite — the workflow exists but is `continue-on-error`.
```

This is a shape rule, not a full template: the constitution's headings are otherwise the project's own business. The split is *prevention* — it stops the false claim being written in the form that fools everyone — and it matters more than the detection backstop above, which only ever catches the subset a running agent trips over.

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
3. <feature-name> — ⏸ (scope reduced by <feature>: <what already landed>. Remaining: <what is left to build>.)
```

Order reflects intra-module dependencies identified at design time; reorderings should be rare and driven by a genuine plan change. `/b-feature` and `/b-module` update build-order markers as features complete. Appending a new feature during a `/b-feature` add is normal — the build order is a living document, not a Stage-4 contract.

**Pull-forward annotation.** Build order is a prediction made at design time, and dependencies routinely cause an earlier feature to absorb part of a later one's scope. That is benign in itself — it mirrors how the work actually falls out. What is not benign is the artifact it leaves behind: the later feature's `plan.md` was written before the absorption and now overstates its own scope, and that plan is exactly what the later feature's implementation pass is handed as its contract. So when a feature absorbs scope from a later entry, `/b-feature`'s reconcile annotates *that entry* with one clause naming who absorbed what, then a `Remaining:` clause naming what is still to build. The `Remaining:` half is the part that does the work — it is what stops the next pass from re-implementing what already exists. Add the annotation only when scope genuinely moved, and keep it to one line: the ~250-word budget is shared with the integration notes.

If the absorption leaves nothing to build, the entry stays ⏸ with `Remaining: none — verify and close via /b-feature <name>`. Do **not** mark it ✓ on the strength of another feature's criteria having passed: ✓ means *this* feature's agreed criteria were verified, and the code that landed early has not been checked against them. The entry earns ✓ through a normal (and now very short) `/b-feature` pass, or the operator removes it as no longer a distinct feature.

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

## Adoption phase

Brownfield adoption (`/b-adopt`) reconstructs orienting docs from an existing codebase and opens an **adoption phase** — a bounded state with an explicit exit. It carries zero standing cost for greenfield projects: the entire apparatus is two things that only exist while a project is mid-adoption, and both vanish when it ends.

- **The flag is a banner in `docs/index.md`.** `docs/index.md` is read on every session (it is the orientation entry point), so the presence of a `🌱 Adoption in progress` banner *is* the phase flag — no separate always-loaded state, no tax on projects that never adopt. A greenfield index simply has no banner. The banner is curated structure; `/b-index` preserves it across regeneration.
- **The ledger is fetched on demand.** `docs/adoption-ledger.md` holds the cross-cutting choices found in code whose rationale could *not* be attributed — one terse line each (`<location> · <open question>`), open items only, no stored context (it is cheap to re-derive from code when the item is picked up). An agent looks for it only because the banner told it to; nothing loads it otherwise. A choice whose git attribution the operator *accepts* at the adoption gate never enters the ledger; its rationale is retained as commit-cited prose in `architecture.md`/`scope.md`, and is promoted to an ADR only if the operator chooses — adoption never auto-writes ADRs. Attribution is provisional until that gate: a proposed citation the operator rejects as stale returns to the ledger as an open question (never written into a doc), and one the operator judges plain wrong goes to the remediate path.
- **No open questions ⇒ no phase.** If `/b-adopt` finds nothing it cannot attribute, it writes neither ledger nor banner: an empty ledger already meets the exit condition, so opening the phase would immediately contradict it. Such a project is a normal Bower project from the moment adoption finishes (its docs were still inferred — the adoption run's confidence note covers that — but there is nothing left open to track).

**Draining the ledger.** Each item has three exits, and all delete the line — the file shrinks monotonically toward empty:

- **Resolve** — the choice stays. The area is next worked on, the intent is recovered (from the user, now that there is a concrete reason to ask), and captured as an ADR via `/b-adr`. The ADR is cold, module-scoped, loaded only when that area is touched. Delete the ledger line.
- **Remediate** — the choice was accidental or wrong. Change it through the normal flow — `/b-feature` for a behavioural fix, `/b-design` if the fix is architectural — which reconciles the docs as it goes. Delete the ledger line once the change lands. This is where adoption's *renewal* actually happens: `/b-adopt` only records the concern; the fix is a normal gated change, not something adoption performs.
- **Dismiss** — the choice turns out deliberate or simply accepted, not worth a decision record. Delete the ledger line. No tombstone in v1: re-running adoption on an already-adopted project is not a supported operation, so there is nothing to guard against re-observing.

**As-built markers.** Adoption cannot mark observed features `✓`. `✓` means *agreed acceptance criteria passed*, and adoption has neither recorded criteria nor a verification pass — a `✓` on found code would be a false completeness claim, the marker-level twin of writing an inferred ADR. So `/b-adopt` marks every observed feature `🚧` (as-built, present in code, not verified to the `✓` bar) in the module's `## Build order`, and writes **no** per-feature `status.md`. A feature earns `✓` only when it is next worked and verified through the normal flow. Because adopted features have no `status.md`, `/b-index` takes their marker from the `## Build order` line and never promotes code-presence to `✓` on its own; module rollup therefore honestly shows `🚧` while as-built features remain unverified. The `🚧`-everywhere state is itself a drain signal, and the banner frames it as provisional — reusing the existing marker keeps adoption from taxing the framework's status vocabulary.

**Exit.** When the ledger is empty, delete the banner from `docs/index.md`. The docs are no longer provisional; the project is a normal Bower project. Adoption is not a mode you live in — it is a phase you leave. (Features may still legitimately sit at `🚧` after the ledger empties — adoption resolves *decision* attribution, not per-feature verification; those graduate to `✓` through normal work as each is touched.)

The discipline that makes this honest: `/b-adopt` never guesses intent. Code is *what*, not *why*; an unattributed choice is recorded as an open question, never written up as a confident ADR or architecture claim. Renewal — undoing choices that turn out to be mistakes — is not part of adoption; it emerges afterward through the normal `/b-*` flow as ledger items are drained.
