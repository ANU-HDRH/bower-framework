# Bower Framework Changes

Versioned log of framework changes. Most recent first. Each entry: what changed, why, and any migration notes for projects already on a previous version.

This file is the changelog for the *framework itself* — not for projects built with it. Project-level history belongs in git.

---

## Version index

Most recent first. **Migration** is the class of project-side work each version's notes require: *none* (no project changes), *mechanical* (direct file edits), *judgement* (the model must read project content and synthesise). Entries at v0.20 and above appear in full below; earlier entries are archived verbatim at `docs/changes-archive.md` in the framework repo (not scaffolded into projects).

| Version | Date | Summary | Migration |
| --- | --- | --- | --- |
| v0.25 | 2026-07-28 | Changelog split at v0.20; `/b-upgrade` reads one section at a time | none |
| v0.24 | 2026-07-28 | Success criteria stop carrying status — scope states the boundary, modules track the work | judgement |
| v0.23 | 2026-07-27 | Constitution truthfulness — normative shape, flag-don't-fix, consent gate | judgement |
| v0.22 | 2026-07-27 | Build-order pull-forward annotation | judgement |
| v0.21 | 2026-07-22 | `/b-adopt` — brownfield cold-start | none |
| v0.20 | 2026-07-17 | Context economy: delegated implementation, selective orientation, ADR applicability, slim framework import | judgement |

---

## v0.25 — 2026-07-28

### Changelog split at v0.20; `/b-upgrade` reads one section at a time

`_bower/changes.md` had reached 713 lines / 122 KB, two thirds of it entries for a framework that no longer has that shape. Two costs, both real. Every scaffolded project carried the whole file. And `/b-upgrade` read it *whole* — Step 3 pulled the entire file into context just to enumerate the `## vX.Y` headings, then Step 6a re-opened it once per migration step, so a three-step upgrade paid for 122 KB four times over and left every migration's notes sitting in context while a different migration was being applied.

The split point is v0.20 (2026-07-17), chosen on two independent signals: it is the only substantial date gap in the log (v0.19 landed 2026-06-03), and it is the release that established the current architecture — delegated implementation via `bower-implementer`, the slim `framework.md` router with `framework-reference.md` behind it, and ADR applicability metadata. Entries below it describe surfaces that have since been replaced.

**What changed**

- **`docs/changes-archive.md` is new** and holds v0.8–v0.19 **verbatim** — cut and pasted, not reworded or compacted, so no historical migration note has been altered. It lives under `docs/` in the framework repo, which the scaffold does not copy, so projects stop carrying 80 KB they never read. It remains reachable to `/b-upgrade`, which clones the framework repo anyway. It carries its own version index above the entries.
- **`_bower/changes.md` keeps v0.20 and above.** The split removed 431 lines / 79 KB, taking the file from 713 lines / 122 KB to 301 lines / 47 KB including this entry. It gains a **`## Version index`** table at the top: version, date, one-line summary, and the class of project-side migration work each required (*none* / *mechanical* / *judgement*). The index covers the current era only; the archive indexes its own. A closing `## Earlier versions` section points at the archive.
- **`.claude/commands/b-upgrade.md` no longer reads the changelog whole.** Step 3 enumerates headings with `grep -n '^## v[0-9]'` and keeps the line numbers; a new fifth item in Step 3 greps the archive's headings too and records which file carries each step, stopping outright if a step version appears in neither. Step 6a reads exactly one version's line range with `offset`/`limit`, from the project's `changes.md` for v0.20+ or from `<clone>/docs/changes-archive.md` for older steps. This is the durable part of the change: with per-section reads, the changelog's total size no longer bounds an upgrade, whatever it grows to next.
- **`scripts/release.sh`** heading regex tightened from `^## v` to `^## v[0-9]`, so the new `## Version index` heading can never be mistaken for a version boundary when extracting release notes.
- **`CLAUDE.md`** gains an *Archiving old changelog entries* section (when to cut again, and the verbatim-move rule) and a four-place version-bump checklist — `_bower/VERSION`, `_bower/framework.md`, `README.md`, and the changelog heading. The README string had in fact gone stale in this very change before being caught, which is why it is now written down.
- **`_bower/roadmap.md`** records a 1.0-gated successor shape: migrations as per-version files under `docs/migrations/` behind an index, which would retire the line-number bookkeeping this version introduces.

**Why archive rather than compact**

Compacting old entries would mean rewriting migration notes whose whole value is being the exact instructions a past upgrade followed. A project on v0.14 upgrading today needs v0.15's notes as written, not a summary of them. Splitting costs nothing in fidelity; compaction risks silently changing what an upgrade does. The framework's own migration-notes discipline ("self-contained, written for a model audience") applies to the archived notes too, and paraphrasing is the fastest way to break it.

### Migration

None — no project-side changes required.

