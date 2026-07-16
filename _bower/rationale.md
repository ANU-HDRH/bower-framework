# Bower Framework — Rationale

## What Bower Is

Bower is a development pattern for AI-assisted software engineering. It provides structure for planning, documenting, and implementing software projects where AI coding assistants are first-class participants in the workflow.

The pattern optimises for:
- Small teams (solo to ~5 people) building research software
- Projects that span from prototype to maintained infrastructure
- Rapid iteration without sacrificing maintainability
- AI agents that need to discover context efficiently

## Two Axes Shape the Trade-offs

Bower's choices navigate two axes that pull in different directions:

- **Specifications sufficient for maintenance.** Enough documentation that someone — human or agent — could rebuild the system or take over its maintenance without the original engineer's tacit knowledge. The operational form of this is the rebuild test: hand someone `docs/` and no code, could they reproduce a recognisable version of the system? Each design-layer doc earns its place because removing it breaks that test.
- **Developer experience for an indy-style research engineer.** Velocity-first, minimal ceremony, deliberate redirects rather than process cages. The framework is opinionated about what to do but light about how to do it. Friction is paid only where it protects something genuinely worth protecting.

These pull against each other. Maximal specs at every gate would yield a maintainable but unusable framework; maximal DX with no specs would be vibe coding. Every significant Bower choice sits somewhere on the spectrum between them, and naming where each choice sits is part of the design discipline.

A few visible examples of where the trade-off has been resolved:

- The **architectural hard-redirect** favours specs absolutely: `/b-design` is required for architectural changes regardless of operator instruction, because architectural drift is the failure mode Bower exists to prevent.
- **`/b-feature`'s propose-confirm-reconcile gate** sits in the middle: a small ceremony is paid in exchange for durable documentation of feature changes and a recorded acceptance contract.
- **UI's three-path model** (see [`framework.md`](./framework.md) → *UI Changes — Paths and the Gate*) favours DX for the everyday case: ad-hoc visual and well-specified structural changes skip the gate, and only structural-and-underspecified changes invoke `/b-ui`. The protection that remains is the architectural hard-redirect.
- **Living documentation** serves both axes: temporal docs are a tax on maintenance (the agent reads contradictory phase-N artifacts) and on DX (the engineer writes them); a single current-state doc is cheaper to maintain and clearer to read.

When proposing new framework conventions, name which axis the convention favours and what's being traded. Anything that costs both axes is unlikely to earn its keep.

## Core Principles

### Planning Before Building

AI coding tools make it cheap to write code and expensive to write the *wrong* code. Bower invests the productivity dividend into planning — understanding the problem, making deliberate design choices, and documenting intent *before* implementation begins.

This isn't process theatre. It's acknowledging that the hardest part of software is deciding what to build, not building it.

### Living Documentation

All documents in `docs/` represent the *current state* of the system, not historical records. When authentication changes, you update `modules/auth/plan.md` — you don't create `phase-08-auth-fix.md`.

Git history is the change log. Documents are the map.

This matters especially for AI agents: temporal documentation (phase-01, phase-02) creates contradictory context that degrades AI performance. A single, current source of truth is both human-friendly and machine-friendly.

### Feature Modules

Features are grouped into modules — logical system boundaries that persist across the project lifecycle. During initial build, modules suggest a development sequence. Post-MVP, they define integration boundaries and testing scope.

This contrasts with phase-based organisation where groupings are temporal (what we built in week 1) rather than structural (what handles authentication). Temporal groupings become meaningless the moment the build phase ends.

**Module rubric.** The definition that makes "related features" concrete: *a module is a set of features that share data concerns and can be meaningfully integration-tested together.* Data concerns are the underlying property; shared integration tests are the observable consequence. If two feature sets don't share data and don't warrant a shared integration test, they belong in separate modules. This gives the agent and the engineer something concrete to reason about at Stage 4 of full design, instead of a judgement call without scaffolding.

**DAG in the positive form.** Conventional wisdom on module architecture says "dependencies must form a DAG — no cycles, no lower-level modules importing from higher-level ones." Bower deliberately states this in the positive form rather than as an enforcement rule: if a module can be meaningfully integration-tested in isolation, its dependencies are well-formed by construction. If it can't — if writing the integration test drags in half the system, or the test is awkward because of back-channels between modules — the rubric has been violated and the module boundaries have eroded. The agent's job at that point is to notice and surface it ("this module's boundaries are tangled, consider a refactor"), not to enforce a static DAG check. This keeps Bower lightweight: no graph analyser, no import-direction linter, just the rubric and the agent's judgement at the moment integration-testing actually happens.

