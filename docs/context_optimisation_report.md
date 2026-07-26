# Context Optimisation Report

**Date:** 2026-07-26 · **Framework version at time of writing:** 0.21

An assessment of Bower's instruction surfaces against Anthropic's [The New Rules of Context Engineering for Claude 5 Generation Models](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models), and a proposed pass to bring them into alignment.

This document is the research backing for the *Token optimisation pass* item in `_bower/roadmap.md`. It is written to be actionable without the conversation that produced it — a later reader (human or model) executing the pass should need nothing else.

---

## 1. The stance: Bower is tuned for Claude

Anthropic's guidance is explicitly scoped to the Claude 5 generation. Acting on it means accepting a floor, so the floor is stated here rather than left implicit:

**Bower's instruction surfaces are tuned for Opus 5 (at any effort level).** Sonnet 5 is not a target the framework trades design quality for; nor are earlier generations.

This holds even as the deferred *Compatibility with agents beyond Claude Code* roadmap item advances. That item is correctly framed as a **behavioural conformance problem** — the durable contracts (gates before writes, document and status schemas, architectural redirects, role boundaries, executable next-action handoffs) are runtime-neutral, and an adapter's job is to preserve them. Nothing in this report weakens a contract; it removes prose that restates contracts already stated once. A Codex adapter inherits the same conformance scenarios either way.

The practical consequence: where an instruction exists only to compensate for weaker model judgement, it is a candidate for removal, and "but a smaller model might need it" is not a reason to keep it.

## 2. The criterion

The useful thing to take from the article is not its six rules but the criterion underneath them. Anthropic removed over 80% of Claude Code's system prompt with no measurable eval loss because those instructions were compensating for model limitations — "never write multi-paragraph docstrings", "don't create planning documents". All guardrails against bad judgement.

That yields a sorting question, and it is the one to apply during the pass:

> **Is this instruction compensating for something the model does badly, or encoding a commitment the model cannot infer?**

The question is durable — it survives the next model generation, whereas "does Opus 5 need this?" does not.

Almost all of Bower's core is the second kind. That architectural changes route through `/b-design`, that ADR bodies are immutable once accepted, that `plan.md` is written before code, that `✓` means *agreed acceptance criteria passed* — none of it is inferable from a repository. Improved judgement does not help a model guess a project's conventions. The article endorses this directly: CLAUDE.md should spend its tokens on gotchas and exceptions, which is what a framework convention is.

### The gates are not over-specification

Worth stating plainly, because "unhobbling" is the phrase most likely to be misapplied here.

Bower's consultation gates (AskUserQuestion at every propose-confirm point) and the architectural hard-redirect exist to serve the **human**, not to compensate for the model. `rationale.md` → *Holding the Line on Architecture* already makes the argument: an operator who asks mid-conversation to "just refactor this into a new module" is side-stepping the protection they adopted Bower for, and is trusting the framework to hold a discipline they are momentarily setting aside. That is a human failure mode. A better model does not touch the argument.

**No gate, redirect, or acceptance contract is in scope for removal.** The pass is about how many times Bower says a thing, not which things it says.

## 3. Where Bower already aligns

Recorded so the pass does not re-litigate settled ground.

| Article guidance | Bower's position |
|---|---|
| Progressive disclosure over front-loading | Done in v0.20. `_bower/framework.md` cut 307 → 113 lines as a router; detail demoted to on-demand `_bower/framework-reference.md`. Slash commands are load-on-invoke by construction. |
| Expressive interfaces over usage examples | Strong. `_bower/brief-schema.md`, `_bower/review-schema.md`, the implementer's `## Outcome: COMPLETE \| DIVERGED-STOPPED \| BLOCKED`, ADR `scope:` values, review resolution classes, the UI 2×2 path table — all enumerations, all the recommended pattern. |
| Isolate work in fresh contexts | Three subagents with structured artifact contracts; `rationale.md` gates their use on a stated three-part threshold rather than adding them reflexively. |
| Keep the always-loaded file lightweight | The router carries identity, guards, and routing. Its remaining tables (document authority, what-to-update-when) earn their place because they fire on **out-of-band** work, when no command context is loaded. |

The conclusion worth carrying: Bower's *structure* anticipated the article. The gap is rhetorical.

