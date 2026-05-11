# Bower Design

You are running the Bower design process. This is a five-stage workflow that produces the design documentation and runnable scaffolding for a project or major architectural change. Use it for greenfield projects and for architectural revisions of existing ones. You write documentation and scaffolding files; you do NOT implement features in this workflow.

For feature-scoped or fix-scoped work within an existing architecture, use `/b-feature` instead — it has its own propose-and-confirm gate, and will redirect back here if a request turns out to need architectural change.

The user's description of what they want to design: $ARGUMENTS

## Important Behavioural Rules

- **Consult at every gate.** Use AskUserQuestion at the end of each stage before proceeding. Present your findings, analysis, or draft and ask for confirmation, corrections, or elaboration. The user is an engineer — they expect to review and shape decisions, not rubber-stamp them.
- **Recommend, don't dictate.** When presenting options, mark one as (recommended) with a brief rationale, but make it clear the user chooses.
- **Literal-command handoff.** The post-design handoff names the exact slash command to type next, never free prose.
- **Stay in your stage.** Do not skip ahead. Each stage's output informs the next.
- **Write docs, not code.** This workflow produces documentation files only.
- **Read before writing.** If `docs/architecture.md`, `docs/design/`, `docs/adr/`, or `docs/index.md` already exist, read them first. You are extending or revising, not starting from scratch unless the project is genuinely new. For revisions, accepted ADRs that are still true should be left alone; ADRs that the revision contradicts should be superseded by new ADRs (do not edit existing ADR bodies).

## Stage 1: Problem Framing

**Goal:** Establish what we're solving, for whom, and within what constraints.