The next scaffold (or `/b-upgrade`) replaces the project's `_bower/changes.md` with the shorter current-era file and refreshes `.claude/commands/b-upgrade.md`. Nothing under `docs/` changes, no project file needs editing, and no history is lost — pre-v0.20 entries are verbatim in `docs/changes-archive.md` in the framework repo, indexed there and pointed to from the tail of `_bower/changes.md`. A project upgrading *from* a pre-v0.20 version is unaffected: the refreshed `/b-upgrade` reads archived migration notes from its clone of the framework repo.

---

## v0.24 — 2026-07-28

### Success criteria stop carrying status — scope states the boundary, modules track the work

Observed on a real project: `docs/scope.md` held a success-criteria table with a status column, and an agent reading it found all ten criteria marked *paused* when seven were in fact complete. The stored status was not merely stale — it had never been maintained, and its vocabulary was borrowed from a doc it had nothing to do with.

Two distinct defects, and both are structural rather than a one-off agent error.

**1. State with no wholesale writer.** Four commands patched criteria status — `/b-feature` step 8, `/b-module` step 11, `/b-integration`, `/b-ui` — and every one of them was *conditional* and *local*: each saw only its own change and asked "did I close a criterion?" Nothing ever read the whole set and reconciled it against module state. Write-rarely plus never-audited guarantees drift. Compare `status.md`, which stays honest precisely because `/b-feature` rewrites it from scratch every reconcile, and the index files, which stay honest because `/b-index` recomputes their derived rows. And this particular drift was load-bearing: `scope.md` sits on the orientation read-path of `/b-feature`, `/b-module`, `/b-integration`, `bower-analyst`, and `/b-recap`, so a criterion wrongly reading unmet makes an agent plan work that already exists, and one wrongly reading met hides work.

**2. An undefined state vocabulary invited a leak.** The framework said criteria carried "met/unmet state" and never defined the values. Given a status column with no defined domain, drafting agents reached for the one marker set they did have — the build-order markers — and wrote `⏸ planned`. A criterion cannot be paused: build progress is a property of features and modules, not of a statement about the world. The category error was available because the framework left the field's domain open.

**The fix is to derive, not to maintain.** A criterion is met exactly when the work that delivers it is done, and that work's state already lives under `docs/modules/` under full-rewrite discipline. So `scope.md` now states each criterion followed by a `*Delivered by: <module>[, <module>]*` clause and **no status field of any kind**; `/b-recap` derives satisfaction at read time (all features ✓ **and** the `## Module integration` marker ✓ for every named module) and reports `N of M satisfied` with the blocking modules for the rest.

**The pointer stops at the module, deliberately.** It does not name features or components. Work drifts between features as dependencies resolve live — that is normal and healthy — and a criterion pinned to a feature would need re-pointing every time scope moved between siblings, reintroducing exactly the maintenance burden this change removes. Scope says what must be true and who owns making it true; the module tree owns how.

**Withdrawn criteria are deleted, not annotated.** `scope.md` is present-state: it describes the boundary of what is being built now. History lives in `problem-space.md`, ADRs, and git. A struck-through criterion with a withdrawal note is history wearing scope's clothes.

**What changed**

- **`_bower/framework-reference.md`** — new `## scope.md — Boundary, Not Tracker` section: the three-section shape, the criterion + `Delivered by:` form with a worked example, the explicit no-status-column rule, why the pointer stops at the module, and the general rule the change follows — *state has exactly one home, and a document may only hold state that some command rewrites wholesale.*
- **`_bower/framework.md`** — the *Current boundary* navigation line now carries the rule in the always-loaded router, since ad-hoc work outside `/b-*` commands is where a status column would otherwise be reinvented. The *What to Update When* table's `Scope shift / criterion closed` row is renamed to `Scope boundary shift (incl. criterion added/deleted/reworded/re-pointed)` — "criterion closed" is no longer a `scope.md` write reason.
- **`_bower/brief-schema.md`** — the Stage 1 guidance no longer offers "close a success criterion" as a scope edit; briefs may propose boundary edits (scope, non-goals, criterion add/remove/reword/re-point) but never marking a criterion met.
- **`_bower/rationale.md`** — *Scope as Current State* revised; new *State Has One Home* subsection recording both the wholesale-writer rule and the undefined-vocabulary-invites-a-leak lesson.
- **`.claude/commands/b-design.md`** — Stage 1 drafts criteria with `Delivered by:` clauses and no status. Stage 3 gains a cross-stage rule: once modules are named, every criterion must point at an existing one; backfill clauses Stage 1 left open, re-point any the stage renamed or dissolved, and surface an unowned criterion at the gate rather than inventing a pointer. Stage 3's write set now includes those `scope.md` clauses.
- **`.claude/commands/b-recap.md`** — new derived **Success criteria** section, an output-shape block for it, and a completion rule that refuses `(none — project complete)` while any criterion is unresolvable. Handles three edge cases explicitly: a criterion with no clause (underivable — report, never infer a module from the wording), a clause naming a module that no longer exists (stale pointer), and the adoption phase (as-built `🚧` is not ✓, so criteria correctly read outstanding).
- **`.claude/commands/b-feature.md`, `b-module.md`, `b-integration.md`, `b-ui.md`** — the four "update `scope.md` if a criterion is met" instructions are gone. Each now writes `scope.md` only when the *boundary* moves: scope changed, a non-goal changed, or a criterion added, deleted, reworded, or re-pointed. Orientation reads are re-scoped to match. The `b-module`/`b-integration` handoff option `(none — all modules ✓ and scope criteria met)` becomes `(none — all modules ✓; project completion is /b-recap's call, which derives success-criteria satisfaction)` — neither command derives criteria, so neither may claim them met.
- **`.claude/commands/b-adopt.md`** — reconstructed criteria get `Delivered by:` clauses from the modules reconstructed in the prior step and no status field; the `scope.md` schema-compatibility test for the required-anchor gate is updated to match.