**Where the boundary rationale lives — and why architecture.md has two views.** "Architecture" carries two distinct senses in common engineering usage: the *runtime/system* view (boxes-and-arrows of how the system runs — topology, components, data flow across the wire) and the *software/code* view (how the source is carved up into modules and why). Bower's `architecture.md` is contractually a two-view document: a runtime view first, then a `## Software architecture` section listing each module's purpose, its data-concern boundary, its constituent features, and its inter-module dependencies. Both views in one file with named sections — not two files — because the views explain one another (topology grounds the module decomposition; the decomposition reveals which parts of the topology each module owns) and splitting them across files forces a cross-reference every time. The alternative — a per-module `module.md` design doc — was considered and rejected: a third co-authored design-layer doc earns its keep only if it carries information the other two can't, and the boundary rationale fits naturally as a section of architecture.md. `module-status.md` is deliberately operational (build order, integration marker) and is the wrong home for narrative *why*; the software-architecture view is.

### AI-Readable Context

The documentation structure is designed for discoverability:
- `CLAUDE.md` loads automatically and provides navigation pointers
- `docs/index.md` gives the full project map with status at a glance
- `plan.md` files contain source locations, eliminating search
- Status markers are machine-parseable

### Two-Layer Documentation Model

Bower documents split into two layers by *audience* and *style*, not by directory:

- **Design layer** (`architecture.md`, `design/problem-space.md`, `adr/`, `constitution.md`, `scope.md`) — humans primary, agents consult on demand. Narrative prose, explains *why*, tolerates length, decision-oriented. ADRs are the structured exception: each is short and follows a fixed schema, but their content is design-layer (the *why* of cross-cutting commitments) and they're accessed through their generated index, not searched directly.
- **Operational layer** (`modules/**/plan.md`, `modules/**/status.md`, `module-status.md`, `index.md`) — agents primary, humans consult on demand. Terse bullets, tables, pointers. No narrative. Word budgets enforced on volatile docs (status.md ~150 words, module-status.md ~200 words).

Audience drives style. A narrative `status.md` wastes the agent's context window; a bulleted `architecture.md` loses the reasoning that makes the design defensible. Naming the layers makes the split deliberate rather than accidental and gives the phased-précis rule and word budgets a principled home — operational-layer docs are compression-mandatory because they're on the hot path of agent attention.

### Scope as Current State

`docs/scope.md` is a *present-state* document: what's in scope now, what's been explicitly deferred, which success criteria are met or unmet. It is deliberately distinct from `problem-space.md`, which is framing history — frozen at Stage 1 of full design, capturing the problem as originally understood. When reality shifts, `scope.md` is updated in place; `problem-space.md` stays as the Day-1 snapshot. Keeping the two apart prevents either from doing the other's job badly.

### ADRs as Decision Log

The earlier `docs/design/design-decisions.md` was a single narrative document, human-owned and only touched at design time. Post-MVP it rotted: no command had reason to update it, the ownership rule discouraged agents from amending it, and decisions made during everyday `/b-feature` work landed nowhere durable. ADRs (Architectural Decision Records) replace that document with a per-file decision log at `docs/adr/`.

The shape solves three problems at once. **Per-file immutability** gives you the audit trail for free — bodies are never edited; reversals are written as new ADRs that supersede the old, with both files updated in one commit. **Frontmatter-driven retrieval** replaces full-doc reads with filtered loads: `/b-feature` opens only the ADRs whose `modules` field matches the change at hand (or that are cross-cutting, with no `modules` field). **Status as the live filter** lets the agent ignore historical decisions during normal reads: `accepted` is "what's true now," everything else is record-keeping.

A small but load-bearing convention: `docs/adr/index.md` is the canonical access surface, regenerated by `/b-index` from frontmatter, and it doubles as the schema reference. This means schema evolution is a one-place change rather than a corpus migration — old ADRs missing a newer field just don't populate that facet. Agents never grep frontmatter directly; they read the index and open individual ADRs only when one is relevant. Direct grepping is a smell that means the index isn't doing its job.

