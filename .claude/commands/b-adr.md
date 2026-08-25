---
description: Scaffold a new Architectural Decision Record, or supersede or narrow an existing one.
argument-hint: the user's description of the decision
---
<!-- GENERATED FILE — do not edit. Source: skills-src/commands/b-adr.md. Regenerate: node scripts/build-adapters.cjs -->

# Bower ADR

You are scaffolding an Architectural Decision Record (ADR) — a single-file, append-only entry in the project's decision log at `docs/adr/`. ADRs capture cross-cutting commitments: choices that constrain more than one feature and would surprise a future reader if not written down.

This command produces exactly one deliverable: a new ADR file (and, if superseding or narrowing, a frontmatter update to the ADR being replaced or narrowed). It does not modify code, plans, or status documents — those are the job of the command that called this one (typically `/b-feature` reconcile or `/b-design` Stage 2). The one other file it writes is `docs/adoption-ledger.md`, and only to delete a line this ADR resolved (Step 4).

The request (the user's description of the decision): $ARGUMENTS

## Important Behavioural Rules

- **This command records; it never deliberates.** It receives a decision that has already been made — by a gate in the command that called it, by the operator directly, or by evidence someone accepted. Do not generate options here, do not weigh them, and never write up weighing that happened nowhere. Where a change had genuine branching choices, the gate that offered them belongs upstream (`/b-ui`, `/b-feature`, `/b-module`, `/b-design` Stage 0); its outcome reaches this ADR through the attribution forms in Step 3, or not at all.
- **One coherent scope per ADR.** An ADR may bundle several closely-related decisions under an umbrella title (e.g. "sidecar accommodation for patterns" covering artefact layout, build-time merging, and provenance rendering). The split test is whether the title honestly covers the scope — if you find yourself drafting "and also we switched the build tool," that's a second ADR. Naming more than one commitment in the body is fine when the umbrella holds.
- **Bodies are immutable once accepted.** This command writes a new ADR or amends frontmatter only. It never edits an existing ADR's body.
- **Consult before writing.** Confirm the draft at an operator gate (binding: `_bower/framework.md` → *Runtime bindings*) before committing it to disk.
- **Classify applicability.** Every new ADR carries a `scope` field — it decides which future changes load the ADR, so an over-broad scope taxes every `/b-feature` run. `universal` is rare and means "constrains every feature in the project"; most decisions are `module`, `integration`, or `operational`. Add `topics` when the decision is findable by subject-matter keywords (e.g. `[caching, invalidation]`).
- **Use exact Bower module names.** The `modules` field references directories under `docs/modules/`. Omit the field when no specific module is implicated; do not invent sentinels like `[*]` or `[all]`.
- **Status is `accepted`.** Bower has no `proposed` workflow — decisions are confirmed at gates before being written to disk.

## Step 1: Understand Context

1. Read `docs/adr/index.md` if it exists — lets you check for adjacent or related decisions, and that the slug you intend to use is not already taken.
2. If no `docs/adr/` directory exists yet, this is the first ADR.
3. If the user's description implies superseding an existing ADR (e.g. "we're switching from Redis to in-process caching, ADR-0011 is wrong"), read that ADR's full contents.
4. Read `docs/architecture.md` and any module's `module-status.md` referenced by the decision, only insofar as needed to fill in `modules` correctly and to write a defensible `## Context` section.
5. **If `docs/adoption-ledger.md` exists, read it.** This command is the whole of the ledger's *resolve* exit (`_bower/framework-reference.md` → *Adoption phase*), so the decision you are about to record may be one of its open lines — and `/b-adopt`'s handoff hands the operator `/b-adr <slug>` to do exactly that. Match the request against the lines: an explicit reference wins, then a slug match, then a topical match on the open question (which is a guess — say so if you rely on it). If two lines could match, ask at the gate rather than picking. Step 4 deletes the line you matched; nothing else does.

Do **not** load every ADR. The point of the index is that you don't have to.

## Step 2: Determine ID and Relationship

- **ID.** An ADR's ID is a **name, never a count**: `ADR-<slug>`, where the slug is two or three kebab-case words naming the decision (`host-credentials`, `sse-streaming`, `single-vm-deploy`). Choose it from the decision's subject, not its title in full, and check that `docs/adr/<slug>.md` does not already exist — if it does, either this is the same decision (read it; you may be looking at a supersession or narrowing) or the slug needs to be more specific. A slug is chosen, so two writers on two branches collide only when they name the same thing, which is a real conflict and shows as two files; a counter collides whenever both increment it, and git merges that clean. IDs are immutable and never reused. **ADRs written before v0.38 carry a four-digit ID and filename prefix (`ADR-0027`, `0027-*.md`)**; those IDs and filenames are permanent, are cited unchanged, and are never renumbered.
- **Supersession.** If the user's description names an existing ADR being replaced, this is a supersession. The new ADR will carry `supersedes: [<old ID>]` (either ID shape) and the old ADR's frontmatter will be updated with `superseded-by: [<new-id>]` and `status: superseded`. Both files will be written in this command's output. The old ADR's **body is not touched**.
- **Narrowing.** If the user describes a decision that scopes an exception to an existing ADR rather than fully replacing it (e.g. "ADR-0011 says use Postgres for all stores; this module uses ClickHouse instead"), this is a **narrowing**. The new ADR carries `narrows: [<old ID>]` and the old ADR's frontmatter gains `narrowed-by: [<new-id>]` — and **nothing else**: its `status` stays `accepted`, because its central decision is still in force. Both files are written in this command's output. The old ADR's **body is not touched**.

**Choosing between them.** Apply this test before deciding: *would someone implementing the old ADR's main decision today still be right?* If yes, it is a narrowing — the old decision survives with an exception carved out. If no, it is a supersession. When the answer is genuinely unclear, put the question to the user at the gate rather than guessing; the two are not interchangeable, and recording a narrowing as a supersession marks live policy dead. Do not use `supersedes` for a relationship the new ADR's own body describes as partial.

## Step 3: Draft the ADR

Compose the file. Two sections are required (`## Context`, `## Decision`); one is optional and earns its place only when it carries real content (`## Consequences`). Order is fixed.

```markdown
---
id: ADR-<slug>
title: <Title in sentence case>
status: accepted
date: YYYY-MM-DD
scope: universal | module | integration | operational
modules: [<module-name>, ...]
topics: [<kebab-keyword>, ...]
supersedes: [<existing ADR ID>]
narrows: [<existing ADR ID>]
---

## Context

<A sentence or two naming the question that forced a decision, pointing to the
doc that frames it — `architecture.md`, an earlier ADR, a referenced design doc.
Do not restate what those docs already say.

Then at most one sentence of attribution, and only where one of the three forms
below actually applies. Where none applies, write nothing — silence means no
attribution was recorded, which is the common case.>

## Decision

<What did we decide. Active voice, present tense. "We will use X." One paragraph.
Lead with the central sentence — if someone reads only the first line, they
should know what's true. An ADR may name more than one commitment here when they
share the umbrella scope of the title.>

## Consequences   <!-- OPTIONAL -->

<Include only when there is a non-obvious cost, an ongoing maintenance burden,
or a downstream commitment that is not already implied by the Decision sentence.
If the consequence is "this means X will be true" — that's already in Decision;
omit this section. When in doubt, leave it out.>
```

### Attribution — what `## Context` may claim

An ADR can honestly record **what the operator said** and **what evidence was cited**. It cannot honestly record weighing that did not occur. So `## Context` carries at most one attribution sentence, drawn from one of three forms, and carries none at all when none of them applies.

**(a) A typed choice.** A gate upstream presented competing options and the operator named one. Record it as *"The operator chose \<the option's content\>."* — or, where they also said why, *"The operator chose \<content\> because \<their words\>."* Two hard rules:

- **Resolve the letter.** `d` is meaningless in the record; write what option `d` actually was.
- **Never import the model's recommendation rationale as the operator's reason.** The gate that offered the options also argued for one of them, a few lines above the question. Folding that argument into Context produces a sentence false in exactly the way this section exists to prevent: the reasoning is the model's and the sentence attributes it to a person. A bare selection is a real operator act and is recorded as one — it is not a gap to be filled.

**(b) Demarcated operator wording.** The admissible sources are the ones whose boundaries the agent did not choose: **the request**, a typed choice at a gate (form (a)), and an explicit correction at a gate ("no, the other way, because X"). Quote or closely paraphrase, and say it was the operator's.

- **Never mine the conversation.** Scanning the session and deciding which remark framed the decision is itself an inference, it is invisible in the output, and a plausible framing sentence sitting inside Context is indistinguishable from genuine provenance. Prohibited outright; there is no careful version of it.
- **Guard against boilerplate.** Requests are often terse and instrumental ("add caching to the API layer"), and pasting one in yields a restatement of the Decision — the pseudo-Consequences failure in a different section. Include request wording only where it carries something the Decision does not: a constraint, a motivation, a prohibition. Otherwise silence.

**(c) Cited evidence and ratification.** Where the operator sat *downstream* of the decision — the usual shape when the ADR comes out of adoption, review, or integration work — they ratified evidence rather than chose between options. Cite the artefact, then name what they actually did: *"Observed in `a1b2c3d`; the operator ratified."* *"Drift found by review (`auth` F3); the operator accepted the finding at triage and chose to supersede."* Never *"the operator chose X"*.

- **The verb matches the gate.** *Ratified* is for a per-item decision against a cited artefact — `/b-adopt`'s attribution gate, where the choices are accept / reject-as-stale / reject-as-wrong. A batch triage disposition yields *accepted at review triage*, which claims a disposition and no more.
- **No artefact, no claim.** Ratification is recordable only where the evidence is citable and durable: a commit SHA, a finding ID with its brief, a named boundary test. Where there is none — an implementation divergence surfaced by a subagent, say — Context stays silent rather than reaching for a weaker word.

**Attribution is to "the operator", never to a named person.** Git carries authorship, and facts about a named individual do not belong in an immutable body at all (`_bower/framework-reference.md` → *Document Layers and Ownership*).

Frontmatter rules:

- `scope:` — required for new ADRs. Pick the narrowest true value:
  - `universal` — constrains every feature in the project (e.g. an error-handling convention, a language/runtime commitment). Rare; loaded by every `/b-feature` run, so it must earn that cost.
  - `module` — constrains the module(s) named in `modules:`. The default for most decisions.
  - `integration` — constrains how modules interact at their boundaries; loaded for integration-shaped work, not everyday feature changes.
  - `operational` — deployment, tooling, versioning, maintenance; loaded for ops-shaped work only.
- `modules:` — required when `scope: module` (exact directory names under `docs/modules/`); otherwise include only if a specific module is implicated. Do not write `modules: []`.
- `topics:` — optional list of kebab-case subject keywords (e.g. `[streaming, control-codes]`). Include when the decision should surface for topically-related changes regardless of module.
- `supersedes:` and `superseded-by:` — omit when empty.
- `narrows:` and `narrowed-by:` — omit when empty. Symmetric: if the new ADR carries `narrows: [ADR-MMMM]`, then ADR-MMMM must gain `narrowed-by: [<new-id>]` in the same write. Never both `supersedes` and `narrows` naming the *same* ADR — pick one per relationship. Do not add `narrows` targeting an ADR whose status is `superseded` or `deprecated`; there is nothing left to narrow, and if the retired decision is the right subject, the live ADR that replaced it is what the new one narrows.
- `date:` — today's date in `YYYY-MM-DD`.
- `status:` — `accepted`.

Legacy ADRs (pre-v0.20) lack `scope`. Frontmatter is mutable — when you touch a legacy ADR for supersession, or the operator asks for classification, adding `scope`/`topics` to an existing accepted ADR's frontmatter is allowed and encouraged; the body stays immutable.

Filename: `docs/adr/<slug>.md` — the slug from the ID, nothing else. Lowercase, hyphens, no punctuation. The `title` field carries the full sentence-case title; the filename does not repeat it.

Body length: aim for ~150 words across all sections combined, ceiling 300. If you're approaching 300, check whether the prose is doing real work or just filling sections — pad Context with restatement of framing docs, or write pseudo-Consequences that just rephrase the Decision, and you've blown the budget without adding signal. Nothing here earns growth; an attributed reason is one sentence in the operator's words, not a paragraph reconstructing their thinking.

## Gate: Confirm or Adjust

Present the drafted ADR to the user at the operator gate. Print the whole thing — the proposed filename and ID, the full frontmatter, the full body — so they can read it. But **ask about what is immutable and acted upon, plus whatever drives machine behaviour**, and show the rest without seeking approval of it. A gate that reliably passes is theatre: 150 words of drafted prose offered for confirmation gets skimmed and accepted, and the pass then lends the content an appearance of ratification it has not earned.

**Ask about these:**

- **The attribution sentence, if `## Context` carries one.** It is a quote in an immutable record, misquoting the operator is the worst failure available here, and it is the cheapest thing on the page for them to check. Ask whether it is what they said — not whether the ADR reads well.
- **The central Decision sentence.** Immutable, and written to be the one line a skimming reader takes away. Where it was composed partly from the operator's own wording, tidying is precisely what distorts it.
- **`scope`, `modules`, and `topics`.** All three are load selectors — they decide which future changes open this ADR. A wrong `topics` fails silently: the ADR simply never surfaces for the change it should have constrained.
- **Supersede versus narrow**, wherever the ADR carries either. A mis-call marks live policy dead.
- **The ledger line**, if Step 1.5 matched one — quoted exactly, since confirming this ADR deletes it (Step 4).

**Show, but do not ask approval of:** the rest of `## Context`, and `## Consequences`. Both are immutable, and nothing branches on them.

Before presenting, self-audit: does the Decision section's central sentence fit under the title? If not, flag a possible second ADR. Does `## Consequences`, if included, name a non-obvious cost — or is it restating the Decision? If the latter, propose omitting it. Is `## Context` paraphrasing a doc already referenced? If so, tighten to one or two sentences pointing at the doc. **Can you name which of Step 3's three attribution forms the attribution sentence came from — and is it free of your own recommendation rationale? If not, delete the sentence; a wrong provenance claim is worse than none.** Is `scope` the narrowest true value — would `universal` really constrain *every* feature, or is this a module, integration, or operational decision wearing a broad label?

If this is a supersession, also show the frontmatter change to the older ADR (status, superseded-by, date). If this is a narrowing, show the older ADR's frontmatter change too (`narrowed-by` added, `status` unchanged at `accepted`) and state in one line what the narrowing leaves in force — that is the claim the user is confirming, and it is the one a mistaken supersession would have destroyed. If the ADR being superseded participates in a narrowing pair (`narrows` or `narrowed-by` in its frontmatter), show the pointer updates to those third ADRs too — and where a narrowing ADR's exception may or may not survive the replacement decision, ask rather than assume (see Step 4's pruning rules).

Frame as: "Here's the ADR I'd write. Check the quoted intent, the Decision sentence, the classification, and the relationship — then confirm to commit it to disk, or tell me what to adjust."

**Do not write any file until the user confirms.**

## Step 4: Write

After confirmation:

1. Create `docs/adr/` if it does not exist.
2. Write the new ADR to `docs/adr/<slug>.md`.
3. If superseding, update the older ADR's frontmatter:
   - Set `status: superseded`
   - Add or extend `superseded-by: [<new-id>]`
   - Leave the body completely untouched.
   - If the older ADR carries `narrows` or `narrowed-by`, prune those pointers per the paragraph below — a retired ADR must not stay referenced by a live one.
4. If narrowing, update the narrowed ADR's frontmatter:
   - Add or extend `narrowed-by: [<new-id>]`
   - **Leave `status` as `accepted`.** Do not change it. Do not add `superseded-by`.
   - Leave the body completely untouched.

**Superseding either side of a narrowing pair prunes the pointers.** If the ADR being superseded carries `narrows: [ADR-T]`, the exception it carved dies with it: remove its ID from each target's `narrowed-by` (deleting the field if empty) — unless the new ADR re-asserts the exception by carrying its own `narrows: [ADR-T]`, in which case update the target's `narrowed-by` to the new ID instead. If it carries `narrowed-by: [ADR-X]`, whether ADR-X's exception survives against the replacement decision is a judgement — it was asked at the gate. If it survives, rewrite ADR-X's `narrows` entry to the new ID and add `narrowed-by: [ADR-X]` to the new ADR; if not, remove the retired ID from ADR-X's `narrows` (deleting the field if empty). ADR-X's own `status` never changes either way.

**Both sides of a relationship are written together.** A `narrows` or `supersedes` field on the new ADR and the matching `narrowed-by` or `superseded-by` on the target are one write, not two steps that might be separated. Write the new ADR and the target's frontmatter update before doing anything else — before running `/b-index`, before emitting the handoff. If the target file cannot be written (missing, unreadable, malformed frontmatter), stop and report it rather than leaving the new ADR on disk claiming a relationship the other side does not record. This command is the only writer of both fields, and that is what keeps them consistent; there is no later reconcile pass that would notice a half-written pair.

5. **Drain the adoption ledger, if this ADR resolved one of its lines.** Delete the line Step 1.5 matched from `docs/adoption-ledger.md` — the line the operator just saw quoted at the gate, and no other. Writing the ADR *is* the entirety of the ledger's *resolve* exit, so this command drains rather than hands off: the precedent is the findings queue, ticked by the discharging command and deleted by whoever disposes of the last item (`_bower/framework-reference.md` → *Findings queue*), and a handoff the operator has to remember is exactly how a resolved line survives its own resolution. One orphaned line keeps a project in the adoption phase permanently, banner and all.

   **If it was the last open line, the phase's exit condition is now met.** Delete `docs/adoption-ledger.md` — an empty ledger left on disk is a broken state — and offer, in the same gate above, to remove the 🌱 adoption banner from `docs/index.md`. Remove it only on confirmation; the banner is curated structure that survives regeneration, so nothing below will take it out for you.

6. Run `/b-index` to regenerate `docs/adr/index.md` (and `docs/index.md` if it references the ADR section). If `/b-index` is not available in this session, write a minimal `docs/adr/index.md` yourself — see schema in `b-index.md`.

## Step 5: Handoff

Emit a single short handoff block. The next move depends on context:

- If invoked from `/b-feature` reconcile: `Run /b-feature <name>` to return to the parent change. (In practice the parent command resumes automatically; the handoff is a safety net for restarts.)
- If invoked from `/b-design` Stage 2: continue Stage 2 (the parent command handles it).
- If invoked to resolve an adoption-ledger item: say which line was deleted and how many remain open. If the ledger is now gone, say the adoption phase's exit condition is met and whether the banner was removed.
- If invoked directly: `(none — ADR recorded; resume your next task)`.

```
ADR-<slug> recorded: <title> [<status>]
<Filename>
<If supersession: ADR-MMMM marked superseded.>
<If narrowing: ADR-MMMM narrowed (still accepted).>
<If a ledger item was resolved: Ledger line drained: "<line>". N remain open.>
<If that was the last one: Ledger deleted — adoption phase complete.
 Banner removed from docs/index.md. | Banner left in place — remove it to end the phase.>

Next move:
  - <literal slash command, or "(none — ADR recorded; resume your next task)">
```