**Why not just fix the write path**

Making every command recompute the full criteria table on every reconcile was the alternative. It costs a full module-tree read on changes that have nothing to do with scope, and it still leaves the same fact stored in two places and able to disagree. Deriving in the one command whose whole job is orientation costs nothing extra — `/b-recap` already reads every `module-status.md`.

### Migration

Two steps. The first is mechanical. The second is judgement-required and should be done with the user in the room, because it involves deleting content from a co-authored doc and inferring ownership the old file did not record.

**1. Re-scaffold.** Run the scaffold script over the project to pick up the updated `_bower/framework.md`, `_bower/framework-reference.md`, `_bower/rationale.md`, `_bower/brief-schema.md`, `.claude/commands/b-design.md`, `.claude/commands/b-recap.md`, `.claude/commands/b-feature.md`, `.claude/commands/b-module.md`, `.claude/commands/b-integration.md`, `.claude/commands/b-ui.md`, and `.claude/commands/b-adopt.md`. No project content is touched by this step.

**2. Convert `docs/scope.md`'s success criteria — judgement required.**

If the project has no `docs/scope.md`, or it has no success-criteria section, there is nothing to do — skip to the end.

Read `docs/scope.md`. Locate the success-criteria section, in whatever form it takes — commonly a table with a Status or State column, sometimes a bulleted list with `✓`/`⏸` markers or "met"/"unmet" annotations.

**Do not read the existing status values as evidence of anything.** They are the defect this version removes; on the project that prompted the change, seven of ten were wrong. Do not carry them forward, do not use them to decide which criteria to keep, and do not use them to cross-check your work in the next step.

Then, for each criterion:

- **Determine the responsible module(s).** List the directories under `docs/modules/`. For each criterion, read enough to decide which module owns making it true: each module's `module-status.md` (its `## Module integration` notes and `## Build order` name the features it contains) and, where the module's purpose is not obvious from that, the `## Software architecture` section of `docs/architecture.md`, which states each module's purpose and data-concern boundary in one place. Most criteria map to one module; some genuinely span two or three, and listing several is correct — list every module whose completion the criterion depends on, since `/b-recap` requires all of them to be complete before it reports the criterion satisfied. **Do not name features or components** — the pointer stops at the module by design.
- **If no module delivers it**, do not guess. Collect these and raise them with the user at the end (see below).

Rewrite the section in the new form: each criterion as a statement of what must be true, followed on the next line by an italic `*Delivered by: <module>[, <module>]*` clause. Drop the Status column, the markers, and any met/unmet annotation entirely. If the criteria were a table, a bulleted list is usually the better target form, since a table with one content column is just a list. For example:

```markdown
## Success criteria

- Ingested documents are searchable within 60 seconds of upload.
  *Delivered by: ingest, search*
- An operator can reconstruct why any given record was rejected.
  *Delivered by: audit*
```

Leave the `## Current scope` and `## Non-goals` sections alone; this migration touches only the criteria.

**Then bring the user one list before writing anything**, since this is a co-authored doc and the mapping is inferred:

- The proposed `Delivered by:` clause for each criterion, with a few words on why that module. Flag any you were unsure about.
- Any criterion **no module delivers**. Each is one of three things and the user decides which: the criterion is genuinely abandoned and should be **deleted** (scope is present-state — delete it outright, do not strike it through or annotate it as withdrawn); a module is **missing** from the design, which is a real finding and probably wants `/b-design`; or the criterion is worded at the wrong level and should be **reworded** to something a module can own.
- Any criterion the user wants deleted for other reasons — this is a natural moment to ask whether the stated criteria still reflect what the project is trying to be.

Write the file only after the user confirms. Then run `/b-recap` and check the new **Success criteria** line against the user's own sense of where the project is: this migration's whole purpose is that the derived number is trustworthy, so a surprising count means either a `Delivered by:` clause is pointing at the wrong module or a module's status markers are themselves stale — worth resolving now rather than discovering later.

## v0.23 — 2026-07-27

### Constitution truthfulness — normative shape, flag-don't-fix, consent gate

Observed on a real project: `docs/constitution.md` claimed something existed when it was in fact an aspiration, and agents downstream became confused about what was real. The framework's only protection for that file is **ownership** — human-owned, never rewrite unprompted — which guards against unauthorised edits and says nothing about accuracy. The two are close to opposites here: the stronger the "don't touch" norm, the longer a false claim survives, because every agent that notices it has been told to leave it alone. Ownership protects the file from agents; nothing protected it from decay.