The posture toward ADRs is the same as the posture toward memory in Claude Code: **read them as hypotheses, verify against current code before relying on them.** An `accepted` ADR records what the project *decided*, not what the code currently *does*. Drift happens — libraries get swapped, flags get removed — and the right response when an ADR contradicts the code is to supersede the ADR, not silently trust it. This framing is what stops the doc from poisoning agent reasoning when entries inevitably get stale.

ADR creation is wired into the existing flow rather than relying on operator memory. `/b-design` Stage 2 emits one ADR per major design decision. `/b-feature` reconcile prompts the agent to write a new ADR (or supersede an existing one) whenever the change introduced or invalidated a cross-cutting decision. Without that reconcile-step prompt, the framework would be back to the same failure mode that retired `design-decisions.md`: a doc with no command-driven reason to be touched.

ADRs are sized for the project profile Bower is built around — 1–3 people, agent-as-frequent-reader, no enterprise audit obligation. The discipline is **brevity over completeness**: ~150 words typical, 300 ceiling, with `## Consequences` optional and `## Context` written as a pointer to framing docs rather than a restatement of them. An ADR may bundle several closely-related commitments under one coherent umbrella title — splitting every sub-decision into its own file inflates the index without helping the agent, and fights what the model already wants to do when reasoning about a meaningful unit of software. The split test is the title: if it can honestly cover the scope, the ADR is one decision even when the body names several. `## Alternatives considered` is the one section that earns growth, because "why x and not y" is the trace neither code nor commit history reliably preserves.

### Holding the Line on Architecture

Bower asks the operator to invest in design discipline — propose-and-confirm gates, ADRs, module boundaries, living documentation. That investment only pays off if the discipline is actually maintained: a project that bypasses `/b-design` whenever the operator is in a hurry rots into the same shape as a project that never used Bower at all.

Most everyday changes (features, bug fixes, decision shifts) can absorb a *soft* redirect. When work happens outside a `/b-*` skill, the agent surfaces what should have happened, applies a best-effort reconcile of the relevant docs, and lets the operator confirm whether to proceed ad-hoc. The operator retains discretion; the framework is opinionated but not coercive.

Architectural changes are different. The reason someone chose Bower over vibe coding is the assurance that architecture won't be made on the fly — that introducing a new module, swapping a technology, or reshaping data flow goes through a gate that surfaces alternatives, considers consequences, and records the rationale. An operator who casually asks "just refactor this into a new module" mid-conversation is, in that moment, side-stepping the very protection they signed up for; they're trusting the framework to remember the discipline they're momentarily setting aside. The redirect here is *hard*: the agent refuses to make the architectural change ad-hoc, names what's architectural about it, and recommends `/b-design`.

The principle is symmetric. Soft where the cost of bypass is small and recoverable; hard where bypass is the failure mode the framework exists to prevent. Apply the same lens when adding new conventions or commands: if breaking the rule sometimes is fine, the redirect is soft; if breaking the rule undoes the framework's premise, the redirect is hard. Most rules sit on the soft side — Bower is a lightweight framework, not a process cage — but the few hard rules earn that status precisely because they protect what the rest of the framework is built around.

### Surfaces of Specification

The set of design-layer docs — `architecture.md`, ADRs, `scope.md`, `constitution.md`, `problem-space.md` — earns its keep by passing the rebuild test: someone with `docs/` and no code could reproduce a recognisable version of the system. Architecture covers topology and module decomposition, ADRs cover decision rationale, scope covers what's in, constitution covers conventions, problem-space covers framing. Each is load-bearing because removing it breaks the rebuild.

Run that test on a project with an interface — web frontend, TUI, desktop GUI, mobile, or otherwise — and the gap becomes visible: the docs name the features but not the *experience surface* — no navigation map, no layout grammar, no inventory of screens, no interaction patterns. Someone rebuilding from docs alone would produce a different app that happened to satisfy the feature list. The features pass the rebuild test; the UI fails it.

`docs/ui.md` exists to close that gap. It is design-layer, co-authored, narrative-and-list, with the same disposition as `architecture.md` but covering a different axis: architecture describes the *runtime / code* view, ui.md describes the *experience* view. The two are orthogonal — a single UI module in `architecture.md` can host ten screens with a complex navigation; the views explain different things. They sit alongside, not nested.

