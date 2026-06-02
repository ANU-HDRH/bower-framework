# Bower Framework Changes

Versioned log of framework changes. Most recent first. Each entry: what changed, why, and any migration notes for projects already on a previous version.

This file is the changelog for the *framework itself* — not for projects built with it. Project-level history belongs in git.

---

## v0.19 — 2026-06-03

### `/b-index`: structure-preserving regeneration, not template clobber

**What changed**

- **`.claude/commands/b-index.md` gains a `## Regeneration contract` section** that splits the command's job in two: *derived state* (status markers, ADR table rows, accepted/superseded counts) is authoritative and recomputed on every run; *curated structure* (status dashboards, documentation maps, parallelism/rationale prose, an elaborated ADR schema reference, legend tables, custom section ordering) is preserved verbatim. When an index file already exists, derived values are updated **in place**; the file is never flattened to the skill's template.
- **The two `## Output:` templates are reframed as first-generation seeds.** Each now opens with an explicit "if the file already exists, refresh derived values in place and preserve structure" instruction; the literal template is used verbatim only when the file does not yet exist.
- **The ADR-index schema block is no longer "write verbatim every time."** It is verbatim on first generation, but treated as curated on regeneration — if a project has elaborated the schema reference (expanded field notes, added lifecycle/access-pattern prose), `/b-index` leaves it intact. The three tables underneath remain always-recomputed.
- **A new top Rule — "Preserve, don't flatten"** — restates the contract for literal-minded execution, declaring the templates minimums rather than the required shape.
- **`_bower/framework.md`** gains an ownership-semantics note: the two index files are *derived-state-with-preserved-structure* — agent-owned, but `/b-index` does not own their prose. Projects may hand-author narrative into them; regeneration refreshes the numbers without discarding it. Heading bumped to v0.19.

**Why**

`/b-index` was written as a full regenerator — "write it verbatim every time" — but it is executed by a model, not a script, and projects naturally grow a richer index than the skeletal seed template (a status dashboard, a documentation map, build-order rationale). Observed in practice: during a `/b-integration` the indexer hit a real conflict between "regenerate verbatim" and "don't destroy the hand-authored content," and improvised an in-place edit. That improvisation was the *correct* behaviour the framework had failed to specify. Worse, the unspecified path had two failure modes: a literal executor would clobber the curation, while a preserving executor was now hand-editing what is supposed to be mechanically recomputed — risking marker drift, the exact thing the integration-completion regen exists to prevent. Naming the contract — derived state authoritative and in-place, structure preserved — keeps the mechanical-recompute guarantee *and* the curation, and stops the templates from being read as a ceiling.

### Migration

None — no project-side changes required.

This change only makes `/b-index` more conservative: it now preserves curated index structure it previously would have overwritten. Projects pick up the new skill by re-running the scaffold script (which copies `.claude/commands/`); existing `docs/index.md` and `docs/adr/index.md` files — whether skeletal or hand-enriched — are preserved automatically on the next `/b-index` run, with only their derived status markers and ADR tables refreshed. No file needs to be edited, moved, or restructured. Projects whose index files are still the bare seed template may now optionally enrich them (add a status dashboard, documentation map, or build-order rationale) and trust that future regenerations will keep that content; this is an option, not a required step.

## v0.18 — 2026-05-29

### `/b-review`: fresh-eyes module review with a transient reconciliation plan

**What changed**