Two distinct defects were tangled in "human-owned", and they get different fixes.

**1. The doc shape (prevention).** A constitution is *normative* — rules the project has committed to. A rule can be unmet, but it cannot be false; an unmet rule surfaces as work. The failure was a *descriptive* claim smuggled into a normative doc, written in the same register as a rule, so it read as fact. `_bower/framework-reference.md` gains a **`## constitution.md — Normative Shape`** section: every statement about what exists must be verifiable from the repo or it does not go in the normative body, and aspirations live under a **`## Not yet in force`** heading whose contents agents must treat as non-existent. This is a shape rule, not a full template — headings otherwise stay the project's business.

**2. Ownership vs. truth (detection).** The framework already has exactly the right pattern one paragraph away, for ADRs: *code is truth, ADR is hypothesis — flag and supersede, don't silently trust.* ADR bodies are immutable and it works, because flagging is decoupled from editing. There was no equivalent for human-owned docs, so "never rewrite unprompted" collapsed into "never mention." `_bower/framework.md` and `framework-reference.md` now state the missing half: **ownership governs edits, not truth.** Never silently obey a false claim, never silently fix it — quote it verbatim with `file:line`, show the contradicting evidence, and ask.

**No freshness gate.** A periodic constitution sweep was considered and rejected: it has no natural trigger and degrades into nagging. Instead the check sits where the constitution is *already read for a purpose*, so it is free and contextual.

**What changed**

- **`_bower/framework.md`** — an *ownership governs edits, not truth* paragraph under Document Authority, with the verbatim-quote-and-ask protocol and a pointer to the normative shape.
- **`_bower/framework-reference.md`** — the ownership-semantics section gains the flag-don't-fix duty, the required surfacing shape, and an explicit **coverage is opportunistic, not an audit** caveat; plus the new `## constitution.md — Normative Shape` section.
- **`.claude/agents/bower-implementer.md`** — the strongest detection point in the framework: it reads the constitution's testing section and then *actually runs the thing*, so it discovers empirically when a stated runner, fixture, CI step, or `✓` rule is false. New behavioural rule (work around it, don't edit it, report it), `docs/constitution.md` added to the barred write surface, a new `## Constitution contradictions` report section, and a failure mode for silently routing around a false convention. A contradiction is not a divergence and does not change the outcome.
- **`.claude/agents/bower-reviewer.md` + `_bower/review-schema.md`** — the reviewer judges coverage and status honesty *against* the constitution, which is precisely where a false yardstick does most damage: every finding measured against it inherits the error. New `## Constitution contradictions` report section, deliberately **outside the six dimensions and outside the resolution-class machinery**, carrying a `Bearing:` line naming which findings leaned on the claim. Bounded to what the module survey actually contradicted — not an audit.
- **`.claude/commands/b-feature.md`** — a **Constitution reconciliation** block in Step 5, before Step 6 and never inside it (Step 6 is gate-free agent-owned doc maintenance; a human-owned doc must not ride that path). Prints the verbatim quote and line number, then asks: correct · move to `## Not yet in force` · leave alone.
- **`.claude/commands/b-review.md`** — a **Gate: Constitution consent**, separate from the triage gate, that runs even when triage was cancelled or every dimension came back clean. Contradictions never enter `review-plan.md`. If a correction moves the bar a reconciliation was judged against, that item is re-confirmed.
- **`.claude/commands/b-adopt.md`** — the initial constitution is drafted only from conventions confirmed in the repo, with inferred-but-unconfirmed practice placed under `## Not yet in force`. Explicitly distinguished from the adoption ledger, which has different exits.
- **`_bower/roadmap.md`** — the *Constitution template and archive rules* item records its trigger as fired for the constitution half; the full heading schema and the `_bower/archive/` rules stay deferred.

**Why this shape**

Prevention matters more than detection here, and the framework should not overclaim otherwise. Nothing audits the constitution as a whole: a claim no agent executes — a deployment convention, a review process, "all endpoints are rate-limited" — is caught by nobody. The detection hooks are an opportunistic backstop at two points that already read the file; the normative/aspirational split is what stops the false claim being written in the form that fooled everyone. Describing the backstop as a truthfulness guarantee would reproduce the exact bug it guards against.

The consent gate requires a **verbatim quote with a line number**, not a summary, because the objective is to get the human to open the file. A paraphrase invites a rubber-stamp; the human owns the doc and must see what is being proposed against it. Only an explicit instruction to change it makes the edit *prompted*, which ownership already permits.

This is the same disease Bower treated once before at the marker level: v0.15's floor-not-sum rule exists to make the verified-for-`✓` bar "observable rather than aspirational", and `/b-adopt` already refuses to mark found code `✓` because that would be a false completeness claim. Same failure, a different document.

### Migration

Two steps. The first is mechanical; the second requires judgement and should be done with the user in the room.

