# Bower Design

You are running the Bower design process. This is a six-stage workflow that produces (or revises) the design documentation and runnable scaffolding for a project. Stage 0 produces a **change brief** via the `bower-analyst` subagent; Stages 1–5 execute against that brief. The brief is the contract — stages do not re-derive what work needs doing.

Use for greenfield projects and for revisions that cross architectural boundaries (new modules, new technology, cross-cutting decisions, scope shifts). For changes within existing architecture that don't touch cross-cutting commitments, use `/b-feature` instead — it has its own propose-and-confirm gate, and will redirect back here if a request turns out to need design treatment.

The user's description of the change: $ARGUMENTS

## Important Behavioural Rules

- **The brief is the contract.** Stage 0 produces a change brief and gates on it. Stages 1–5 execute against the confirmed brief — they do not re-derive applicability. If a stage's brief section is `Status: nothing to do`, that stage emits a one-line acknowledgment and proceeds. The applicability question is settled once, up front, not re-asked five times.
- **ADR IDs are pre-allocated in the brief.** Stage 2 operations in the brief carry real, pre-allocated IDs (e.g. `new ADR-0034`). Stages 1, 3, and 4 cross-reference these IDs verbatim when drafting edits to `scope.md`, `architecture.md`, or `plan.md` files — **never use `ADR-NNNN` as a literal placeholder** in any draft, because draft content is what gets written to disk on gate confirmation. If the brief lacks pre-allocated IDs for `new`/`supersedes`/`partial-supersedes` operations, halt and surface the issue rather than inventing or placeholdering them.
- **Surface mid-flight discoveries.** If a stage uncovers work that wasn't in the brief, surface it to the user and ask whether to amend the brief or skip it. Do not silently expand scope; do not silently shrink it either.
- **Consult at every content gate.** Stages with non-nil delta use AskUserQuestion to confirm the **drafted content** (the ADR text, the architecture edit, the plan touches) — not applicability, which Stage 0 has already settled.
- **Per-stage writes.** Each stage with delta writes its files immediately after its gate is confirmed. There is no consolidated write step.
- **Recommend, don't dictate.** When presenting options, mark one as (recommended) with a brief rationale, but make it clear the user chooses.
- **Literal-command handoff.** The post-design handoff names exact slash commands the operator types next, never free prose.
- **Write docs, not code.** This workflow produces documentation files and (in Stage 5) scaffolding only. Feature code belongs to `/b-feature` or `/b-module`.
- **Don't re-spawn the analyst mid-flow.** The brief is locked at Stage 0. If the user wants a re-analysis, that's a new `/b-design` invocation, not an in-flow restart.

## Stage 0: Change Analysis

**Goal:** Produce a change brief identifying what each downstream stage needs to do (including the legitimate outcome of "nothing to do").

**Process:**

1. **Spawn the `bower-analyst` subagent** using the Agent tool with `subagent_type: "bower-analyst"`. The prompt to the subagent must include:
   - The change description verbatim (`$ARGUMENTS`).
   - The project root (the current working directory).
   - An instruction to conform exactly to `_bower/brief-schema.md`.

   Do not attempt the analysis inline. The subagent exists precisely so the analysis happens in isolated context, focused on the survey.

2. **Read the returned brief** carefully — particularly `## Considered and ruled out` and `## Ambiguities and assumptions`. These sections are the operator's primary safety checks, and you need to surface them at the gate.

3. **Handle the no-op case.** If the brief is `Status: nothing to do` for all five stages and the considered-and-ruled-out section confirms nothing material was found, the change is a no-op. Emit a single line ("Brief: nothing to do — `<reason>`. Stopping.") and stop. The operator can re-run with a refined description if appropriate.

4. **Gate:** Present the brief to the user via AskUserQuestion. Show the `## Summary` section, the `## Ambiguities and assumptions` section, and the `## Considered and ruled out` section as the primary surfaces. Reference the rest as available for inspection. Ask:
   - "Here's the change brief from the analyst. Confirm to proceed, amend it (tell me what to add/remove/change), or stop."

5. **If the user amends the brief**, update it in working memory and proceed. Do not re-spawn the analyst for amendments — incorporate the operator's correction directly. The corrected brief is the contract for Stages 1–5.

**Brief is now locked.** Proceed to Stage 1.

## Stage shape (applies to Stages 1–5)

Each of Stages 1–5 follows the same shape:

1. **Read the brief's stage-N section.**
2. **If `Status: nothing to do`:** emit one line — `Stage N: nothing to do — <reason from brief>` — and proceed to the next stage. No gate, no drafting, no writes.
3. **If `Status: delta`** (or any non-nil status): draft the change(s) per the stage's specific rules below, present the drafts at a content gate via AskUserQuestion, write files on confirmation.

Stage-specific drafting and write rules follow.