Three choices distinguish the surface:

**Invariants, not pixels.** Pixel-level UI changes every commit; a doc at that granularity is a maintenance tax nobody pays and the agent stops trusting. `ui.md` records what stays stable: navigation, layout grammar, interaction patterns, visual-language pointers. Code remains the truth at the pixel level — same posture as the *code is truth, ADR is hypothesis* rule applied to a different surface.

**Rapid paths are the default; the skill is for branching choices.** UI iteration is exploratory in a way feature work usually isn't — operators often discover the right answer by trying, not by designing it up front. The framework leans into that with the three-path model in [`framework.md`](./framework.md): non-structural changes happen ad-hoc with no doc impact, structural-but-specified changes happen ad-hoc and reconcile `ui.md`, and structural-and-underspecified changes invoke `/b-ui` for propose-with-alternatives. The gate sits at the moment commitment to options is being made, not at every UI tweak. Structural-ness alone does not warrant a gate; *branching choices* do.

**Lazy creation.** `docs/ui.md` does not exist in projects without a UI, and is not scaffolded eagerly even in projects that will have one. The first structural UI change creates it with whatever sections are relevant; the doc grows as the UI grows. This avoids the failure mode that retired `design-decisions.md`: a doc with no command-driven reason to be touched. Here the reason is built in — every path 2 or path 3 change reconciles it.

The DX trade-off here is sharp and visible. Path 1 and Path 2 are fast because they skip the gate; the cost is that bad iterations are recovered by `git`, not by an in-tool undo. That's a deliberate position on the *DX vs specs* axis named in the introduction: speed is favoured for the everyday case, with the architectural hard-redirect and the no-ad-hoc-cross-cutting-decisions rule remaining as the only behavioural guards. Out-of-band UI chat is, by design, cheaper than out-of-band feature chat — read that as the point, not as a hole.

### Review as Reconciliation, not Record

