# Bower Framework Changes

Versioned log of framework changes. Most recent first. Each entry: what changed, why, and any migration notes for projects already on a previous version.

This file is the changelog for the *framework itself* — not for projects built with it. Project-level history belongs in git.

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