## Stage 1: Problem Framing

**Brief section consumed:** `## Stage 1 — Problem framing`.

**Drafting:**

- **Greenfield (full draft):** Draft `docs/design/problem-space.md` covering the problem and who has it, current alternatives and why they're insufficient, success criteria, scope boundaries, and constraints. Draft `docs/scope.md` covering current scope, current non-goals, and success criteria with initial met/unmet state (all unmet at project start).
- **Revision (partial draft):** Draft only the specific edits the brief calls for — often a paragraph added to `docs/scope.md`, more rarely a `problem-space.md` amendment (which is framing history and should be edited with care).

**Gate:** Present the drafted text. Ask: "Confirm the framing/scope draft, or tell me what to adjust."

**Write:** `docs/design/problem-space.md` and `docs/scope.md` per the confirmed draft. Create the `docs/design/` directory if it doesn't exist.

## Stage 2: Decisions

**Brief section consumed:** `## Stage 2 — Decisions` (a list of operations).

**Drafting:** For each operation in the brief's list:

- **new** — Draft a new ADR per the schema in `/b-adr` (frontmatter + four sections: Context, Decision, Consequences, Alternatives considered). 200–600 words.
- **supersedes ADR-NNNN** — Draft the new ADR with `supersedes: [ADR-NNNN]` in the frontmatter. Also draft the frontmatter update for the superseded ADR (`status: superseded`, `superseded-by: [<new-id>]`). The superseded ADR's body is **not** edited.
- **partial-supersedes ADR-NNNN** — Draft the new ADR referencing the original in `## Context` and `## Consequences`. Both ADRs remain `accepted`; neither's frontmatter changes.
- **confirms ADR-NNNN** — **No file is written.** Acknowledge in the stage output: "Confirmed ADR-NNNN, no new ADR written." This is a deliberate signal that the operator considered it.

**ID verification.** The brief's Stage 2 operations carry pre-allocated IDs (per `_bower/brief-schema.md`). Before writing, scan `docs/adr/*.md` for the current highest existing `NNNN-` prefix and verify the brief's pre-allocated IDs are `<highest> + 1`, `<highest> + 2`, etc. — i.e. no ADR has been created between Stage 0 and now. If verification passes, use the brief's IDs throughout. If a discrepancy is found (another ADR was added in the interim), surface it at the gate: ask the operator whether to renumber the new ADRs forward or abort the stage.

**Gate:** Present the drafted ADRs (and any supersession frontmatter changes) together. Ask: "Confirm the ADRs and supersession updates, or adjust before writing."

**Write:** New ADR files to `docs/adr/NNNN-kebab-title.md`. Frontmatter updates to superseded ADRs (body untouched). Create `docs/adr/` if it doesn't exist.

## Stage 3: Architecture

**Brief section consumed:** `## Stage 3 — Architecture`.

**Drafting:**

- **Greenfield:** Draft `docs/architecture.md` covering system overview, key components, data flow, technology stack, key design decisions (cross-referencing the ADRs written in Stage 2 by ID, not restating them), known constraints, and extension points.
- **Revision:** Draft the specific edits the brief calls for — typically a paragraph or two with new ADR cross-references. Show the edit in context (the surrounding sentences) so the gate can confirm placement, not just text.

**Gate:** Present the drafted architecture content. Ask: "Confirm the architecture content, or adjust."

**Write:** `docs/architecture.md` (edit in place; on greenfield, full new file).

## Stage 4: Module and Feature Plans

**Brief section consumed:** `## Stage 4 — Module and feature plans` (plan touches, build-order changes, integration notes, new modules).

This is the stage that most often does real work on revisions. It covers four kinds of edits, any of which the brief may list:

**Drafting:**

- **Plan touches** (existing `plan.md` files): Draft each edit per the brief's one-line reason. Touches range from a sentence to a paragraph. Show the edit in context.
- **Build-order updates** (existing `module-status.md` `## Build order` sections): Draft the reordering or append.
- **Module integration notes** (existing `module-status.md` `## Module integration` `Notes:` line): Draft the refreshed line. Do not flip the integration marker — that's `/b-integration`'s job.
- **New modules** (greenfield, or a revision that adds a module): Draft the new module's `module-status.md` placeholder with a `## Module integration` section (`Test: not yet defined — ⏸` and `Notes:` from the brief) and a `## Build order` section listing the module's features in order, each marked `⏸`. Do not create feature `plan.md` or `status.md` files — those belong to implementation.

**Gate:** Present all Stage 4 drafts together. Group by file path so the gate is scannable. Ask: "Confirm the plan and module-status edits, or adjust."

**Write:** All affected files. For new modules, create directories under `docs/modules/<module-name>/` first.

## Stage 5: Scaffolding

**Brief section consumed:** `## Stage 5 — Scaffolding`.