## 4. Findings

### F1 — `<critical_constraints>` blocks are near-total restatement

**Where:** twelve of thirteen commands (`.claude/commands/*.md`; only `b-index.md` lacks one) and, in a different guise, `bower-implementer`'s `## Failure modes to avoid`.

**Evidence.** In `.claude/commands/b-feature.md`:

- *plan is the recovery anchor* — stated at lines 30, 91, 107, and 216 (four times)
- *don't code before the gate* — lines 26, 87, 215 (three times)
- *don't implement inline when the Agent tool is available* — lines 31, 111, 217 (three times)

In `.claude/agents/bower-implementer.md`, all six entries under `## Failure modes to avoid` (lines 101–108) map one-to-one onto the six behavioural rules and two protocol blocks above them (lines 29–52). Every one is a negation of a rule already given.

**Why it matters.** Token cost is the lesser argument. The real one is the article's observation about conflicting messages — two statements of one rule are two places to drift, and the drift is silent. Bower already recognises this hazard: the roadmap's *Single source of truth for duplicated schemas* item carries the revisit trigger *"a schema change that has to be applied in three places and one is missed."* The article removes what made the duplication tolerable for **rules** specifically — the belief that the model needed reinforcement.

**Not a blanket delete.** Some constraints are load-bearing and appear only in the block. `b-recap.md`'s *"do not infer project state from source code — trust the docs"* is a genuine behavioural commitment, stated nowhere else in that file. The work is a **merge**: fold unique constraints up into the positive rule they belong to, drop the echoes, delete blocks that retain nothing.

**Classification:** mostly mechanical, with per-constraint judgement on uniqueness.

### F2 — `<batched_execution>` is model-limitation compensation

**Where:** `.claude/agents/bower-implementer.md` lines 36–43.

Instructions to batch independent reads, avoid re-reading whole files after each edit, and truncate passing test output. Opus 5 does all of this by default, and the harness reinforces it.

**Why it matters.** The block was earned — it was written against a real observation of 250–300k-token `/b-feature` sessions (see `_bower/changes.md` v0.20). But the fix for that observation was the **delegation boundary itself**, not the tutorial. Keeping both means paying for a lesson the structure already teaches. The corresponding `## Failure modes to avoid` entry (*"Unbatched execution"*) goes with it under F1.

**Classification:** mechanical.

### F3 — `/b-feature` Step 1 prescribes a path to a state it already verifies

**Where:** `.claude/commands/b-feature.md` lines 36–48.

Nine numbered orientation reads, followed by the **inputs-selected ledger** — a short close naming what was read and what was deliberately skipped, keeping omissions auditable at the gate.

**Why it matters.** The ledger is the enforcement mechanism, and it is a good one: self-verifying, visible to the operator at the moment of decision, and adaptive to changes whose shape the algorithm did not anticipate. The nine steps prescribe *how* to reach a state the ledger already checks. There is even mild internal tension — line 36 says "read what this change needs, not the whole project," and nine mostly-unconditional items follow.

Bower invented the better mechanism in v0.20 and kept the scaffolding around it. The proposal is to keep the ledger, keep the genuinely non-obvious selection heuristics (section-directed `architecture.md` reads; grep-then-open sibling plans on modify/remove; ADR selection by `scope`/`modules`/`topics`, which is a Bower convention and not inferable), and drop the turn-by-turn sequencing.

**Classification:** judgement-required. Wants validation on a real project cycle before it is considered settled.

### F4 — One rationale premise has expired

**Where:** `_bower/rationale.md`, *Subagents for Isolated Analysis and Execution* (the paragraph at line 188).

The passage justifies the Stage 0 brief partly on the grounds that *"prompts full of 'if X then A else B' tend to produce thin versions of all branches rather than committing cleanly to one."* That is an explicit model-limitation claim of exactly the kind the article says has expired.

**Why it matters — and why the design is safe.** The subagent split has two further justifications that are structural and survive intact: **context economy** at the recovery-anchor boundary, and **adversarial freshness** for `bower-reviewer`. The design is not at risk. The risk is that a stale premise gets cited to justify *future* splits that no longer need it. Mark it as a legacy observation rather than a live premise.

**Classification:** judgement-required (a rationale edit, small).