- **New subagent `.claude/agents/bower-reviewer.md`.** Read-only, mirrors `bower-analyst`'s shape (tools: Read, Glob, Grep, Bash; no AskUserQuestion; one pass; schema conformance). Given one module, it surveys the module's `module-status.md`, each feature's `plan.md`/`status.md`, the constitution's testing conventions, the `## Software architecture` entry, the ADRs touching the module, and the code — then emits a **review report**. Its purpose is *adversarial freshness*: it arrives without the implementer's context, so it hunts for where the build diverged from what it was supposed to be rather than rationalising what's there.
- **New schema `_bower/review-schema.md`.** Defines the review report the subagent emits, parallel to `brief-schema.md`. Findings span **six dimensions** chosen because a feature-at-a-time build systematically can't see them: test coverage (whole-module), spec↔code drift (bidirectional), cross-feature consistency, status honesty, ADR drift, boundary integrity. Each finding carries a **resolution class** — `inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede` (the *owned* classes `/b-review` resolves itself) or `route:/b-feature`, `route:/b-design` (the *routed* classes it hands off). Includes a worked example against a fictional `auth` module.
- **New command `.claude/commands/b-review.md`.** State-aware, one command, two modes. Fresh run: spawn `bower-reviewer` → present findings → one triage gate (AskUserQuestion) → write accepted owned reconciliations to `docs/modules/<module>/review-plan.md` *before* applying → apply inline (doc reconciles, test backfill, marker fixes) or via `/b-adr` (supersessions) → delete the plan → handoff re-surfacing routed findings as literal next moves. Resume run: if `review-plan.md` already exists, skip diagnosis and continue applying its unchecked items. Boundary erosion is always `route:/b-design` and never enters the plan — the architectural hard-redirect holds.
- **`review-plan.md` is a transient work list, not living documentation.** Written at the gate as the recovery anchor (same discipline as `/b-feature`'s post-gate `plan.md`), deleted when every reconciliation is checked. One open plan per module; no dated variants. Its `## Reconciliations` checklist gates its life; `## Routed` and `## Observations` ride along for interruption-survival but don't block deletion.
- **`.claude/commands/b-feature.md` and `b-module.md` offer `/b-review` at module completion.** When a change brings a module to fully complete (every feature ✓ and `## Module integration` ✓), the handoff names `Run /b-review <module>` as an *optional* next move. Framed as optional — small projects may skip it — but named so it's one keystroke away.
- **`.claude/commands/b-recap.md` surfaces an open `review-plan.md`.** A new read-only input (existence + `## Reconciliations` done/total count only) and a new `Open review plans:` line in the output, with `Run /b-review <module>` to continue. This gives the transient plan an owner in the orientation flow rather than making it invisible — `/b-recap` is the one command taught to notice it; nothing else reads it.
- **`.claude/commands/b-index.md` ignores `review-plan.md`.** One rule added so the indexer never mistakes the transient plan for project state.
- **`_bower/framework.md`** gains the `/b-review` command entry, a new **Module Review** section (the six dimensions, owned-vs-routed split, out-of-band safety, the transient-plan lifecycle), a `review-schema.md` reference, and a heading bump to v0.18 (the heading had lagged at v0.16; it is now realigned with `_bower/VERSION`).
- **`_bower/rationale.md`** updates *Subagents for Isolated Analysis* to name both subagents and adds the *adversarial freshness* argument for `bower-reviewer`; adds a new principle subsection **Review as Reconciliation, not Record** (report-rots-vs-plan-dies, the durable-ephemeral plan, out-of-band safety, why ADR scope is drift-detection only).
- **`_bower/roadmap.md`** marks *durable-ephemeral proposals on disk* as partially realised for review, and promotes the previously-floating *ADR index Decision summary per row* idea into a proper roadmap item — with `/b-review`'s non-actionable observations named as its new failure-signal source.
- **`README.md`** picks up the `/b-review` row in the commands table, names `b-review.md` and `bower-reviewer.md` in the repository structure, bumps its heading to v0.18, and gains an at-a-glance state-flow diagram (`docs/bower-state.svg`) in *How It Works* showing the build spine — Designed → Building → Complete, with `/b-review` as an optional self-loop and the architectural hard-redirect as the one backward arrow.

**Why**

Implementation-focused models miss a predictable set of things, and they miss them *systematically* because the misses are emergent at module scope: tests written per-feature optimise locally and never get a whole-module coverage check; docs drift from code one small edit at a time; features built weeks apart answer the same question two different ways; an accepted ADR quietly stops matching the implementation. None of these is visible while heads-down on a single feature. Module completion — every feature ✓, integration ✓ — is the moment they first become reviewable, and nothing in the framework was looking.

The hard part wasn't the diagnosis; it was what to do with the findings. A read-only report (the `/b-recap` shape) is the wrong fit — the operator's task becomes reading and sorting, and the likely response is "fix all that," which pushes a batch of changes through no process. Persisting the findings as a document invites the exact failure Bower exists to prevent: a record with no owner and no expiry that rots and poisons context. The resolution is that **a report rots, but a plan dies**: what lands on disk is not the findings but the *accepted subset*, as a checklist with an owner (the apply pass) and a death condition (deletion when complete). The triage gate is the filter — rejected findings evaporate with no trace. This is the deferred *durable-ephemeral proposals on disk* roadmap item, instantiated for review, which supplied the session-boundary pain it was waiting on.

The out-of-band-volume worry resolves by construction: a review fix pass batches only changes that are *individually* ad-hoc-safe (doc reconciles, test backfill for agreed behaviour, marker fixes, `/b-adr`-gated supersessions), and routes the one unsafe category — boundary erosion — to `/b-design`. The subagent is justified beyond context economy by adversarial freshness: the implementing agent is biased toward seeing its own code as correct, and an isolated reviewer reading only docs-plus-code against a skeptical prompt is structurally better at catching drift. ADR scope is deliberately drift-detection only — bodies are immutable and verbosity isn't supersede-worthy, so "trim the flab" would produce non-actionable noise; instead review records title-only-index opacity as an observation, generating the signal the deferred ADR-index improvement awaits rather than pre-empting it.

### Migration

None — no project-side changes required. This release is additive at the framework level: a new command, a new subagent, and a new schema file arrive via the scaffold, and the behavioural edits to `/b-feature`, `/b-module`, `/b-recap`, and `/b-index` are picked up the same way. No existing project document changes shape, and nothing in `docs/` needs editing.

Projects upgrading from v0.17 run `scripts/scaffold.sh <project>` (or `/b-upgrade`) and pick up `/b-review` on the next session. After scaffold, `_bower/VERSION` will read `0.18`; verify by reading it. The first time a module is complete, `/b-feature` or `/b-module` will offer `/b-review <module>` as an optional next move — running it is the operator's choice, not a required step.

One new transient artifact may appear under `docs/`: `docs/modules/<module>/review-plan.md`, written by `/b-review` while a reconciliation pass is in flight and deleted when it completes. It is a working file, not project state — `/b-recap` surfaces an open one as outstanding work, and `/b-index` ignores it. Whether to commit it to git is the operator's call (it is self-deleting either way); there is no required `.gitignore` change.

---

## v0.17 — 2026-05-28

### Lightweight ADR shape: cut wordcount, keep umbrella scope

**What changed**

- **`.claude/commands/b-adr.md` rewrites the body-length and section-shape guidance.** The target moves from `200–600 words` to `~150 words typical, 300 ceiling`. The four-section template becomes **two required** (`## Context`, `## Decision`) and **two optional** (`## Consequences`, `## Alternatives considered`). `## Consequences` is now omitted by default and included only when there's a non-obvious cost, ongoing maintenance burden, or downstream commitment not already implied by the Decision sentence. `## Context` is reframed as a pointer (two sentences max, naming the question and pointing to the doc that frames it) rather than a restatement of framing material. `## Alternatives considered` is unchanged in spirit — one sentence per alternative, with rejection reason — and is named as the section that earns the ADR's keep.
- **The "one decision per ADR" Behavioural Rule becomes "one coherent scope per ADR."** ADRs may bundle several closely-related decisions under an umbrella title (e.g. "sidecar accommodation for patterns" covering artefact layout, build-time merging, and provenance rendering). The split test is whether the title honestly covers the scope, not whether more than one commitment is named in the body. The "and also we decided…" smell is reframed to fire only when the additional commitment falls outside the umbrella ("and also we switched the build tool").
- **The Step 3 gate self-audit gains three checks** before presenting the draft to the user: does the Decision sentence fit under the title (or is a second ADR lurking)? Is `## Consequences`, if included, naming a real non-obvious cost or merely restating the Decision? Is `## Context` paraphrasing a doc already referenced (tighten if so)?
- **`What NOT To Do` is expanded** to forbid padding to length, restating framing docs in Context, and writing pseudo-Consequences sections. The old "do not bundle multiple decisions into one ADR" rule is replaced with the umbrella-test phrasing.
- **`_bower/framework.md` ADR section updated.** The body description names the required/optional split, the ~150-word target with 300 ceiling, and the umbrella-scope bundling rule. The Living-Documentation table row for `docs/adr/NNNN-*.md` moves from `~600 words` to `~150 words` and updates the structure note.
- **`_bower/rationale.md` "ADRs as Decision Log" gains a closing paragraph** on the lightweight posture — why brevity, why bundling under an umbrella title is encouraged (the model already wants to reason about meaningful units of software), why `## Alternatives considered` is the one section that earns growth, and why splitting every sub-decision into its own file would inflate the index without helping the agent.

**Why**

ADRs in real projects were bloating to ~500 words across four sections of mixed-quality prose. A representative example: a downstream project's ADR-0005 ("sidecar accommodation for patterns") landed at ~480 words, with a Context section that paraphrased its referenced doc, a Consequences section split between justification, forward plans, and alternatives-rebuttals, and overlap with the Alternatives section. Inside the 200–600 budget, but still bloated — because the budget was anchoring high and the four mandatory bins were inviting fill.

The fix is per-ADR wordcount, not per-ADR scope. ADR-0005's scope (three closely-related commitments under one umbrella) is honest; its prose is not. An earlier candidate fix — splitting bundled ADRs into separate files — was rejected because it relocates the consumability problem rather than solving it: more ADRs means a heavier index, more "is this the one I need" decisions per change, and a worse fit for Bower's small-project posture (1–3 people, agent-as-frequent-reader, no enterprise audit obligation). The model is not having trouble bundling related decisions under a coherent title; the framework should not fight what the model wants to do when that intent is reasonable.

The `## Consequences`-optional move does most of the trimming on its own. The pseudo-consequence is the most common bloat mode: when there is no real cost to name, the section gets filled with restated Decision content, forward implementation plans, or alternatives-rebuttals — all of which belong elsewhere or nowhere. Making the section earn its place removes the bin without removing the signal when there's genuine signal to record.

An adjacent change to the ADR index format — adding a one-line Decision summary per row, so bundled ADRs surface their commitments via the index — was discussed and deferred. No evidence of failure yet, and the lightweight-framework axis suggests waiting for the failure mode before adding `/b-index` complexity.

### Migration

None — no project-side changes required. ADR bodies remain immutable; existing ADRs at any length are valid as-written. The new shape applies only to ADRs created after the upgrade. Projects upgrading from v0.16 pick up the new `/b-adr` behaviour on the next session after running `scripts/scaffold.sh <project>` (or `/b-upgrade`). After scaffold, the project's `_bower/VERSION` will be at `0.17`; verify by reading it.

If a project wants to retroactively tighten older ADRs, do not edit existing bodies (the immutability rule still applies). Supersede with a new ADR only when the *decision* has actually changed, not when its prose is just verbose.

---

## v0.16 — 2026-05-25

### `/b-feature`: write `plan.md` after the gate, before implementing

**What changed**

- **`.claude/commands/b-feature.md` splits plan authorship in two.** A new **Step 3 ("Write the Plan")** writes `plan.md` immediately after gate confirmation, before any code is touched. It captures the spec-shaped content the proposal just confirmed: purpose, components (file table), schema / API surface / access model where applicable, configuration, integration points, and the testing strategy as test *categories*. Step 4 (Implement, formerly Step 3) and Step 5 (Acceptance Reconciliation, formerly Step 4) shift one number along. **Step 6 (Update Documentation, formerly Step 5)** now describes a *finalisation* of `plan.md` — appending the retrospective tail (final test counts, implementation footnotes worth keeping, the `Confirmed YYYY-MM-DD` stamp) — rather than creating the file from scratch.
- **New "Important Behavioural Rule": *Plan is the recovery anchor.*** Anchors the discipline at the top of the file so the model treats the post-gate plan write as a non-optional step, on equal footing with "Consult before building" and "Read first."
- **Step 6 reworded for add and modify intents.** For *add*, the first item changes from "Create or update `plan.md`" to "Finalise `plan.md`" (the bulk already exists from Step 3 — this step appends the retrospective tail and adds the `Confirmed YYYY-MM-DD` line). For *modify*, the plan rewrite happens at Step 3 (intended end state) and Step 6 only appends the retrospective tail. *Remove* is unchanged — `plan.md` is still deleted at Step 6.
- **In-skill cross-references re-numbered.** Every "Step 5" reference elsewhere in `b-feature.md` (the intro line, the UI-reconcile callout in Step 1, the build-order callout, the Step 2 Impact UI sub-bullet, the Step 2 module-integration sub-bullet, the ✓/🚧 marker callout in Step 5, and the ADR-completion sentence) now reads "Step 6", matching the new numbering.
- **`What NOT To Do` gains an entry:** "Do not start coding before `plan.md` is written (Step 3) — the plan is the recovery anchor; writing it only at completion defeats the point."

**Why**

Operating experience surfaced the failure mode. `plan.md` was being written only at the end of the flow, after implementation completed. Mid-implementation crashes therefore left no durable artefact of intent in the feature folder: the design conversation was in the agent's context window (volatile), partial code on disk may not even compile, and the gate-approval was a verbal handshake. Recovery meant reconstructing the plan from `git diff` plus the operator's memory — which is exactly the situation `plan.md` was supposed to prevent.

Re-reading a representative completed `plan.md` revealed that the bulk of its content (purpose, components table, schema, API surface, access model, integration points, testing strategy) is *plannable* — the proposal at the gate already names every one of those sections. Only the retrospective tail — final test counts ("12 cases"), specific implementation footnotes ("hand-edited to reference `\"users\"` unqualified"), and the `Confirmed YYYY-MM-DD` stamp — is genuinely retrospective. Splitting authorship in time keeps the completion-flag function of `plan.md` intact (a `plan.md` without `Confirmed` is not done) while ensuring the gate-time content lives on disk from the moment the gate is passed.

The split also strengthens the gate itself. Today the gate is a verbal handshake on a verbal proposal; with the new Step 3, the model writes the proposal's substance to disk immediately after confirmation — making the agreement a concrete file rather than a conversation artefact. If implementation later drifts from the plan during Step 4, that drift is visible against a written reference.

An alternative considered and ruled out: a "thin plan at gate, full plan at end" two-document approach. Rejected for token cost and drift risk — two documents either duplicate content or fall out of sync, and the cleanest discipline is one file written in two passes against the same headings.

### Migration

None — no project-side changes required. The change is behavioural on the agent's side; existing `plan.md` files from prior versions remain valid as-is. Projects upgrading from v0.15 pick up the new `/b-feature` step ordering on the next session after `scripts/scaffold.sh <project>` (or `/b-upgrade`). After scaffold, the project's `_bower/VERSION` will be at `0.16`. Verify by reading it.

---

## v0.15 — 2026-05-22

### Experience surface: `docs/ui.md` and `/b-ui`; rapid UI iteration as a first-class path

**What changed**

- **New design-layer document `docs/ui.md`.** Top-tier doc, sibling of `architecture.md`, describing the *experience surface* — navigation map, screen inventory, layout grammar, interaction patterns, visual-language pointers. Co-authored, narrative-and-list style, captures invariants rather than pixels. Lazy: exists only when the project has UI work to record.
- **New skill `/b-ui`.** Gated path for *structural and underspecified* UI changes. Mirrors `/b-feature`'s propose-confirm-implement-reconcile spine but is tuned for the experience surface: lighter reading list, proposal includes at least two alternatives where branching choices are real, mock-up-or-description rather than component/caller/contract analysis. Reconciles against `docs/ui.md` and any affected feature plans. Lives at `.claude/commands/b-ui.md`.
- **`_bower/framework.md` gains a new "UI Changes — Paths and the Gate" section.** Names the three-path model: (1) non-structural changes happen ad-hoc with no doc impact; (2) structural-but-tightly-specified changes happen ad-hoc and reconcile `docs/ui.md`; (3) structural-and-underspecified changes invoke `/b-ui`. The gate sits at the moment commitment to branching options is being made, not at structural-ness alone. Architectural changes remain hard-redirected to `/b-design`. The section also documents the commit-discipline assumption: rapid path-1/path-2 work assumes a clean working tree so `git` is the undo button.
- **`_bower/rationale.md` gains a new Core Principle: "Surfaces of Specification."** Frames `docs/ui.md` against the rebuild test ("could someone with docs and no code reproduce a recognisable version of the system?"), explains why pixel-level capture would rot, why the rapid default is deliberate DX, and why the gate sits at branching choices rather than at structural-ness.
- **`_bower/rationale.md` gains a new top-level section: "Two Axes Shape the Trade-offs."** Names the axes — *specifications sufficient for maintenance* and *DX for an indy-style research engineer* — and the discipline of stating where each significant Bower choice sits on the spectrum between them. Future framework decisions inherit this lens.
- **`_bower/framework.md` "What to Update When" table extended** with `ui.md` as a column and rows for "UI change (structural)" and "UI change (visual only)."
- **`.claude/commands/b-feature.md` gains an `<intent_redirects>` block, an intent re-check after Step 1, a UI sub-bullet in Step 2 Impact, and a `docs/ui.md` reconcile in Step 5.** The intro redirect now wraps architectural (hard) and experience-surface (soft) cases as parallel scoped checks the model can find. The intent re-check after the reading list catches UI-heavy work that becomes clear only after reading affected `plan.md` files. The Step 2 Impact UI sub-bullet names which `docs/ui.md` sections will be touched (or `none`). Step 5 reconciles `docs/ui.md` — including creating it when this change introduced the first UI in the project. Mixed work (backend + UI scaffolding for a new feature) stays in `/b-feature`; pure-UI work routes to `/b-ui` or ad-hoc.
- **`.claude/commands/b-design.md` Stage 3 reads `docs/ui.md` on revisions.** Architectural revisions in projects with an interface often shift logic-UI interactions (routing, state, data flow into and out of screens); the existing experience surface is the constraint those edits have to respect. Greenfield is unchanged — `docs/ui.md` is still created lazily on the first path-2 or path-3 change.
- **`.claude/commands/b-ui.md` Important Behavioural Rules gains scoped tag blocks.** `<lighter_path_check>` wraps the "is this skill the right shape?" judgement and adds the "specific shape vs only a goal" anchor. `<branching_judgment>` near Step 2 anchors the alternatives-required call by the same anchor and warns against inventing alternatives just to fill the gate. Step 4 gains a manual-check framing template: state what changed visually, name one or two specific things to look at, *then* ask via AskUserQuestion — compensates for the absence of screenshot tooling.
- **`_bower/framework.md` "UI Changes — Paths and the Gate" gains scoped tag blocks for the model.** `<path_decision>` wraps the three-question procedural test (is this UI? structural? well-specified?) and the 2x2 matrix in one place the model can find. `<path_examples>` lists ~12 concrete request→path mappings as anchors for the structural and well-specified judgements. `<commit_discipline>` replaces the vague clean-tree paragraph with an operational test (check `git status` before non-trivial Path 1 or Path 2 bursts; surface once if dirty and unrelated; "non-trivial" = touches multiple files / includes deletions or renames / can't describe rollback in one sentence).
- **`_bower/framework.md` "Changes made outside `/b-*` commands" list gains three UI rows.** The ad-hoc reconcile list is where the model looks for guidance when no slash command is typed; UI is now a first-class entry there, with rows for visual-only (no doc), structural-and-specified (reconcile `docs/ui.md`), and structural-with-branching-choices (soft-redirect to `/b-ui`). The "UI Changes — Paths and the Gate" section below it remains the explainer; this list is the operational hook.
- **`.claude/commands/b-index.md` reads `docs/ui.md` (not just check for existence)** so the index link can carry a brief description (the file's leading summary if present, otherwise the canonical "Experience surface (navigation, screens, interaction patterns)"). Parallel to how `architecture.md` is scanned for the system overview. The link is also included in `docs/index.md`'s Core System section when the file exists.
- **`_bower/framework.md` "What to Update When" `UI change (visual only)` row** is annotated `— no doc update; git is the undo` in the change-type column so the all-dashes row reads as intentional rather than missing data.
- **`README.md`** gains a brief UI/UX section for external readers, the commands table picks up the `/b-ui` row, and the repository-structure listing names `b-ui.md`.
- **Two new roadmap items added.** *Interface-observation tooling wired into `/b-ui`* — graceful-enhancement integration of an observation tool (e.g. `chrome-devtools-mcp` for web) into `/b-ui` Step 4, so the screenshot-before-confirm replaces today's "go look at it yourself" manual check when the tool is available. *Living invariants for `ui.md` via test harness* — treating invariants written in `docs/ui.md` (modals trap focus, destructive actions are undoable, etc.) as testable contracts asserted by Playwright / Textual / equivalent. Both deferred pending real-project pain: the first is cheap but not worth pre-emptive work, the second is project-specific and likely belongs in `constitution.md` rather than as a framework default.

**Why**

The trigger was real-project observation while scaffolding the next major Bower-based build-out. Bower's discipline works cleanly for backend and architectural work, but the framework had nothing tuned to offer when work shifted to UI iteration. `/b-feature`'s propose-confirm-implement-reconcile cycle is too heavy for "move the icon left a bit" and the wrong shape for "what should this navigation feel like?" — UI iteration is often exploratory rather than committal. A junior engineer using Bower in this regime independently wrote a UI-specific skill to fill the gap; the dissatisfaction was structural, not ergonomic.

Diagnosis split into two gaps:

1. **No doc-of-record for the experience surface.** The existing design-layer docs collectively pass the rebuild test for the backend ("could someone with docs but no code rebuild this?") but fail it for the UI — there's no surface that captures navigation, layout grammar, or interaction patterns at a level that stays stable enough to be useful.
2. **No graduated path for UI work.** The framework offered the architectural hard-redirect (rare) and `/b-feature`'s soft gate (heavy). UI work spans a range — from "move the icon" to "introduce tab navigation" to "redesign the nav system" — and a single gated path serves none of them well.

`docs/ui.md` closes the first gap; the three-path model closes the second. `/b-ui` is deliberately narrower than `/b-feature`: it covers only the structural-and-underspecified subset, which is the case where propose-with-alternatives genuinely pays for itself. Paths 1 and 2 leave the rapid UI iteration loop unobstructed — the agent makes the change, reconciles the doc if structural, moves on. The architectural hard-redirect remains intact; ADR-worthy cross-cutting decisions still get reconciled. What's lifted is the proposal-and-acceptance ceremony for changes that don't warrant it.

The trade-off framing in `rationale.md` is the meta-contribution. Naming the two axes — specs-sufficient-for-maintenance vs DX-for-an-indy-research-engineer — and stating that each significant Bower choice sits visibly on that spectrum makes the design coherent. The UI section sits visibly on the DX side, deliberately; the architectural redirect sits visibly on the specs side; `/b-feature`'s gate sits in the middle. Future framework decisions get the same lens.

A few alternatives considered and ruled out:

- **Extending `scope.md`** to cover the experience surface. Rejected on update-cadence and audience grounds: scope changes when the product roadmap shifts (rare, human-led); a UI surface changes whenever the interface evolves (frequent, agent-led). Co-habiting would either cause noisy scope churn or quiet doc erosion as UI updates skipped scope.md to avoid the friction.
- **A third section in `architecture.md` ("Experience surface")** alongside the existing runtime and software-architecture views. Rejected for similar reasons — `architecture.md` would bloat and the cadence mismatch would still bite. The two-view precedent makes a third view defensible if `ui.md` ever feels overweight in practice, but the separate file is the cleaner starting point.
- **Eager scaffolding of `docs/ui.md` at `/b-design`.** Rejected for v0.15 — many Bower projects (data pipelines, research scripts, CLI tools) have no UI, and a placeholder doc with no reason to be touched is exactly the failure mode that retired `design-decisions.md`. Lazy creation on first path-2 or path-3 change is the discipline. Eager scaffolding remains a candidate for a future revision once the lazy-creation pattern is proven.

### Migration

For projects on v0.14 upgrading to v0.15:

1. **Re-run the scaffold script (or run `/b-upgrade`).** This refreshes `_bower/framework.md` (with the new "UI Changes — Paths and the Gate" section, scoped tag blocks for `<path_decision>` / `<path_examples>` / `<commit_discipline>`, three new UI rows in the "Changes made outside `/b-*` commands" list, and the updated "What to Update When" table), `_bower/rationale.md` (with the new "Surfaces of Specification" principle and the "Two Axes Shape the Trade-offs" section), and `.claude/commands/` (with the new `b-ui.md` skill including `<lighter_path_check>` and `<branching_judgment>` and the manual-check template; the `b-feature.md` `<intent_redirects>` block, intent re-check, Step 2 UI sub-bullet, and Step 5 `docs/ui.md` reconcile; the `b-design.md` Stage 3 read of `docs/ui.md` on revisions; the `b-index.md` read of `docs/ui.md` for index-link description). Mechanical; the agent picks up the new guidance and the new skill on the next session.

2. **No `docs/ui.md` is created retroactively.** The doc is lazy — it exists when there is a UI to describe. If the project has interface work already underway (web, TUI, desktop, or otherwise), the first `/b-ui` invocation (or the first out-of-band structural UI change that triggers the path-2 reconcile) will create `docs/ui.md` with whatever sections that change requires. If the project has no UI, no action is needed.

3. **Backfill `docs/ui.md` from existing interface code.** Judgement-required, not skippable when an interface is present. The point is to bring the project to the same coverage that lazy creation would have produced if `/b-ui` had existed since the interface was first built. "Interface" here is deliberately broad: web frontend, TUI, native desktop, mobile, or any other surface through which a user interacts with the system. `docs/ui.md` is not web-specific.

   **First, detect whether the project has an interface worth documenting.** Check for any of:
   - **Web / Electron / Tauri.** Frontend frameworks declared in `package.json` or equivalent (React, Vue, Svelte, Solid, Next.js, Remix, SvelteKit, etc.); source files like `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`; routing config (Next.js `app/` or `pages/`, React Router, Vue Router, SvelteKit `routes/`); theme/token config (`tailwind.config.*`, `theme.{ts,js}`, `design-tokens.*`).
   - **Python web / dashboard.** Streamlit, Gradio, Dash, FastHTML, Flask/Django with templates, NiceGUI.
   - **TUIs.** Textual, Rich layouts, urwid, blessed, prompt-toolkit (Python); Bubble Tea, tview (Go); Ratatui (Rust); Ink (Node).
   - **Native desktop GUI.** Qt / PyQt / PySide / QML, GTK / PyGObject, wxPython / wxWidgets, Tkinter, JavaFX, Avalonia, WPF, AppKit / SwiftUI, Jetpack Compose Desktop.
   - **Mobile.** SwiftUI / UIKit (iOS), Jetpack Compose / Android Views, React Native, Flutter.
   - **Source layout.** Files under `frontend/`, `web/`, `ui/`, `client/`, `gui/`, `tui/`, `views/`, `screens/`, `components/`, `app/`, or framework-conventional locations for any of the above.

   If none of these are present, the project has no interface surface; write a one-line note in the upgrade self-assessment ("no interface surface detected — `docs/ui.md` not backfilled") and proceed. Do not create an empty `ui.md`.

   **Surface the detection result before drafting.** Use AskUserQuestion to name what was detected and what will be written: "I detected an interface surface (web frontend / TUI / desktop / etc.) at <paths>. I'll read <entry point, N representative screens, theme/token config> and draft `docs/ui.md` with sections: <list>. Confirm to proceed, or tell me what to adjust (false positive, different files to read, different sections)." This is the cheap gate — letting the operator correct misreadings of the code *before* a draft exists is much cheaper than correcting a wrong draft.

   **If an interface is present, draft the doc.** Read enough of the code to identify invariants — do not attempt a complete tour. Sufficient reads typically include:
   - The entry point or routing/screen definitions, to map navigation between views/screens.
   - A representative sample of screens/views/components (the 3–5 most-touched, or the most architecturally typical) to identify layout grammar and interaction patterns.
   - Any shared layout, theme, or style configuration (token files for web, stylesheet conventions for desktop, colour/typography conventions for TUI).

   **Draft `docs/ui.md` with sections that apply.** The doc covers whichever surface the project has — adapt terminology accordingly. Use only sections that have content; do not invent empty headers. Typical sections:
   - `## Navigation` — top-level routes / views / screens and how they relate (small tree or list).
   - `## Screens` (or `## Views`) — one line per screen, naming purpose and key components.
   - `## Layout grammar` — shared patterns across screens (header/sidebar/content for web; window/panel/widget arrangement for desktop; focus regions, panes, and split layouts for TUI).
   - `## Interaction patterns` — modal vs inline editing, notification/toast/status-line placement, dismissal and undo conventions, keyboard and focus model, command-palette / hotkey conventions.
   - `## Visual language` (web/desktop) or `## Style conventions` (TUI) — pointers to the token/theme/palette config files (not the contents). For TUIs, the colour palette and typography conventions; for desktop, the theme/QSS/stylesheet pointers.

   **Aim for invariants, not implementation detail.** What stays stable as the interface evolves is what belongs in the doc. Pixel positions, character offsets, exact copy strings, and per-component implementation belong in code. If a section is reading like a layout spec or a stylesheet, compress it back to the pattern level.

   **Present the draft to the operator before writing.** Use AskUserQuestion: "I've drafted an initial `docs/ui.md` from the existing interface code. Confirm to commit, or tell me what to adjust." This is the gate that lets the operator correct misreadings of the code before the doc is committed.

   For minimal interfaces (a single Streamlit demo, a one-screen TUI, a CLI with light formatting), a one-paragraph `docs/ui.md` is fine. Capture what little structure exists; the doc grows if and when the interface does.

4. **No source code changes required.** No ADR schema changes. No changes to existing `architecture.md`, `scope.md`, `module-status.md`, `plan.md`, or `status.md` formats.

5. **`/b-design` Stage 3 now reads `docs/ui.md` on revisions** — no project-side migration work; the change is behavioural on the agent's side. On greenfield, Stage 3 still does not draft `docs/ui.md` — that's deferred until the lazy-creation pattern is proven in practice.

After step 1, the project's `_bower/VERSION` will be at `0.15`.

---

## v0.14 — 2026-05-19

### Ad-hoc reconcile convention; "Holding the Line on Architecture" principle; default `.claude/settings.json`

**What changed**

- **`_bower/framework.md` gains a new Working Convention: "Changes made outside `/b-*` commands."** Mirrors the existing "Before touching any component" rule as its *after* counterpart. When a change happens by direct request rather than through a `/b-*` skill, the agent applies the same reconcile the skill would have applied — `status.md` for code changes, `plan.md` for behavioural shifts, `/b-adr` for cross-cutting decisions, redirect to `/b-feature add` for new features, redirect to `/b-design` for architectural changes. The redirect is *soft* (operator may confirm "just do it") for features, decisions, and bug fixes; *hard* for architectural changes, where the agent refuses ad-hoc work and recommends `/b-design` regardless of operator instruction.
- **`_bower/rationale.md` gains a new Core Principle: "Holding the Line on Architecture."** Names the soft/hard distinction as a framework-wide principle and gives the lens for future judgement calls: soft where bypass is small and recoverable, hard where bypass is the failure mode the framework exists to prevent. Architectural changes earn the hard line because the architectural gate is the reason a project adopted Bower over vibe coding.
- **New template `_bower/project-settings.json`.** Default `.claude/settings.json` seeded into new projects with safe read-only Bash permissions Bower skills routinely use (`find docs:*`, `find _bower:*`, `find .claude:*`, `ls:*`, `git status:*`, `git diff:*`, `git log:*`, `git show:*`, `git branch:*`, `rg:*`, `grep:*`, `wc:*`). Cuts permission-prompt friction during normal Bower work without granting any write or destructive permissions.
- **Scaffold scripts updated.** `scripts/scaffold.sh` and `scripts/scaffold.ps1` now seed `<target>/.claude/settings.json` from `_bower/project-settings.json` if absent. Preserved on subsequent scaffolds — the project owns the file once seeded. The template file is excluded from the routine `_bower/` refresh (sibling of `project-CLAUDE.md`'s exclusion).
- **New roadmap item: "Package Bower as a Claude Code plugin."** Plugin-based distribution would replace the scaffold-script model and let plugin updates absorb the framework-file-copying half of `/b-upgrade`. Deferred until Bower reaches solid beta — packaging into a fixed distribution channel before the framework's shape settles would churn the package against framework evolution. Trigger to revisit: solid beta.

**Why**

The trigger was reading Anthropic's *Claude Code in Large Codebases* guidance and comparing it line-by-line against Bower. Three of its recommendations had a genuine fit with Bower's small-project remit: shared `.claude/settings.json` permissions (cuts daily friction), a session-level mechanism to reconcile docs when work happens outside structured commands, and plugin packaging for distribution. The fourth — `.claudeignore` — was dropped after consideration: Claude Code already respects `.gitignore`, so the case for shipping a default exclusion list in Bower projects (which are typically small and clean) is thin.

The reconcile convention is the centrepiece. Bower's discipline lives in the `/b-*` skills, but operators often work conversationally — "fix this bug", "tweak X" — without invoking a skill. Without a convention, those changes leave `status.md` and `plan.md` to rot; with one, the agent applies the same reconcile inline. A hook-based mechanism was considered and rejected: hooks fire every turn and would either be noisy (firing mid-flow) or require ad-hoc detection of "is this a real handoff?" — both fragile. Putting the reconcile into framework guidance and trusting the model is more Bower-shaped: the rest of the framework is instruction-driven, not mechanism-driven, and the after-rule symmetric-pairs cleanly with the existing "Before touching any component" before-rule.

The soft/hard distinction was the substantive design question. Architecture is what Bower exists to protect: the propose-and-confirm gate of `/b-design`, the ADR record of why a decision was made, the module-boundary discipline. An operator who casually asks for an architectural change mid-conversation is, in that moment, side-stepping the very protection they signed up for. A *soft* redirect there would defeat the purpose; a *hard* redirect — the agent refuses ad-hoc and recommends `/b-design` — is the framework keeping faith with the discipline the operator chose. For everyday changes, where bypass is small and recoverable, soft is right: opinionated but not coercive. Naming the principle in `rationale.md` makes the lens explicit so future framework decisions about "should this be soft or hard?" have something to reflect on.

The default `settings.json` is the smallest of the three changes but earns its place by being friction reduction with no downside. Read-only patterns; no destructive permissions; the project owns the file after first scaffold and can edit freely. Existing projects with a settings.json keep it; new projects get the defaults out of the box.

### Migration

For projects on v0.13 upgrading to v0.14:

1. Re-run the scaffold script against the project (`scripts/scaffold.sh <project>` or `scripts\scaffold.ps1 <project>` from the framework repo). This refreshes `_bower/framework.md` (with the new "Changes made outside `/b-*` commands" working convention) and `_bower/rationale.md` (with the "Holding the Line on Architecture" Core Principle). The agent picks up the new guidance on the next session.

2. **If the project has no `.claude/settings.json`:** the scaffold will create one from `_bower/project-settings.json` with safe read-only Bash defaults. No further action.

3. **If the project already has `.claude/settings.json`:** the scaffold preserves it. To pick up Bower's read-only defaults, open `_bower/project-settings.json` (now present in the project after scaffold) and merge any of its `permissions.allow` entries that aren't already in the project's `settings.json`. The entries are namespaced enough (`find docs:*`, `git diff:*`, etc.) that conflict with project-specific permissions is unlikely; merge is additive. This is a one-time manual step. Mechanical, no judgement required.

4. **No content backfill required.** No existing project files need editing for the framework-guidance changes; the new working convention and rationale principle are read by the agent going forward. No ADR schema change, no doc-shape change.

5. **No source code changes required.**

After step 1, the project's `_bower/VERSION` will be at `0.14`. Verify by reading it.

---

## v0.13 — 2026-05-19

### Per-project version stamp; `/b-upgrade` skill walks migrations against `_bower/changes.md`

**What changed**

- **`_bower/VERSION`** is now the canonical framework version — a single-line file in the framework repo, scaffolded into projects on first install, then owned by `/b-upgrade` in the project. The `# Bower Framework vX.Y` heading in `_bower/framework.md` remains as a human-visible label but tooling reads `VERSION`. Bump both in the same commit when releasing a framework change.
- **`_bower/SOURCE`** is a new per-project file holding the git URL of the framework repo to clone from when `/b-upgrade` runs. Seeded by the scaffold script from the framework repo's `origin` remote on first install; preserved on subsequent scaffolds so forks/mirrors stay pointed at the right upstream.
- **`scripts/scaffold.sh` and `scaffold.ps1` updated.** Both now preserve `_bower/VERSION` and `_bower/SOURCE` if they already exist in the target (`VERSION` because the project owns it after first install; `SOURCE` because the project may legitimately point at a fork). Scaffold reads `_bower/VERSION` as the canonical version source, prints the framework's current version, and, when the project was on an older version, prints a hint to run `/b-upgrade` next.
- **New skill `/b-upgrade`.** Runs in a Bower project. Requires a clean git working tree. Clones the framework repo (URL from `_bower/SOURCE`) into a temp directory, runs the scaffold against the project to refresh `_bower/` and `.claude/`, then walks each intermediate version's migration notes from `_bower/changes.md` in order — one version at a time, gating each step, bumping `_bower/VERSION` after each, optionally committing between steps. Ends with a candid self-assessment paragraph so the operator can decide whether to `git reset --hard` if a step looks wrong. Lives at `.claude/commands/b-upgrade.md`.
- **Contributor `CLAUDE.md` gains a "Migration-notes authoring discipline" section.** Codifies the convention that each `_bower/changes.md` entry should carry a `### Migration` subheading (or, for legacy entries, the existing `**Migration notes**` paragraph) written for a model audience: self-contained, explicit about files and actions, "none" when there's no work, with judgement-required steps flagged. The discipline is load-bearing because `/b-upgrade` reads one version's notes at a time, often against project state that has drifted from the version the notes were written for.
- **`_bower/framework.md` gains entries for the new files** (`VERSION`, `SOURCE`) and a Maintenance subsection in the commands list documenting `/b-upgrade`.

**Why**

The framework's adoption is starting to show signs of moving past the original two-or-three users. Even at this scale, manual upgrades — the user hand-running scaffold, then writing a per-version prompt describing the backfill work — are a friction tax that compounds as the version count grows. Worse, they're inconsistent: each project's upgrade is whatever the operator remembered to ask for, with no audit trail of what was actually applied.

A deterministic migration script was ruled out: Bower's artifacts are unstructured prose (`architecture.md` sections, `module-status.md` notes, ADRs) and the migrations are often "read each module's existing content and synthesise a new section." That's exactly the work LLMs do well and deterministic code does badly. The right shape is a model-driven walk with strong guardrails: clean-git precondition (so `git reset --hard` is always a valid escape), one-version-at-a-time stepping (so each migration sees the state the previous step produced), per-step gating (so the operator can abort mid-run), and a candid self-assessment at the end (so the operator has a basis for deciding whether to trust the result).

The walk-versions-sequentially shape mirrors traditional database migrations and addresses the multi-version-jump risk: a project at v0.10 upgrading to v0.13 applies v0.11's notes, then v0.12's, then v0.13's, with VERSION moving step-by-step. This matches the mental model contributors already have when writing migration notes — each note describes the delta from the previous version, not from some arbitrary baseline.

The "artifacts jump to latest, only VERSION moves step-by-step" choice (vs. checking out per-version tags and scaffolding each in turn) keeps the framework lighter — no tag discipline required, no multiple scaffold runs — and is sufficient because migration notes are now expected to be self-contained per version. If a future change makes per-version artifact state matter (e.g. a migration that depends on an old format of a framework file), the tag-based approach is the upgrade path; until then this is unnecessary complexity.

### Migration

For existing Bower projects on v0.12, the upgrade to v0.13 is mechanical:

1. Run `scripts/scaffold.sh <project>` (or `scaffold.ps1`) from the framework repo against the project. The scaffold will refresh `_bower/` and `.claude/`, and — because the project has no `_bower/VERSION` yet — seed `_bower/VERSION` at `0.13` and `_bower/SOURCE` from the framework repo's `origin` remote.
2. No project files need editing. There is no content backfill for this version — the change is entirely in framework tooling and contributor discipline.
3. Future upgrades (v0.13 → v0.14 and onwards) will run via `/b-upgrade` in the project rather than manual scaffold. On first use, verify the project's `_bower/SOURCE` points at the framework repo you intend to upgrade from.

For projects on v0.11 or earlier: complete the v0.12 migration first (replace the project's `CLAUDE.md` framework body with `@_bower/framework.md`), then run scaffold once for the combined v0.12 + v0.13 upgrade.

No source code changes required. No changes to ADR schema, design-layer doc formats, or any `/b-*` skill other than the new `/b-upgrade`.

---

## v0.12 — 2026-05-19

### Framework guidance extracted to `_bower/framework.md`; scaffold script added

**What changed**

- **Framework guidance moved out of the project's `CLAUDE.md`.** The body that used to live in a Bower project's `CLAUDE.md` (Core Principles, Navigation, Document Layers, Status Markers, ADR conventions, Commands, etc.) now lives in `_bower/framework.md`. A project's `CLAUDE.md` becomes a thin shim that `@`-includes it, plus a `## Project-Specific Code Standards` section the project owns.
- **New template seed:** `_bower/project-CLAUDE.md` is the starter `CLAUDE.md` used when scaffolding a new project. It is a template, not a live instruction file in this repo — the scaffold script copies it to `<target>/CLAUDE.md` only when the target has no existing `CLAUDE.md`.
- **New scaffold script:** `scripts/scaffold.sh <target-dir>` (bash, with `scripts/scaffold.ps1` as a PowerShell equivalent for Windows) copies `_bower/` (excluding `project-CLAUDE.md`) and `.claude/agents/` + `.claude/commands/` into the target. It seeds `CLAUDE.md` only if one doesn't exist; otherwise it leaves the existing one alone. Idempotent — re-running upgrades a project to the current framework version.
- **The repo-root `CLAUDE.md` is now contributor-facing only.** It instructs the agent that this repo *is* the framework: edit framework files directly, do not invoke `/b-*` skills on this repo, log every change in `_bower/changes.md`. It points to the framework reference files (`rationale.md`, `roadmap.md`, `brief-schema.md`, `changes.md`, `framework.md`) that matter when changing framework behaviour.

**Why**

The project's `CLAUDE.md` was carrying ~200 lines of framework guidance that the user neither wrote nor wanted to maintain — and that buried the *user's* content (project standards, conventions, anything specific to their codebase) at the bottom of a wall of framework text. v0.12 gives `CLAUDE.md` back to the user: their file is now a short, hand-curated document of their own content, with a single `@_bower/framework.md` line pulling in the framework guidance. The framework's bulk lives in `_bower/`, where it belongs — encapsulated, versioned, and refreshable by re-running the scaffold script without ever touching the user's CLAUDE.md.

A secondary benefit: this repo (the framework source) and a Bower project no longer share the same `CLAUDE.md` shape. The repo-root `CLAUDE.md` here is now unambiguously contributor-facing, which removes a recurring source of confusion when working on Bower itself.

**Migration notes (for existing Bower projects)**

1. Replace the framework body of your project's `CLAUDE.md` (everything from the v0.11 `# Bower Framework v0.11` heading down through `## Framework Reference`) with a single line: `@_bower/framework.md`. Keep your project's title heading above it and your `## Project-Specific Code Standards` (or equivalent) below it.
2. Run `scripts/scaffold.sh <your-project-dir>` from this repo to refresh `_bower/` and the `.claude/` agents and commands. Your CLAUDE.md is preserved because it already exists.
3. Verify your project's CLAUDE.md now resolves the framework guidance via the include (the `@`-include is relative to the CLAUDE.md's own location, so `@_bower/framework.md` works as long as `_bower/` is a sibling of `CLAUDE.md`).

---

## v0.11 — 2026-05-18

### `architecture.md` becomes a two-view document: runtime + software architecture

**What changed**

- **`architecture.md` is now contractually a two-view document.** The existing content — topology, components, data flow, technology stack, constraints, extension points — is the **runtime view** (how the system *runs*). A new **software architecture view** (`## Software architecture` section) is the home for module decomposition (how the *code* is carved up): each Bower module gets an entry with its purpose, the data concern that justifies its boundary, constituent features, and inter-module dependencies (depends on / consumed by).
- **`/b-design` Stage 3 updated.** Drafting rules name both views explicitly. Greenfield drafts both; revisions edit only the views the brief flags. A cross-stage rule binds Stage 4 to Stage 3: every `new module` operation in Stage 4 requires a corresponding software-architecture entry in Stage 3, surfaced at the gate as a brief inconsistency if absent.
- **Brief schema (`_bower/brief-schema.md`) updated.** Stage 3's section now reports runtime-view deltas and software-architecture deltas as distinct subsections. The analyst is required to emit a software-architecture entry whenever Stage 4 lists a new module — the consistency check is part of brief generation, not deferred to Stage 3.
- **CLAUDE.md updated.** The Module Definition section gains a pointer to where boundary rationale lives. The Navigation pointer and the Documentation Structure description for `architecture.md` both note the dual-view shape. The "What to Update When" table flips the "New module" cell for `architecture.md` from `Maybe` to `Yes`.
- **`_bower/rationale.md` gains a paragraph** under Feature Modules explaining the two-senses-of-architecture problem and why both views live together in one document with named sections.

**Why**

The trigger was a real-project observation on the first production Bower build-out (Lyrebird): when reading along to follow Claude Code's reasoning during feature implementation, the *runtime view* of the system was richly documented in `architecture.md` (topology, components, data flows across the wire), but the *software view* — why these Bower modules and not others, what binds the features inside each one, what depends on what across modules — was nowhere. The module decomposition was implicit in the existence of `docs/modules/` directories but had no narrative home in any design-layer doc. `module-status.md` is deliberately operational and terse; `architecture.md` was answering "how does it run?" but not "how is the code carved up?"

Two distinct senses of "architecture" exist in common engineering usage — system/deployment architecture and software/code architecture — and Bower's previous `architecture.md` contract conflated them by listing only runtime-view sections. Splitting the document into two named views resolves the conflation without inventing a new file. A separate `module-decomposition.md` or per-module `module.md` was considered and ruled out: the maintenance cost of a new co-authored design-layer doc isn't justified when an existing one can absorb a named section, and the two views explain one another so co-locating them is preferable to splitting them.

The cross-stage rule (Stage 4 `new module` ⇒ Stage 3 software-architecture entry) closes a consistency gap that would otherwise leak partial state: without it, a brief could add a module in Stage 4 and omit its software-architecture entry, leaving the new module visible in `module-status.md` and absent from the architectural narrative. Enforcing the link at brief-generation time means `/b-design` sees the inconsistency before it writes anything.

**Migration notes**

- Existing projects on v0.10: replace `.claude/commands/b-design.md` and `_bower/brief-schema.md` from the v0.11 reference. Update `CLAUDE.md` (version line, Module Definition pointer, Navigation pointer for `architecture.md`, Documentation Structure description for `architecture.md`, and the "What to Update When" table cell for "New module" → `architecture.md`). Update `_bower/rationale.md` to add the boundary-rationale paragraph under Feature Modules.
- **Forward-only migration for project `architecture.md` files.** Existing projects' `architecture.md` will not have the `## Software architecture` section. v0.11 does not retroactively scaffold it. The section will materialise naturally on the next `/b-design` that introduces a new module (Stage 3 will create it as part of the new module's entry). For projects that want the section sooner, do it by hand: list each existing module with its purpose, data-concern boundary, constituent features, and inter-module dependencies. This is a one-shot exercise typically measured in tens of minutes per project.
- **Partial-section trap.** If a v0.10-era project's first post-upgrade `/b-design` adds a new module *without* a prior manual backfill, Stage 3 will create the `## Software architecture` section with only the new module's entry — leaving existing modules silently absent. Either backfill first, or pair the design pass with a manual write-up of the existing modules' entries.
- No changes to ADR schema, `plan.md`, `status.md`, `module-status.md`, `scope.md`, `problem-space.md`, or `constitution.md` formats.
- No source code changes required.

---

## v0.10 — 2026-05-15

### Change brief and analyst subagent; `/b-design` becomes a six-stage delta-against-current-state flow

**What changed**

- **New subagent: `bower-analyst`.** First subagent in the Bower framework. Read-only — restricted to `Read, Glob, Grep, Bash` — survey-shaped, single-output. Given a proposed change and a project root, it reads the project's design state and produces a **change brief** identifying, per future `/b-design` stage, whether there's a delta and what it looks like. Lives at `.claude/agents/bower-analyst.md`.
- **New artifact: `_bower/brief-schema.md`.** The change brief's structured schema — section ordering, status sentinels, ID pre-allocation rules, and a worked example using a deliberately fictional project (a Pantry recipe app, chosen to prevent prompt anchoring when the schema is read alongside a real test case). The brief is the contract between `bower-analyst` and `/b-design`.
- **New command: `/b-analysis`.** Thin spawner — invokes the `bower-analyst` subagent against a change description and prints its brief verbatim. Useful as a standalone inspection tool ("what would `/b-design` do for this change?") before committing to execute. Same subagent that runs at `/b-design` Stage 0.
- **`/b-design` reshaped to six stages.** Stage 0 spawns `bower-analyst`, gates on the brief, locks it as the contract. Stages 1–5 execute against the confirmed brief rather than re-deriving applicability at each stage. Stages with `Status: nothing to do` emit a one-line acknowledgment and proceed without a gate; only stages with delta have content gates.
- **Per-stage writes.** Each stage with non-nil delta writes its files immediately after its content gate. The 0.9 "Writing Design Outputs" consolidated write step is gone; each stage is self-contained.
- **ADR IDs are pre-allocated in the brief.** Stage 2 operations carry real IDs (e.g. `new ADR-0034`); other stages cross-reference these IDs verbatim when drafting `scope.md`, `architecture.md`, or `plan.md` edits. This prevents the ordering bug where Stage 1 would write `ADR-NNNN` literals that downstream stages were expected to backfill. `/b-design` Stage 2 verifies the pre-allocation against current `docs/adr/` state and surfaces any drift.
- **Stage 4 expanded to cover plan touches on revisions.** The 0.9 Stage 4 was framed around module-directory creation (greenfield). The 0.10 Stage 4 explicitly handles all four kinds of edits: plan touches (revisions), build-order updates, integration-note refreshes, and new modules. The brief's `## Stage 4` section names each touch with a one-line reason.

**Why**

The trigger was the recognition that significant projects spend long stretches in a design-first phase — accruing ADRs and module plans before code lands — and that even after code exists, cross-cutting changes that touch architecture, decisions, or scope are common enough to need an everyday command, not a heavy ceremony. The 0.9 `/b-design` was the right tool but the wrong shape for that work: its five stages always ran in full, with each stage doing its own applicability check, even for revisions where three stages had nothing to do. Operators avoided it; `/b-feature` got stretched past its scope to compensate.

The deeper concern was LLM behaviour around branching logic. A prompt full of "if X then A else B" tends to produce thin versions of *both* A and B rather than committing cleanly to one. The fix is to evaluate the conditions once, up front, and emit a structured plan; then execute against the plan without re-evaluating. The `bower-analyst` is the once-up-front evaluator; the brief is the plan; `/b-design` Stages 1–5 are pure execution. Separating the two also pays a context-window dividend — the analyst loads the project's docs into its own isolated context; the main agent works against the compact brief.

The pre-allocation of ADR IDs was a discovered fix during phase-2 testing on a real project: without it, Stage 1's drafts that cross-referenced new ADRs had no real ID to use, so the agent inserted `ADR-NNNN` literals that would have been written to disk on gate confirmation. Pre-allocation in the brief is the structural fix — IDs become available to every stage, not just the one that creates the file. This is a small thing structurally but it's the difference between the flow working and producing broken cross-references.

**Migration notes**

- Existing projects on v0.9: copy four artifacts from the bower-framework reference, replacing the v0.9 file where applicable:
  - `.claude/agents/bower-analyst.md` (new — first subagent definition)
  - `.claude/commands/b-analysis.md` (new)
  - `.claude/commands/b-design.md` (replace)
  - `_bower/brief-schema.md` (new)
- CLAUDE.md updates: bump the framework version line to v0.10; update the `/b-design` description to reflect Stage 0 + delta execution; add a `/b-analysis` entry under the orientation commands; add `_bower/brief-schema.md` to the Framework Reference list.
- No changes to existing ADRs, `plan.md`, `status.md`, `module-status.md`, `scope.md`, `architecture.md`, `problem-space.md`, or `constitution.md` formats. Existing project content is untouched.
- No source code changes required.

---

## v0.9 — 2026-05-05

### Architectural Decision Records replace `design-decisions.md`; `/b-feature` reconcile gains a decision-drift prompt; new `/b-adr` command

**What changed**

- **`docs/design/design-decisions.md` is retired.** The single-doc, human-owned, design-time-only decision document had a structural rot problem: no command had cause to update it post-MVP, the ownership rule discouraged agents from amending it, and decisions made during everyday `/b-feature` work landed nowhere durable. It is replaced by a per-file decision log at `docs/adr/`.
- **New schema: Architectural Decision Records (ADRs).** Each ADR is a separate file, named `NNNN-kebab-case-title.md`, with a fixed frontmatter and a four-section body (`Context`, `Decision`, `Consequences`, `Alternatives considered`). Bodies are immutable once accepted; reversals are written as new ADRs that supersede the old, with both files updated in one commit. Frontmatter is intentionally trim — `id`, `title`, `status`, `date`, `modules`, `supersedes`, `superseded-by`. The `modules` field is omitted entirely for cross-cutting decisions (no sentinels). Status values are `accepted`, `superseded`, `deprecated` — three states for decisions that have landed. Bower's gate-driven workflow has no need for `proposed` (decisions are confirmed at gates before being written) or `rejected` (paths-not-taken belong in `## Alternatives considered` of the ADR that did land).
- **`docs/adr/index.md` is the canonical access surface.** Regenerated by `/b-index` from frontmatter. It doubles as the schema reference for the project — humans navigate it, agents read it instead of grepping frontmatter directly. This means schema evolution is a one-place change (the index regenerator) and old ADRs missing a newer field just don't populate that facet rather than breaking searches.
- **New command `/b-adr`.** Scaffolds a new ADR or supersedes an existing one. Auto-increments ID, fills date, prompts the four body sections, and (for supersession) writes both the new ADR and the frontmatter update to the older ADR in one pass. Called from `/b-feature` and `/b-design`; can be invoked directly when a decision needs recording outside those flows.
- **`/b-design` Stage 2 emits ADRs.** On greenfield, each confirmed Stage 2 decision becomes one ADR (`status: accepted`) written directly without per-decision gating — the user already confirmed them in aggregate at the Stage 2 gate. On revisions, Stage 2 first loads the existing ADR baseline and frames the exercise as "what changes among these?" — new IDs increment from the highest existing prefix, supersessions update the older ADR's frontmatter in the same commit. Stage 3's architecture synthesis cross-references ADRs by ID rather than restating decisions; Stage 4 module planning consults ADRs as inputs to the module rubric. Writing-outputs section no longer creates `docs/design/design-decisions.md`.
- **`/b-feature` Step 1 loads relevant ADRs.** The agent reads `docs/adr/index.md`, then opens accepted ADRs that either list the affected module under `modules`, are cross-cutting (no `modules` field), or have a title topically relevant to the change (so a decision filed under module A still surfaces when feature B touches the same topic). These are surfaced as constraints in Step 2's proposal under a new **Decision impact** field. ADRs that contradict current code are flagged at the gate as candidates for supersession.
- **`/b-feature` Step 4 gains a Decision reconciliation step.** After acceptance criteria are reconciled, the agent reviews each touched ADR: confirmed → no action; contradicted/drifted → invoke `/b-adr` with the ADR-ID being superseded; narrowed → invoke `/b-adr` for a partial-supersession ADR (new ADR; old stays accepted); new cross-cutting decision → invoke `/b-adr` to record it. This is the command-driven update ritual that `design-decisions.md` lacked — and the reason ADRs are expected not to rot.
- **`/b-module` parallels `/b-feature`** — Step 1 loads relevant ADRs; Step 2 includes a Decision impact field; Step 4 reconciles decisions before finalising.
- **`/b-integration` Step 1 loads relevant ADRs; Step 4 surfaces ADR drift.** The integration test is expected to honour decisions that bear on it (e.g. an ADR mandating real-DB integration tests rules out mock fixtures). If writing the test surfaces a contradiction between an accepted ADR and the code or constitution, `/b-integration` flags it in the handoff and recommends `/b-adr` to supersede before the marker flips to ✓.
- **`/b-index` regenerates `docs/adr/index.md` alongside `docs/index.md`.** The ADR index includes a fixed schema-reference section (boilerplate, written verbatim every time), and tables for module-scoped active decisions, cross-cutting active decisions, and superseded/deprecated decisions. Cross-cutting and module-scoped ADRs are split by whether the `modules` frontmatter field is present.
- **`/b-spec` reads from `docs/adr/`** instead of `docs/design/design-decisions.md`. Synthesises accepted ADRs into the spec's Design Decisions section as narrative; skips superseded entries.
- **CLAUDE.md gains an ADR section.** Documents the schema, lifecycle rules (immutability, supersession, partial supersession), access pattern (via index, not direct grep), and the **code-is-truth, ADR-is-hypothesis** posture: an accepted ADR records what was decided, not necessarily what the code currently does; verify against the code before relying on it.

**Why**

The trigger was a recognition that `design-decisions.md` was systematically rotting. The combination of "human-owned" semantics (agent told not to edit unprompted) and "only touched at `/b-design`" meant the doc was effectively frozen the moment the project got interesting. Decisions made during `/b-feature` work — which is the bulk of post-MVP activity — landed in conversation context and disappeared.

The deeper concern was decision rot's effect on agent reasoning. A model that reads a stale design-decisions doc forms beliefs from it, often subtly. The ADR shape addresses this on three axes:

1. **Per-file immutability** preserves the audit trail without requiring agent self-discipline. You don't edit; you supersede.
2. **Status as filter** gives the agent a cheap way to ignore history during normal reads. `accepted` only.
3. **Index-as-schema** means access patterns don't break when the schema evolves. Old files don't become invalid; they just contribute to fewer facets.

The `/b-feature` reconcile prompt is the load-bearing piece. Without a command that asks "did this introduce or invalidate a decision?" at the right moment, ADRs would rot the same way `design-decisions.md` did. With it, ADRs become living docs because the existing flow has reason to touch them.

The `modules` frontmatter field is the access mechanism that makes per-file decisions tractable. Instead of every command reading every ADR, `/b-feature` loads only the ADRs whose `modules` matches the change (plus cross-cutting ones with no `modules` field). This is what justifies the per-file shape — it would be unworkable without filtered retrieval.

**Migration notes**

- Existing projects on v0.8 with `docs/design/design-decisions.md` content: convert each substantive decision in that document to an ADR by hand. Set `date` to the original commit date if recoverable from git, otherwise to the current date. Status is `accepted` for decisions still in force, `superseded` (with a `superseded-by` link) for decisions that have been overridden by later commits. Once converted, delete `docs/design/design-decisions.md`. There is no migration tooling — the conversion is a one-pass manual exercise; ADRs are short enough that this is a small task even on projects with several decisions on record. Run `/b-index` after conversion to generate the ADR index.
- Existing projects on v0.8: replace the `.claude/commands/b-*.md` files with the v0.9 set. The new `/b-adr` command must be added; the others are updates in place.
- Existing projects with no `design-decisions.md` content yet: just adopt v0.9. The first ADR will be written when the next design decision occurs.
- `/b-design` no longer creates `docs/design/design-decisions.md`. If your project's CLAUDE.md or constitution references that file, update the references to point at `docs/adr/`.
- The `_bower/roadmap.md` does not gain a new entry — ADRs were not previously roadmapped; this is a discovered improvement rather than a deferred one.
- No source code changes required.

---

## v0.8 — 2026-05-04

### Module-integration tests are first-class; literal-command handoffs everywhere; commands renamed to `/b-*`; design router collapsed; `/b-feature` made explicit about modify/remove intents

**What changed**

- **Command prefix renamed from `/bower-*` to `/b-*`.** Every slash command now uses a one-letter namespace: `/b-design`, `/b-feature`, `/b-module`, `/b-integration`, `/b-recap`, `/b-index`, `/b-spec`. Saves keystrokes per invocation while keeping a namespace to avoid collision with Claude Code built-ins or other plugins. No alias kept — documentation is the migration path.
- **`/b-design` and `/b-design-full` collapsed.** The old `/b-design` was a router that asked the user "is this Full Design or Lightweight Change?" and dispatched accordingly. In practice that decision is one the user has already made by the time they type a command, and `/b-feature` already redirects back to design when a request turns out to need architectural change. The router added a step without adding judgement. `/b-design` now *is* the five-stage design (the former `/b-design-full`); `/b-feature` covers everything else. Two design-side entry points become one.
- **`/b-feature` reframed as the universal change command.** Previously titled "Lightweight Change" with framing biased toward additive feature work, the command now explicitly covers three intents — **add**, **modify**, **remove** — with intent-specific guidance in Step 5 (Update Documentation). Step 1 gains a clause for modify/remove: read sibling features' `plan.md` files in the same module to find outbound references to the behaviour being changed, so cross-feature ripple isn't missed. Step 2 Impact requires *naming the specific `plan.md` files that need updating* rather than a generic "documentation" line. Step 5 add-intent explicitly appends the new feature to `## Build order` (the build order is a living document post-MVP, not a Stage-4 contract). Step 5 also routes the `Next move:` to `/b-integration <module>` when the change shifted what the integration test must assert. CLAUDE.md gains a "Post-MVP Work: When to Use Which" section codifying the bias toward `/b-feature` and the narrow trigger for `/b-design`.
- New command **`/b-integration <module>`** — gate-implement-reconcile flow scoped to a single deliverable: the module-boundary integration test. Mirrors `/b-feature`'s shape. Reads `module-status.md`'s integration prose plus each feature's `plan.md`, proposes a concrete file path and assertions, gates before writing, runs the test, and flips the module-integration marker on success.
- New schema in `module-status.md`: a `## Module integration` section with its own status marker, populated at design time and maintained as the integration test is built.

  ```markdown
  ## Module integration
  Test: <path or "not yet defined"> — ⏸ | 🚧 | ✓ | 🟡 | 🔴
  Notes: <one-line behavioural description carried forward from Stage 4>
  ```

- **Literal-command handoff rule** — every command that emits a "next move" (in `status.md`, in handoff blocks, in `/b-recap` output) must name the exact slash command to type next, not free prose. Variants like "write the integration test" are out; `Run /b-integration <module>` is in. Applies to `/b-feature`, `/b-module`, `/b-design`, `/b-recap`, and `/b-integration` itself.
- **Module-level marker is now a floor, not a sum.** `/b-index` computes a module's status as the worst of (its feature markers, its module-integration marker). A module with all features ✓ but integration ⏸ surfaces as 🚧, not ✓ — making the constitution's verified-for-✓ rule observable rather than aspirational.
- `/b-recap` now flags "all features ✓, module integration ⏸" explicitly and recommends `/b-integration <module>` as the next move.
- `/b-design` Stage 4 / writing step populates the new `## Module integration` section in each `module-status.md` placeholder, with `Test: not yet defined — ⏸` and the integration prose carried into `Notes:`.
- `/b-module` Step 4/5 now flips the new marker on the in-pass integration test (behavioural parity, just bookkeeping).

**Why**

Real-project use surfaced two coupled gaps:

1. When a module is built feature-by-feature with `/b-feature`, the module-integration test ends up as a residual with no command, scaffold, or marker. The constitution says ✓ requires the module integration test to pass — but no command enforces this and the test routinely went unbuilt.
2. Resumption pointers in `status.md` files varied in specificity. "Next move: write the integration test" sends the operator hunting; "Next move: `/b-integration foundation`" doesn't. Inconsistent handoffs eat the orientation budget that `status.md` and `/b-recap` exist to protect.

The two changes reinforce each other: a first-class command gives the handoff something concrete to point at, and the literal-command rule guarantees it gets pointed to.

**Migration notes**

- Existing projects on v0.7: each `module-status.md` should gain a `## Module integration` section. Hand-edit once; the schema is two lines plus a notes line. Set the marker to ✓ if the integration test exists and passes, ⏸ if not yet built, or 🟡/🔴 if known broken.
- Existing projects on v0.7: replace the `.claude/commands/bower-*.md` files with the v0.8 `b-*.md` set (drop in from this repo). Old `/bower-*` invocations will stop resolving — use `/b-*` instead. Update any project-level docs that mention the old command names.
- The `/b-design-full` command is gone; what was `/b-design-full` is now just `/b-design`. There is no separate router. Update any project-level docs that referenced `/b-design-full`.
- `/b-index` will start surfacing modules with all features ✓ but integration ⏸ as 🚧. This is a reporting change, not a regression — it reveals state that was always true.
- No source code changes required.