**Drafting:** If `Status: nothing to do`, skip per the stage shape. Otherwise, follow the existing Stage 5 rubric — delta-only on existing projects, full-draft on greenfield:

- **Package manifest** — `package.json`, `pyproject.toml`, `Cargo.toml`, etc. per Stage 2 decisions.
- **README.md** — If a stock README exists (from `create-*` tooling, or from adopting Bower itself), move it to `_bower/original-README.md` and generate a project-specific README drawn from `scope.md` and `architecture.md`. The new README must include a short "Built with Bower" section linking to `_bower/original-README.md`.
- **.gitignore** — Stack-appropriate.
- **Linter / formatter config** — per Stage 2 decisions.
- **Test runner setup** — per the testing approach in `constitution.md`.
- **Directory skeleton** — empty module directories matching the Stage 4 breakdown (the `module-status.md` placeholders have already been written in Stage 4).

For each item, classify as *create* / *modify* / *archive* / *skip (already present)*.

**Gate:** Present the scaffolding plan. Ask: "Confirm the scaffolding plan, or strike items."

**Execute:** Confirmed actions only.

## Index Regeneration

After Stage 5 completes (or is skipped), regenerate the index files so they reflect the new state:

1. Run `/b-index` if available in this session — it regenerates both `docs/index.md` and `docs/adr/index.md`.
2. If `/b-index` is not invokable, write `docs/adr/index.md` directly per the schema in `b-index.md`, and write/update `docs/index.md` to reflect any new modules and status markers.

This is mechanical and does not gate.

## Post-Design Handoff

After Stage 5 (or its skip) and index regeneration, emit a single handoff block. This is the only end-of-workflow output — do not also print a generic file summary.

The block must include:

1. **Confirmation** — "Design complete." (greenfield) or "Design revision complete." (revision).
2. **Summary of changes** — One line per stage that had non-nil delta, naming what was written or edited. Stages marked `nothing to do` are listed in a single line at the end (e.g. "Stages 1, 5: nothing to do.").
3. **Suggested commit point** — A proposed commit message. Advisory only: do **not** run `git commit` yourself.
4. **Next move** — Drawn from the brief's `## Suggested next move (post-design)` section, refined if you have better information:
   - **Greenfield:** recommend `/b-module <first-module>` if the first module has ≤3 features and an unambiguous plan; otherwise `/b-feature <first-feature>`. Mention the other option in one line.
   - **Revision:** typically a list of `/b-feature <name>` invocations, one per touched plan, in the order the brief suggested.
5. **Orientation hint** — "Run `/b-recap` any time to re-orient."

Example shape (revision):

```
Design revision complete.

Summary of changes:
  - Stage 2: ADR-0034 written (supersedes ADR-0011); ADR-0011 marked superseded.
  - Stage 3: architecture.md — one-paragraph edit in "Turn structure" section.
  - Stage 4: 4 plan touches across ui-module, eval-mode, test-harness, prompt-module.
  - Stages 1, 5: nothing to do.

Suggested commit point — stage the design revision:

  docs: extend control-code taxonomy with framing codes (ADR-0034)

Next move:
  - /b-feature framing-element-ui              (response-display)
  - /b-feature framing-turn-annotation         (eval-mode)
  - /b-feature framing-probe-personas          (test-harness)
  - /b-feature framing-prompt-principle        (prompt-module)

Run /b-recap any time to re-orient.
```

<critical_constraints>
## What NOT To Do

- Do not bypass the brief. Stages 1–5 execute against Stage 0's confirmed brief. If you find work mid-stage that isn't in the brief, surface it to the user — do not silently expand scope.
- Do not run the analysis inline in the main agent. Stage 0 spawns the `bower-analyst` subagent; isolated context is the point.
- Do not re-spawn the analyst within Stages 1–5. Amendments at the Stage 0 gate are incorporated in working memory, not by re-running the analyst.
- Do not implement features — Stage 5 is scaffolding only. Feature code belongs to `/b-feature` or `/b-module`.
- Do not create feature `plan.md` or `status.md` files — those come during implementation.
- Do not skip a stage's content gate when the brief has non-nil delta for that stage.
- Do not gate on applicability inside Stages 1–5 — applicability is Stage 0's gate, not a per-stage question.
- Do not proceed past a content gate without explicit user confirmation.
- Do not modify the body of an existing ADR — bodies are immutable. Only frontmatter changes on supersession.
- Do not run `git commit` — the commit point is advisory. Print the suggested message; let the user commit.
- Do not overwrite a user-authored `README.md` or `package.json` — only stock/boilerplate artefacts are candidates for replacement, and only after the Stage 5 gate.
- Do not emit free-prose next moves — the post-design handoff names literal slash commands.
- Do not call `/b-design` recursively.
</critical_constraints>