**1. Re-scaffold.** Run the scaffold script over the project to pick up the updated `_bower/framework.md`, `_bower/framework-reference.md`, `_bower/review-schema.md`, `.claude/agents/bower-implementer.md`, `.claude/agents/bower-reviewer.md`, `.claude/commands/b-feature.md`, `.claude/commands/b-review.md`, and `.claude/commands/b-adopt.md`. No project content is touched by this step.

**2. Audit `docs/constitution.md` against the repo — judgement required, and the user decides every edit.** This file is human-owned. Do not rewrite it unprompted, including as part of this migration: propose, then ask.

If the project has no `docs/constitution.md`, there is nothing to do — skip to the end.

Read `docs/constitution.md` in full. For each statement, classify it:

- **Normative** — a rule the project has committed to ("tests live in `tests/`", "run `pytest -q`", "`✓` requires the module integration test to pass"). Leave it alone. Rules can be unmet; that is not a defect in the doc.
- **Descriptive** — a claim about what *exists* or what is *currently true* ("CI runs the integration suite on every PR", "every module has contract tests", "all endpoints are rate-limited", "the staging environment mirrors production"). These are the risk. For each one, try to verify it against the repo: does the named workflow file, config, test directory, script, or dependency actually exist, and does it actually do what the claim says? Cite the path and line you checked.

Then bring the user a single list with three columns of your own conclusion — *verified* (evidence cited), *false* (evidence cited showing otherwise), *cannot verify from the repo* (say why: it concerns infrastructure, an external service, or team process that leaves no trace in the code). Quote each claim verbatim with its `docs/constitution.md:NN` so they can read it in place.

For the *false* and *cannot verify* items, propose one of three dispositions per item and let the user choose each:

- **Rewrite normatively** — turn the description into the rule it was trying to be. "CI runs the integration suite on every PR" becomes "the integration suite must pass before merge". A rule that is not yet honoured is visible as work; a false description is a phantom guarantee.
- **Move to `## Not yet in force`** — it was an aspiration. Create the section at the end of the file if it does not exist, with this preamble:

  ```markdown
  ## Not yet in force

  Intended, but not true of the repo today. Agents: treat these as non-existent —
  do not rely on them, do not cite them as conventions, and do not mark work ✓ on
  the strength of them. Moving an item out of this section puts it in force.
  ```

- **Delete** — it was never true and is not wanted.

Apply only the dispositions the user confirms. A user who wants to leave a claim exactly as it stands is exercising ownership; record nothing and move on.

Expect this audit to be most productive on the testing section, since that is the part with the most repo-visible surface — and the part `bower-implementer` will otherwise trip over on the next `/b-feature`.

---

## v0.22 — 2026-07-27

### Build-order pull-forward annotation

Observed on a real project: within a module, dependencies routinely cause an earlier feature to absorb part of a later feature's scope. By the time the last component came around, most of it was already built. This is benign — it mirrors how the work falls out under human coding too — and the framework already surfaces it at orient time, so arriving at a hollow component is a cheap surprise.

The expensive case is the inverse, and it was unhandled. When an earlier feature absorbs a later one's scope **incompletely**, the later feature's `plan.md` — written at module-design time, before the absorption — still claims the full scope. That plan is then handed to `bower-implementer` in a fresh context *as the contract*, with an explicit instruction not to re-litigate the design. The result is work done twice, or done a second way.

A survey of the observed project found the asymmetry precisely: *deferrals* get recorded (an earlier feature's `plan.md` non-goals name what it is leaving for feature 7), and *absorptions* get recorded retrospectively by the arriving feature's `status.md` — but nothing is written at the moment of pull-forward saying "I have taken part of feature 7." Structurally, there was nowhere to write it: feature 7's `plan.md` does not exist yet when feature 3 runs. The only document spanning the whole build order is `module-status.md`, whose `## Build order` was markers-only.

**What changed**

- **`_bower/framework-reference.md`** — the `## Build order` schema gains an optional scope-reduced clause on an entry, plus a **Pull-forward annotation** paragraph: when a feature absorbs scope from a later entry, that entry is annotated with one clause naming who absorbed what and a `Remaining:` clause naming what is left. Bounded to one line, because `module-status.md`'s ~250-word budget is shared with the integration notes. If the absorption leaves nothing to build, the entry stays ⏸ with `Remaining: none — verify and close via /b-feature <name>`; it is **not** promoted to ✓ on another feature's passing criteria, since ✓ means *this* feature's agreed criteria were verified.
- **`.claude/agents/bower-implementer.md`** — `## Doc implications` in the report template now includes downstream build-order scope absorbed, and a new failure mode names silent absorption. The implementer already receives `module-status.md` as orientation, so it can see the later entry; it is correctly barred from writing it, so the report is the channel. It is the only party that knows.
- **`.claude/commands/b-feature.md`** — Step 9 gains the authority to annotate a downstream entry when the report's `## Doc implications` names one (previously reconcile could only touch its own entry's marker). Step 1 gains the read side: a scope-reduced annotation on the target feature's entry **wins over its `plan.md`**, and the shrunk scope is surfaced in the Step 2 proposal so the operator sees the change.
- **`.claude/commands/b-module.md`** — the same annotation duty at per-feature completion, so both commands that write build order honour the schema.