**Process:**
1. Read any existing project documentation (architecture.md, design/, scope.md, README, etc.)
2. Analyse the user's description alongside existing context
3. Draft the problem framing covering:
   - The problem and who has it
   - Current alternatives and why they're insufficient
   - Success criteria (how we'll know it worked)
   - Scope boundaries (in/out)
   - Constraints (technical, time, policy, resource)
4. Draft the initial scope statement alongside the framing:
   - Current scope — what we're building now
   - Current non-goals — what we've explicitly deferred
   - Success criteria with initial met/unmet state (all unmet at project start)

Scope is a *present-state* document distinct from problem framing, which is framing history. Both are produced at Stage 1 but serve different lifecycles.

**Gate:** Present the problem framing *and* initial scope to the user via AskUserQuestion. Ask:
- "Does this capture the problem accurately, and is the initial scope right? Anything missing, wrong, or out of scope that should be in (or vice versa)?"

Wait for confirmation before proceeding.

## Stage 2: Design Decisions

**Goal:** Explore the solution space and make key architectural choices. Each confirmed decision becomes an ADR in `docs/adr/`.

**Process:**
1. **If `docs/adr/` already exists, load existing ADRs first.** Read `docs/adr/index.md` and open accepted ADRs — they are the current decision baseline. New decisions either add to that baseline, supersede entries, or partially supersede them. Frame Stage 2 as "what changes among these?", not "what should we decide?" with no context.
2. Based on the confirmed problem framing (and the existing baseline, if any), identify the major design decisions that need to be made — or revisited.
3. For each decision, explore options with trade-offs:
   - What approaches are available
   - Pros and cons of each
   - Which you recommend and why
4. Consider: technology choices, architectural patterns, data flow, integration points, and anything the problem framing's constraints bear on
5. For each decision, classify its relationship to the existing baseline: **new** (no prior ADR), **supersedes ADR-NNNN** (replaces an existing decision), **partial-supersession of ADR-NNNN** (scopes an exception; both stay accepted), or **confirms ADR-NNNN** (no new ADR needed; existing is reaffirmed).

**Gate:** Present the design decisions to the user via AskUserQuestion. For each decision, show options, your recommendation, and the relationship to existing ADRs (if any). Ask:
- "Here are the key decisions I see. Do you agree with these choices? Any decisions I've missed, or options you'd prefer?"

Wait for confirmation before proceeding.

**ADR emission.** After confirmation, write one ADR per *new* or *superseding* confirmed decision to `docs/adr/`. Decisions classified as "confirms ADR-NNNN" need no new ADR. Use the schema and lifecycle described in `CLAUDE.md` and in `/b-adr`.

- **ID computation.** Scan `docs/adr/*.md` filenames for the highest existing `NNNN-` prefix; new IDs are that number + 1, incrementing in the order decisions were enumerated. If `docs/adr/` is empty or missing, the first ID is `0001`.
- **Modules field.** Stage 2 ADRs are typically cross-cutting (omit `modules:`) — module-scoped ADRs more often emerge at Stage 4 or post-MVP.
- **Status.** `accepted`.
- **Supersession bookkeeping.** For decisions that supersede an existing ADR, add `supersedes: [ADR-NNNN]` to the new ADR and update the older ADR's frontmatter (`status: superseded`, `superseded-by: [<new-id>]`). Bodies of older ADRs stay untouched. All affected files in this commit.

Skipping the per-ADR `/b-adr` gate is intentional — the Stage 2 gate is the contract, and running `/b-adr` for each decision would re-confirm what's already confirmed. Write the files directly and surface the list of ADR IDs created (and any supersession relationships) in the Stage 3 input.

## Stage 3: Architecture Synthesis

**Goal:** Synthesise confirmed decisions into a coherent system design.

**Process:**
1. Based on confirmed decisions, draft the architecture covering:
   - System overview (2-3 sentences on what this system does)
   - Key components and their responsibilities
   - Data flow through the system
   - Technology stack
   - Key design decisions (cross-reference ADRs by ID, e.g. "see ADR-0003 for the storage choice" — do not restate the decision text)
   - Known constraints
   - Extension points
2. If revising existing architecture, clearly identify what changes and what stays

**Gate:** Present the architecture to the user via AskUserQuestion. Ask:
- "Does this architecture hold together? Any components missing, or interactions that don't make sense?"

Wait for confirmation before proceeding.

## Stage 4: Module Planning

**Goal:** Break the architecture into implementable modules and establish build order.

**Process:**
1. Re-read the ADRs from Stage 2 (and any pre-existing accepted ADRs on revision projects) — some decisions shape what counts as a sensible module boundary or constrain what tests look like at module boundaries (e.g. an ADR mandating real-DB integration tests). Treat them as inputs to the rubric below, not as bookkeeping.
2. Apply the module rubric explicitly. *A module is a set of features that share data concerns and can be meaningfully integration-tested together.* Data concerns are the underlying property; shared integration tests are the observable consequence. If two feature sets don't share data and don't warrant a shared integration test, they belong in separate modules.
3. Identify logical modules — groups of related features that form system boundaries under the rubric above.
4. For each module, capture:
   - Features/components it contains
   - What data is shared across those features (one sentence)
   - What integration test(s) would make sense at the module boundary (one sentence)
   - What it depends on (other modules, external systems)
   - Brief description of its purpose
   - **Intra-module build order** — an ordered list of the features within this module, reflecting internal dependencies. This is architectural thinking and belongs here, not at implementation time.
5. Determine inter-module build order based on dependencies
6. Identify which modules can be built in parallel

**Gate:** Present the module breakdown, intra-module build order for each module, and inter-module build order to the user via AskUserQuestion. For each proposed module, show the shared-data and integration-test rationale alongside the ordered feature list. Ask:
- "Given the data-concerns and integration-test rationale shown, does this breakdown hold? Is the build order right (both within and across modules)? Any features in the wrong module?"

Wait for confirmation before proceeding.

## Writing Design Outputs

After Stages 1–4 are confirmed, write the documentation files:

1. **`docs/design/problem-space.md`** — From Stage 1 (framing history)
2. **`docs/scope.md`** — From Stage 1 (current scope, non-goals, success criteria with met/unmet state)
3. **`docs/adr/NNNN-*.md`** — One ADR per confirmed Stage 2 decision (already written at the end of Stage 2; verify they are present)
4. **`docs/architecture.md`** — From Stage 3 (update if exists). Cross-reference ADRs by ID rather than restating decisions.
5. **`docs/index.md`** — Populated with module structure from Stage 4, all marked ⏸ Planned
6. **`docs/adr/index.md`** — Generated from ADR frontmatter (run `/b-index` or write directly per the schema in `b-index.md`)
7. **`docs/modules/<module-name>/module-status.md`** (one per module) — Placeholder with:
   - A `## Module integration` section: `Test: not yet defined — ⏸` and a `Notes:` line carrying the one-sentence integration-test rationale from Stage 4.
   - A `## Build order` section listing the module's features in order, each marked ⏸.

Create directories as needed. If `docs/constitution.md` doesn't exist, create it following the conventions described in the project's CLAUDE.md.

Do not create feature `plan.md` or `status.md` — those belong to implementation (`/b-feature` or `/b-module`).

## Stage 5: Scaffolding

**Goal:** Produce a runnable project skeleton aligned with Stage 2's technology decisions, before any feature work begins.

**Process:**

1. Detect current state of the repository. For each scaffolding artifact, determine whether it's *missing*, *present* (leave alone), or *stock* (present but from framework/boilerplate and should be archived/replaced).

2. Build a scaffolding plan covering (only include items genuinely needed):
   - **Package manifest** — `package.json`, `pyproject.toml`, `Cargo.toml`, etc. per Stage 2 decisions. Skip if present.
   - **README.md** — If a stock README exists (e.g. from `create-*` tooling, or from adopting Bower itself), move it to `_bower/original-README.md` and generate a project-specific README drawn from `scope.md` and `architecture.md`. The new README must include a short "Built with Bower" section linking to `_bower/original-README.md` for the framework's own README.
   - **.gitignore** — Stack-appropriate. Skip if present and adequate.
   - **Linter / formatter config** — per Stage 2 decisions.
   - **Test runner setup** — per the testing approach in `constitution.md`.
   - **Directory skeleton** — create empty module directories matching the Stage 4 breakdown (the `module-status.md` placeholders have already been written above).

3. For **existing projects** (architectural revision rather than greenfield), scaffolding is delta-only: detect what's already present and propose only what's genuinely missing or changed. If everything is in place, state "scaffolding already present, nothing to do" and proceed to the handoff.

**Gate:** Present the scaffolding plan via AskUserQuestion. List each action as *create* / *modify* / *archive* / *skip (already present)*. Recommend defaults; let the user strike items. Ask:
- "Here's the scaffolding plan. Confirm to proceed, or tell me what to adjust or skip."

After confirmation, execute the plan.

## Post-Design Handoff

Once Stage 5 is complete (or skipped as a no-op), emit an explicit handoff block. This is the only end-of-workflow output — do not also print a generic file summary.

The block must include:

1. **Confirmation** — "Design and scaffolding complete."
2. **Suggested commit point** — A proposed commit message covering the design docs and scaffolding. Advisory only: do **not** run `git commit` yourself.
3. **Next move** — The first module in the inter-module build order.
4. **Recommended command** — Based on the module's size and clarity:
   - If the module has ≤3 features and its Stage 4 plan is unambiguous: recommend `/b-module <name>`.
   - Otherwise: recommend `/b-feature <first-feature>` (naming the first feature from the module's build order).
   Mention the other option as an alternative in one line.
5. **Orientation hint** — "Run `/b-recap` any time to re-orient."

Example shape:

```
Design and scaffolding complete.

Suggested commit point — stage the design docs and scaffolding:

  chore: scaffold <project> — Bower design and project skeleton

Next move:
  - Start with module: <first-module>
  - Recommended: /b-module <first-module>   (3 features, well-specified)
  - Alternative: /b-feature <first-feature>  (build feature-by-feature)

Run /b-recap any time to re-orient.
```

<critical_constraints>
## What NOT To Do

- Do not implement features — Stage 5 is scaffolding only (manifests, configs, directory skeletons, README). Feature code belongs to `/b-feature` or `/b-module`.
- Do not create feature plan.md or status.md files — those come during implementation.
- Do not skip gates or combine stages.
- Do not proceed past a gate without explicit user confirmation.
- Do not ignore existing documentation or existing scaffolding — read and build on it; delta-only on existing projects.
- Do not run `git commit` — the commit point is advisory. Print the suggested message; let the user commit.
- Do not overwrite a user-authored `README.md` or `package.json` — only stock / boilerplate artefacts are candidates for replacement, and even then only after the Stage 5 gate.
- Do not emit free-prose next moves — the post-design handoff names the literal slash command.
</critical_constraints>