`/b-review` exists because a sequential, feature-at-a-time build systematically misses properties that are only visible once a module is whole — interaction coverage, doc↔code drift, cross-feature inconsistency, ADR drift, boundary erosion. These are *emergent at module scope*, which is why the review unit is the module (not the feature, which the implementer just saw with full context; not the project, which is `/b-recap`'s breadth) and why the trigger is module completion.

The design problem a review raises is what to *do* with the findings. Dumping them to chat is poor — the operator's job becomes reading and sorting, and "yeah, fix all that" is the likely response, which puts a batch of changes through no process at all. But persisting the findings as a report invites the failure mode Bower exists to prevent: a record with no owner and no expiry that rots and poisons context, exactly what retired `design-decisions.md` and what the temporal-doc ban targets. The resolution is to recognise that **a report rots, but a plan dies.** What lands on disk is not the findings — it is the *accepted subset*, written as a `review-plan.md` checklist that has an owner (the apply pass) and a death condition (deletion when every item is checked). The triage gate is the filter that converts findings into a plan: rejected findings evaporate with no trace, which is correct, because un-actioned findings are noise you don't want preserved. This is the deferred *durable-ephemeral proposals on disk* roadmap item, instantiated for the review use-case — the session-boundary pain it was waiting on is a multi-step reconciliation that crosses a crash.

The volume of out-of-band change a review produces looks alarming against the framework's gate discipline, and isn't. A review fix pass batches only changes that are *individually* ad-hoc-safe under rules already written: doc↔code reconciles (gate-free living-doc maintenance), test backfill for already-agreed behaviour, status-marker corrections, and ADR supersessions (themselves gated by `/b-adr`). The one category that is not safe — boundary erosion — is *routed* to `/b-design` and never enters the plan. So the command owns what is safe to own and routes what isn't; the architectural hard-redirect holds unchanged. This is the same symmetry as *Holding the Line on Architecture*: soft where bypass is recoverable, hard where bypass is the failure mode.

On the two axes: review favours *specifications sufficient for maintenance* — it actively closes the gap between docs and code that living documentation assumes but cannot enforce — while paying for it on the DX axis only at module boundaries, optionally, behind a single gate. That it is *optional* (offered, not forced) and *batched* (one gate, not one per finding) is the concession to DX: a small project that doesn't want the pass can skip it, and a large one pays the ceremony once per completed module rather than continuously.

A note on what review deliberately *won't* do with ADRs. The temptation is to have it trim verbose or over-scoped ADRs — but bodies are immutable once accepted, and verbosity is not a supersede-worthy reason (only a changed decision is). So review's ADR dimension is *drift detection only*: an accepted ADR that contradicts the code. Where a bundled ADR's commitments were hard to recover because the index shows only titles, review records that as a non-actionable observation — which is precisely the failure signal the deferred ADR-index-summary improvement is waiting on. Review generates the signal; it does not pre-empt the index change.

## Roadmap

Deferred framework improvements live in [`_bower/roadmap.md`](./roadmap.md), each with a revisit trigger. Anything named but not yet acted on belongs there, not in active docs.

## Relationship to Existing Patterns

### What We Borrow from SpecKit

[SpecKit](https://github.com/github/spec-kit) is GitHub's spec-driven development toolkit. Bower borrows its planning discipline — the idea that specification precedes implementation — and its constitution concept for project-wide conventions.

Where we diverge: SpecKit uses sequential phases (phase-01-auth, phase-02-pdf) that create temporal documentation artifacts. These rot quickly in maintenance. Bower uses modules that persist as living system boundaries.

### What We Borrow from OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) pioneered living specs and explicit change tracking for brownfield codebases. Bower adopts its single-source-of-truth philosophy and status tracking.

Where we diverge: OpenSpec's proposal → review → implement → archive workflow adds ceremony that small research teams don't need. For solo or small-team work, git commits provide sufficient change tracking without parallel structures.

### Why This Direction

Research software engineering has specific characteristics that neither SpecKit nor OpenSpec fully addresses:

1. **Team size is small.** Review overhead of formal change proposals isn't justified. You need planning discipline without process overhead.
2. **Velocity matters, but so does maintainability.** Projects have research output pressure but also need to survive handoff or revisiting months later.
3. **Projects evolve unpredictably.** What starts as "quick test" often becomes critical infrastructure. The pattern works at both ends without switching methodologies.
4. **AI assistance is the norm, not the exception.** Documentation structure should serve AI discoverability as a primary concern, not an afterthought.

## This Implementation

Bower v2 implements these principles through Claude Code's native capabilities:

### Always-Loaded Context (CLAUDE.md)

The reference layer — principles, file layout, status markers, and update rules — lives in `CLAUDE.md` which Claude Code loads automatically into every conversation. This means the agent always knows how the project is structured and what conventions to follow, without being told.

### Slash Commands for Workflow

Process knowledge lives in commands, not documents the agent has to interpret:

- **`/b-design`** — Six-stage design process for new projects and architectural revisions. Stage 0 spawns the `bower-analyst` subagent to produce a **change brief**; Stages 1–5 execute against the confirmed brief, with stages of no delta emitting "nothing to do" cleanly. Emits one ADR per Stage 2 `new`/`supersedes`/`partial-supersedes` operation.
- **`/b-feature`** — Everyday change command (add / modify / remove) with one gate before implementation; loads relevant ADRs at propose time and reconciles decision drift before close
- **`/b-ui`** — Gated path for structural-and-underspecified UI changes; mirrors `/b-feature`'s shape but tuned for the experience surface and reconciles against `docs/ui.md`. Most UI work skips the skill — the framework's three-path model covers ad-hoc visual and well-specified structural changes
- **`/b-module`** — Build a whole module in one pass when it's small and well-specified
- **`/b-integration`** — Build the module-boundary integration test
- **`/b-adr`** — Scaffold a new ADR (or supersede an existing one); called from `/b-feature` and `/b-design`, or directly when needed
- **`/b-recap`** — Read-only orientation across the current project state
- **`/b-analysis`** — Read-only diagnostic. Spawns `bower-analyst` directly and prints the change brief `/b-design` would consume — useful as inspection before committing to execute
- **`/b-index`** — Deterministic index regeneration for both `docs/index.md` and `docs/adr/index.md`
- **`/b-spec`** — Export a single specification document

### Subagents for Isolated Analysis and Execution

Some Bower commands spawn subagents (via Claude Code's Agent tool) when a stage of work benefits from an isolated context. Three commands do this. `/b-design` Stage 0 spawns the `bower-analyst` subagent, which reads the project's design state and emits a **change brief** conforming to `_bower/brief-schema.md`; the brief tells `/b-design` what each subsequent stage needs to do, including the legitimate outcome of "nothing to do," and Stages 1–5 execute against the confirmed brief rather than re-deriving applicability. `/b-review` spawns the `bower-reviewer` subagent, which surveys one completed module and emits a **review report** conforming to `_bower/review-schema.md`; the command gates the findings and reconciles or routes each one. `/b-feature` Step 4 spawns the `bower-implementer` subagent, which receives the approved `plan.md` and a curated packet (criteria, constraining ADRs, architecture sections, testing conventions), implements and tests the change in a fresh context, and returns an **implementation report** the command reconciles against.

The pattern: split analysis from execution. The subagent works in isolated context against a focused prompt and produces a structured artifact; the main command works against that artifact, not against re-derived branching logic. This addresses an LLM behavioural failure mode — prompts full of "if X then A else B" tend to produce thin versions of all branches rather than committing cleanly to one — by collapsing the conditional decision to a single up-front evaluation. The brief (or report) is data; the flow that consumes it is execution.

For `/b-review` there is a second reason the isolation matters, beyond context economy: **adversarial freshness**. The agent that implemented the module has every rationalisation for the current code already in context and is biased to read it as correct. A subagent given only the docs, the acceptance criteria, the ADRs, and the code — with a skeptical, drift-hunting prompt — is structurally better at catching where the build diverged from what it was supposed to be. The fresh pair of eyes is not a metaphor; it is what the isolated context buys.

For `/b-feature` the justification is different again: **context economy at the recovery-anchor boundary**. Observed in practice, single-context `/b-feature` runs regularly reached 250–300k tokens — orientation, proposal, gate, implementation mechanics, and reconciliation all accumulating in one window, with the late-session growth dominated by long chains of granular read/edit/test turns. The post-gate `plan.md` was already the crash-recovery anchor; delegating implementation to a fresh agent uses the same boundary deliberately, so the planning context never absorbs the implementation mechanics. `bower-implementer` is the first *write-capable* subagent in the set, and that is safe by construction: it executes an already-gated plan rather than forming intent, its write surface is bounded (source, tests, and minor-divergence `plan.md` edits — never status docs, ADRs, or architecture), and every path that needs a decision returns a `DIVERGED-STOPPED` report to the orchestrator, which re-gates with the user. The propose stage of `/b-feature` remains inline — it is focused, gate-adjacent work that is faster and clearer without an Agent round-trip.

Subagents are not the default. They earn their place when (a) the stage genuinely benefits from isolated context, (b) the output has a stable shape the main flow can execute against, and (c) the round-trip cost is amortised by the work that follows. `/b-module` still implements inline — deliberately: the delegation pattern gets validated on the everyday command before being extended to the batch one (see `_bower/roadmap.md`). The threshold is deliberate — adding subagents reflexively to every command would dilute the pattern and add cost without compounding benefit.

### Consultation Gates (AskUserQuestion)

Every workflow gate uses the AskUserQuestion tool to present findings and wait for explicit confirmation. The agent recommends; the engineer decides. This is a deliberate design choice — we're building with engineers who expect to be consulted on design decisions, not presented with fait accompli.

### Heavy and Light Paths

Not all changes need the same process, but Bower doesn't ask the user to declare which they want — the user picks the command directly:

- **`/b-design`** — For new projects or architectural changes. Five stages with hard gates: problem framing → design decisions → architecture synthesis → module planning → scaffolding.
- **`/b-feature`** — For features, fixes, modifications, and removals within existing architecture. Propose changes and acceptance criteria, confirm, implement. Redirects to `/b-design` if the request turns out to need architectural treatment.

The bias post-MVP is toward `/b-feature`. The boundary between "architectural" and "lightweight" is a human judgement call, but `/b-feature`'s redirect is the safety net for "I picked wrong."

### Acceptance as Contract

In the lightweight flow, acceptance criteria are proposed *before* implementation and confirmed as part of the gate. They're the contract between engineer and agent — "here's what I'll build and here's how we'll know it works." This applies whether verification is automated tests, manual checks, or both.

## Credit

Developed by the **HASS Digital Research Hub** at the **Australian National University** for research software engineering community use. MIT licensed.