**Why this shape**

The annotation lands on the build-order line rather than in the downstream `plan.md` because that plan usually does not exist yet, and because the build-order line is already in the next pass's orientation set — the note is read where it is needed without anyone having to look for it. A dedicated reconciliation pass was considered and rejected: it would re-litigate module design at every feature, which is `/b-review`'s job, once, at the end. Cross-*module* composition drift (a feature that ended up in a different module than designed) is a distinct problem and is not addressed here.

### Migration

Two steps. The first is mechanical; the second requires reading project content and exercising judgement — note in the `/b-upgrade` self-assessment which modules you inspected and what you concluded.

**1. No schema rewrite needed.** The annotation is additive and optional. Existing `module-status.md` `## Build order` sections are already valid — an entry with no annotation means no scope has moved. Do not add annotations to entries where nothing moved.

**2. Backfill mid-build modules only.** For each module under `docs/modules/`, read `module-status.md` `## Build order`. Skip the module unless it has **both** at least one ✓ or 🚧 entry **and** at least one ⏸ entry — a fully-built module gains nothing from the annotation (the plans are already reconciled and no future pass will read it), and an untouched module cannot have drifted yet. For each qualifying module:

   - For each ⏸ entry, read that feature's `plan.md` if one exists (many will not — plans are created at plan time, so an unbuilt feature usually has none). Where there is no `plan.md`, use the module's `## Module integration` `Notes:` and the completed features' plans to understand what that entry was meant to cover.
   - Determine whether part of that scope **already exists in the code**, landed by an earlier feature. The completed features' `plan.md` files and `status.md` files are the best evidence — a `status.md` noting that a mechanism "already existed" from an earlier feature is a direct signal. Grep the source for the capability rather than trusting the docs alone.
   - If part of it exists, append one clause to that ⏸ entry in this exact form:

     ```
     7. framing-probe-personas — ⏸ (scope reduced by feature 3: persona receives
        framing per ADR-0014; and feature 5: framing-target annotations.
        Remaining: the curated catalogue definitions.)
     ```

     Name the absorbing feature(s) and what landed, then `Remaining:` and what is genuinely left. Keep it to one line's worth of prose; the file's budget is ~250 words total including the integration notes.
   - If nothing of it exists, leave the entry exactly as it is.
   - Do **not** edit the ⏸ feature's `plan.md`, and do **not** change any marker. If a backfill reveals that an ⏸ entry has *nothing* left to build, write `Remaining: none — verify and close via /b-feature <name>` and leave the marker ⏸. Promoting it to ✓ would claim criteria that were never verified.

If a backfill turns up something that looks like a module-boundary problem rather than intra-module pull-forward (scope that landed in a *different module* than designed), do not annotate it — record it and surface `Run /b-review <module>` in the upgrade handoff.

---

## v0.21 — 2026-07-22

### `/b-adopt` — brownfield cold-start (v1, pending real-project validation)

Bower previously had no story for adopting an existing codebase. Adopting an SDD framework is non-trivial because it requires rebuilding the design rationale from the existing code. This release adds `/b-adopt` to fill that gap.

**What changed**