## 5. Where Bower should not follow the article

### Worked examples that calibrate a fuzzy predicate

`_bower/framework-reference.md` → *UI Changes — Paths in Detail* carries seven worked examples ("move the icon to the right" → Path 1; "add a settings page" → Path 3). Under a literal reading of *stop providing usage examples*, these are candidates for cutting.

They should stay. The article's concern is that **format** examples constrain exploration — they show one way to use an interface and the model stops looking for others. These are not format examples; they calibrate *structural* and *well-specified*, two genuinely fuzzy predicates that the decision table cannot pin down. A boundary marker is not a template. Trimming seven to four or five is reasonable on length grounds alone, but the category is defensible.

### `docs/` is not memory

The article's *stop manually managing memory files* rule does not reach Bower's design layer, and it is worth having the answer ready.

Bower's `docs/` is justified by the **rebuild test** — hand someone `docs/` and no code, could they reproduce a recognisable version of the system? Auto-memory does not attempt that and is not trying to; it captures session-derived facts, not specifications. The only real adjacency is `status.md`, and its ~150-word resumption framing does something memory does not: it is committed, reviewable, and dies with the feature.

### Word budgets

Budget rules (`status.md` ~150 words, `module-status.md` ~250, ADRs ~150/300 ceiling) are partly verbosity compensation, which is the removable shape. But they also serve the **reader's** context window — the operational layer is on the hot path of agent attention, per `rationale.md`'s two-layer model. The durable half of the justification survives. Keep them.

### Rich references — one place the guidance genuinely applies

*Prefer code-based specifications over descriptions* maps onto the deferred roadmap item **Living invariants for `ui.md` via test harness**. Turning "modals trap focus" from prose into a Playwright assertion is precisely the recommended move.

This does **not** fire that item's revisit trigger, which correctly waits for observed drift caught at manual review. It is a second, independent argument for the item once the trigger does fire, and worth noting there.

It should **not** be extended to HTML mockups in `ui.md`. `rationale.md`'s *invariants, not pixels* argument holds — a mockup rots exactly as pixel-level prose does, and the doc stops being trusted.

A cheaper adjacent win, unblocked today: `/b-feature` Step 2 acceptance criteria are prose, and Step 4 maps them to tests. Where a criterion can be stated as a **test name** at the gate, that is a higher-fidelity contract at no extra cost.

## 6. Proposed sequencing

Three tranches, separable, in decreasing confidence order.

**Tranche 1 — the restatement merge (F1, F2).** All thirteen commands plus `bower-implementer` and, where applicable, the other two agents. Mechanical, highest value, lowest risk. One framework version.

**Tranche 2 — orientation collapse (F3).** `/b-feature` Step 1 reduced to judgement-plus-ledger, retaining the Bower-specific selection heuristics. Behavioural; wants a real project cycle to validate before it is called settled. Consider deferring until Tranche 1 has run somewhere real.

**Tranche 3 — rationale and roadmap edits (F4, §5 notes).** Can ride along with either.

**Migration cost is near zero.** Nothing under a project's `docs/` changes shape; the whole pass is a scaffold refresh. Expect `### Migration` to read *None — no project-side changes required*, with the stance in §1 recorded in the changelog entry so the decision is visible rather than silent.

## 7. Relationship to the roadmap

**Token optimisation pass** — this report supplies what that item was blocked on. The item notes that acting *"requires a definition of 'token optimisation' which is a mini research project in itself."* The definition now exists, but it is a **better one than the item assumed**: the item is framed as tightening prose to reduce token count, whereas the criterion in §2 is *removing instructions the model no longer needs, and letting interfaces carry what prose currently duplicates*. Those produce materially different results, and the second is the one worth doing. The item should be **rewritten**, not merely triggered.

**Single source of truth for duplicated schemas** — unchanged in scope (it concerns schema *text*, not rules), but F1 is the same hazard in a different surface, and the two share a fix philosophy: nominate one canonical statement and let everything else point at it.

**Living invariants for `ui.md` via test harness** — gains a second supporting argument (§5). Trigger unchanged.

**Compatibility with agents beyond Claude Code** — gains the stance in §1. The item's behavioural-conformance framing is unaffected; adapters preserve contracts, and this pass does not remove any.