- **New command `.claude/commands/b-adopt.md`.** Reconstructs an orienting `docs/` skeleton — `scope.md`, `design/problem-space.md`, `architecture.md` (both views), an initial `constitution.md` from observed conventions, and `module-status.md` placeholders for inferred module boundaries — *from the code as it is*. The heavy read-only repo survey is delegated to a subagent (`general-purpose`/`Explore`) to keep it out of the command's context, with an inline fallback. Content is gated in groups like `/b-design`. Writes are confined to `docs/` and `docs/index.md`: adoption never touches source, tests, or build files.
- **User-facing adoption guide + prep nudge.** `README.md` gains an "Adopting an existing project" section covering the one high-leverage prep step — staging existing design docs, briefs, and decision rationale in `docs/reference/` before running, so they become *cited* framing rather than hedged inference — plus what the agent surveys, what it asks, and how the adoption phase drains. `/b-adopt` reinforces it in-flow: when the survey finds no reference material, it nudges (non-blocking) at the framing gate that staging some and re-running would improve attribution.
- **As-built markers, never `✓`.** The same honesty rule extends to status markers: adoption has no recorded acceptance criteria and runs no verification, so it marks observed features `🚧` (as-built, unverified) — never `✓`, which would be a false completeness claim. No per-feature `status.md` is written; `/b-index` reads the build-order marker for adopted features and never promotes code-presence to `✓`. Reuses the existing `🚧` rather than minting an adoption-only marker, so the framework's status vocabulary is untouched.
- **The adoption ledger and phase.** The governing design decision: code tells you *what*, never *why*, so `/b-adopt` never guesses intent. Cross-cutting choices it cannot attribute to a decision go into `docs/adoption-ledger.md` as one-line open questions (`<location> · <question>`, no stored context) rather than being written up as confident ADRs or architecture claims. The ledger is a worklist that **shrinks monotonically**: each item is drained by one of three exits, all of which delete the line — *resolve* (the choice stays; capture intent as an ADR via `/b-adr`), *remediate* (the choice was accidental/wrong; fix it via `/b-feature` or `/b-design`), or *dismiss* (deliberate/accepted, no record). The remediate exit is where adoption's *renewal* happens — through the normal gated flow, not inside adoption. When empty, the phase ends.
- **The flag is a banner in `docs/index.md`.** Its presence *is* the adoption-phase flag — `docs/index.md` is already read every session, so this carries **zero standing cost for greenfield projects** (they simply never have the banner) and the ledger is fetched only when the banner points to it. `.claude/commands/b-index.md` gains a rule to preserve the `🌱 Adoption in progress` banner across regeneration (curated structure, removed only by hand when the ledger empties).
- **`/b-recap` is adoption-aware.** `.claude/commands/b-recap.md` now detects the banner and reads a `🚧` feature with no `status.md` as *adopted-but-unverified* (as-built from existing code) rather than *in progress* — a fresh adoption would otherwise report every feature as underway with no state to summarise, and recommend building on code that already exists. In the adoption phase it reports the phase and open-ledger count, lists as-built features under a distinct *Adopted (unverified)* section, and recommends draining the ledger as the next move rather than `/b-feature`.
- **On-demand mechanics documented.** `_bower/framework-reference.md` gains an **Adoption phase** section (flag, ledger, drain paths, exit condition) — loaded on demand, not in the always-loaded router. `_bower/framework.md` gains one router line registering the command under Maintenance. `_bower/roadmap.md`'s brownfield item moves from "Ready to schedule" back to deferred with a validation trigger.

**Why**

Adoption inverts Bower's normal direction (docs drive code); the risk is manufacturing confident fiction — inferred docs that every later `/b-*` invocation then trusts. The design concentrates all adoption-specific honesty into one banner + one monotonically-shrinking ledger, both of which evaporate when the phase ends, so greenfield performance is untouched and the "provisional" caveat is unmissable while it matters. Renewal (undoing choices that were mistakes) is deliberately *not* bundled into adoption — you cannot critique against a baseline that does not yet exist — and instead emerges through the normal flow as ledger items drain. This is a v1 shipped to be tried on a real project and reported back on; the report is expected to reshape it.

### Migration

None — no project-side changes required. `/b-adopt` is a new command for cold-starting a brownfield codebase; projects already designed with Bower never invoke it, and the new `framework-reference.md` "Adoption phase" section plus the `b-index.md` banner-preservation rule are additive (they take effect only in a project that runs `/b-adopt`). Existing `docs/` shapes, ADRs, and index files are unchanged. The scaffold refresh (`/b-upgrade`) delivers the new command and reference text; nothing else moves.

---

## v0.20 — 2026-07-17

### Context economy: delegated implementation, selective orientation, ADR applicability, a slim framework import

This release responds to a context-consumption review of a real Bower project, where `/b-feature` sessions regularly reached 250–300k context tokens. The dominant cause was workflow packaging — orientation, proposal, implementation mechanics, and reconciliation accumulating in one context — with secondary costs from unbatched tool use, whole-file architecture reads, over-broad ADR loading, and a 307-line framework import in every session.

**What changed**

- **New subagent `.claude/agents/bower-implementer.md` — `/b-feature` implementation is delegated.** After the gate and the Step 3 `plan.md` write, a fresh implementer receives a curated packet (approved plan path, acceptance criteria verbatim, constraining ADR paths, architecture section names, testing conventions) and implements + tests in an isolated context, returning a fixed-section **implementation report** (`## Outcome`, `## Changed files`, `## Acceptance mapping`, `## Test run`, `## Divergences`, `## Implementation footnotes`, `## Doc implications`). The orchestrating command retains the gate, acceptance and decision reconciliation, and doc updates. The implementer is the first write-capable subagent in the set: safe by construction because it executes an already-gated plan, its write surface is bounded (source, tests, minor-divergence `plan.md` edits — never status docs, ADRs, or architecture), and every decision-needing path returns a `DIVERGED-STOPPED` report so the orchestrator can re-gate with the user. Inline implementation remains as an explicit fallback when the Agent tool is unavailable. `/b-module` deliberately stays inline; extension is a roadmap item pending real-project validation.
- **`.claude/commands/b-feature.md` Step 1 becomes a selective, batched orientation algorithm.** Section-directed `architecture.md` reads (system overview + the affected module's `## Software architecture` subsection, whole file only when the change can't be located); grep-then-open sibling plans on modify/remove; `scope.md` and `docs/ui.md` read conditionally; `constitution.md` testing detail deferred to the Step 4 packet; all independent reads batched; a closing **inputs-selected ledger** keeps omissions auditable. `/b-module` Step 1 gains the batched-reads directive.
- **ADR applicability metadata.** New ADR frontmatter fields: `scope: universal | module | integration | operational` (required for new ADRs; only `universal` loads unconditionally) and optional `topics: [<kebab-keywords>]`. A missing `modules` field now means **unclassified legacy ADR** — loaded on module, topic, or title match only, never "load for every feature." `/b-adr` drafts and audits the classification; `/b-index` renders Scope/Topics columns and surfaces unclassified counts; `/b-feature`, `/b-module`, and `bower-reviewer` select by the new semantics. Frontmatter remains mutable, so legacy ADRs can be classified without touching bodies.
- **`_bower/framework.md` cut from 307 to ~112 lines.** The always-loaded `@`-include target is now a router: identity, guards (including the architectural hard-redirect), document-authority table, status markers, what-to-update-when, out-of-band conventions, the UI path decision table, and one-line command routing. Detailed specs move to the new on-demand **`_bower/framework-reference.md`**: ownership semantics, `status.md`/`module-status.md` schemas, the full ADR spec, UI path examples and commit discipline, module review, implementation trajectory, reference-material conventions. The include target keeps its name, so no project CLAUDE.md changes.
- **Completed-plan size discipline.** `/b-feature` Step 6: a completed `plan.md` principally describes the system as it now exists — purpose, current contract, component map, integration points, testing categories; dated counts and implementation history are compressed aggressively.
- **`_bower/rationale.md`** reframes *Subagents for Isolated Analysis and Execution* — three subagents, with the implementer justified by context economy at the recovery-anchor boundary. **`_bower/roadmap.md`** marks the CLAUDE.md-tiering item realised and adds two deferred items (extend delegation to `/b-module`; index/module-status slimming with a separate `integration-plan.md`). `b-design.md`'s ADR shape description is also caught up to the v0.17 lightweight form it had missed (~150 words, two required sections — previously still said 200–600 words and four sections).

**Why**

The review's headline finding: the post-gate `plan.md` was already the crash-recovery anchor, so using it deliberately as a *context boundary* costs nothing and sheds the implementation mechanics (the dominant late-session growth) from the planning context. The remaining changes attack the pre-gate baseline: a project with 18 unclassified ADRs was loading ~65k characters of decisions for every feature, every session paid for the full framework import plus a whole-file architecture read, and unbatched read/edit/test cycles multiplied turn count. None of the framework's safeguards move: the gate, explicit acceptance criteria, ADR discipline, and living documentation are unchanged — the review judged those the valuable parts, and the delegation design routes every decision-needing path back through them.

### Migration

Two steps: a mechanical scaffold refresh, then a judgement-required ADR classification pass.

**Mechanical — refresh the framework files.** Re-run the scaffold (`/b-upgrade` does this): `.claude/agents/bower-implementer.md` and `_bower/framework-reference.md` arrive as new files; `_bower/framework.md` and the `.claude/commands/` set are replaced. No project CLAUDE.md edit is needed — the `@_bower/framework.md` include target keeps its name and simply resolves to the slimmer router. No file under `docs/` changes shape.

**Judgement-required — classify existing ADRs.** v0.20 changes ADR loading semantics: previously, an accepted ADR with no `modules` field was treated as cross-cutting and loaded for every `/b-feature` run; now such an ADR is *unclassified* and loads only when its topics or title match the change. Until classified, a genuinely universal legacy ADR (e.g. an error-handling convention) may stop being loaded automatically. To classify: for each `status: accepted` file under `docs/adr/`, read its body and add to the frontmatter a `scope:` field choosing the **narrowest true value** — `universal` (constrains every feature in the project; rare — every `/b-feature` run pays to load it), `module` (constrains the module(s) in `modules:`; add `modules:` with exact directory names under `docs/modules/` if missing), `integration` (constrains how modules interact at boundaries), or `operational` (deployment, tooling, versioning, maintenance). Optionally add `topics: [<kebab-keywords>]` where subject-matter keywords would help future changes find the ADR (e.g. `topics: [streaming, control-codes]`). Do not edit ADR bodies — frontmatter only. Superseded and deprecated ADRs may be left unclassified. When done, run `/b-index` to regenerate `docs/adr/index.md`; it will render the new Scope/Topics columns and drop the unclassified note. If uncertain how to classify a specific ADR, leave it unclassified and list it for the operator rather than guessing `universal`.

**Behavioural notes (no action required).** The first `/b-feature` run after upgrade will spawn the `bower-implementer` subagent after the gate — this is expected, and the command falls back to inline implementation (announcing it) if subagents are unavailable in the session. `docs/index.md` and `docs/adr/index.md` need no manual restructuring; the next `/b-index` run refreshes them in place per the regeneration contract.

---

## Earlier versions

v0.19 and below are archived verbatim in `docs/changes-archive.md` in the [framework repo](https://github.com/ANU-HDRH/bower-framework), which carries its own version index over those releases. They are not scaffolded into projects; `/b-upgrade` reads them from its clone when a project is upgrading from a pre-v0.20 version.
