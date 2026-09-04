---
name: b-review
description: Fresh-eyes review of a completed module via the bower-reviewer subagent; reconciles owned drift behind one triage gate and routes the rest.
---
<!-- GENERATED FILE — do not edit. Source: skills-src/commands/b-review.md. Regenerate: node scripts/build-adapters.cjs -->

# Bower Module Review

You are running the Bower module-review workflow. This reviews **one completed (or near-complete) module** with fresh eyes, surfaces where the build diverged from what the docs, decisions, and rest of the module say it should be, and reconciles the divergences it can resolve itself — routing the rest to the commands that own them. Diagnosis is delegated to the read-only `bower-reviewer` subagent, which sees the code without the implementer's context.

The request (the target module): the request as given in the message that invoked this skill.

## Important Behavioural Rules

- **Diagnosis is read-only; the apply is bounded.** The `bower-reviewer` subagent surveys and reports — it never writes. This command *acts*, but only on the **owned** reconciliation classes (`inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`). Everything else is routed to `/b-feature` or `/b-design` as a literal-command next move. The command never makes a behavioural or architectural change itself — its only reach into `docs/architecture.md` is deleting a *decided, not built* annotation whose owner has landed, which removes a marker and no claim (Step 5, `inline-reconcile`).
- **Review is a state, not a single pass.** `## Module review`'s `Review:` marker in `module-status.md` goes ⏸ → 🚧 at the triage gate and 🚧 → ✓ only at closeout, when every accepted finding carries a disposition. Between those points the operator can leave and come back across as many sessions as the work takes. Re-invoking `/b-review <module>` while the marker is 🚧 **resumes mediation** — it never re-diagnoses.
- **The plan tracks every accepted finding, owned and routed alike.** `docs/modules/<module>/review-plan.md` holds one `## Findings` checklist. Owned/routed decides *who acts*, not what is tracked. A plan is written whenever there is at least one accepted finding, **including a routed-only review**. Routed items additionally carry the reviewer's `Location`/`Drift`/`Resolution` verbatim (Step 3) — they are deferred into a fresh context, so the plan line is their entire handoff.
- **A finding is discharged when its drift is gone, not when a command has run.** The two coincide for `/b-feature` and come apart for `/b-design`, which produces a decision rather than a change. Ticks are verified against the code.
- **You are not the only writer of a tick, and you are the only auditor of one.** A `route:/b-feature` item is normally ticked by the command that discharged it, which appends a completion note (`— done YYYY-MM-DD via /b-feature <slug>`). So a tick you *find* is a claim, never a fact, and the closeout audit is the framework's only independent check on it. Everything else in the plan is still yours alone: briefs, `[~]` dispositions, re-classification, the `Review:` marker, and the plan's deletion.
- **The plan is also the recovery anchor.** It is written *before* any reconciliation is applied, so a mid-apply crash leaves that file plus `git status` as the resumption material. It is transient: deleted at closeout, when the `Review: ✓` marker replaces it as the durable record.
- **One gate to start, one to close.** The triage gate authorises the work; the closeout gate confirms the review is finished. You do not re-gate each item in between, except that `adr-supersede` items run through `/b-adr`, whose own gate fires.
- **No findings log survives closeout.** What was fixed is in the commits; what was not was an operator decision. Do not write a findings history anywhere. The record is `Review: ✓ <date> (<N> of <N> features)` and nothing more.
- **Boundary erosion is tracked in the plan but always routed to `/b-design` and never actioned here.** The hard-redirect rule still holds.
- **Literal-command handoff.** Every routed finding and every "next move" names the exact slash command to type next, never free prose.

## Step 0: State Check

Before anything else, determine which mode you're in:

Confirm the module exists (`docs/modules/<module>/module-status.md` is present). If it does not, stop and say so — recommend `/b-recap` to find the right module name.

Read that file's `## Module review` section and check for `docs/modules/<module>/review-plan.md`. The pair decides the mode:

| `Review:` | plan on disk | mode |
|---|---|---|
| 🚧 | yes | **Resume mediation** — skip Steps 1–2, go to Step 5 against the plan's undisposed items |
| ⏸ or ✓ | no | **Fresh review** — proceed to Step 1 |
| 🚧 | **no** | **Broken state** — see below |
| ⏸ or ✓ | **yes** | **Broken state** — see below |

**If `## Module review` is missing entirely**, the project predates the section. Treat the module as never reviewed, say so in one line, and write `## Module review` with `Review: ⏸` before proceeding — do not infer a past review from git history or from prose elsewhere in the file.

**Broken state.** A disagreement means a prior run died mid-flight or something hand-edited one of them. Do not guess. State what you found and ask the operator which to trust: the plan is the substantive artifact, so `🚧` + no plan is normally *"that review was lost — start fresh"*, and a plan present under `⏸`/`✓` is normally *"the marker was never set or was closed early — resume mediation and set it to 🚧"*. Act only on their answer.

Review is most valuable when the module is complete (all features ✓, integration ✓), but it does not hard-require completion; if the module is mid-build, note that the review will find expected gaps and let the operator decide whether to proceed.

## Step 1: Diagnose (delegate)

Delegate to the `bower-reviewer` subagent (binding: `_bower/framework.md` → *Runtime bindings*) and wait for its report. Pass it the module name and the project root. It returns a **review report** conforming to `_bower/review-schema.md`.

Do not re-derive the review yourself or second-guess the subagent's findings inline. Your job is to consume the report, gate it, and execute against it.

**Fallback — delegation unavailable.** This is the caller's move: follow `bower-reviewer`'s definition inline, say so in one line, and mark the report `Context: inline`. Announce the degradation again at the triage gate — "diagnosis ran inline; adversarial freshness is degraded".

## Step 2: Present the Findings

**Always print this block before the triage gate, in full, in this session.** Printing a count and going straight to the question is the failure this step exists to prevent: the operator cannot deselect findings they have not read.

Print the report's findings to the operator as a readable, numbered block — grouped by dimension, ordered by severity, each showing the drift (the two things that disagree), the proposed resolution, and the class. Include the `## Considered and ruled out` and `## Observations (not actionable)` sections.

Separate the findings visually into:

- **Owned reconciliations** — `inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`. These are what this command actions itself.
- **Routed** — `route:/b-feature`, `route:/b-design`. These need another command's gate; you surface them, the operator runs them. They are still *tracked* in the plan.

Print the report's `## Constitution contradictions` section too, **separately from both groups and unabridged** — verbatim quote, `docs/constitution.md:NN`, the contradicting evidence, and which findings leaned on the claim. It is neither owned nor routed: it gets its own consent gate below and never enters the plan.

**Pre-review findings.** Read `docs/modules/<module>/findings.md` if it exists — the module's findings queue, holding drift recorded outside review (spec: `_bower/framework-reference.md` → *Findings queue*). Print its open items in their own group, labelled **pre-review findings**, after the reviewer's. They are candidates for absorption into this review, decided at the triage gate; say so plainly, and note where the reviewer's own findings expand on or contradict one.

**An item that owns a *decided, not built* annotation is printed as not absorbable** — absorption would rename it and strand the annotation (`_bower/framework-reference.md` → *Forward-written claims*). Before printing this group, sweep once:

```
grep -rinA2 'decided, not built' docs/architecture.md docs/modules/*/*/plan.md
```

Read the owner from the three-line window. Mark any open item of this module's whose `Q-<slug>` appears as an owner **owner of a forward-written claim — stays in the queue**, naming the file and line. Nothing is owed; whoever runs the item discharges it as before.

If the finding count is large, say that the plan (next step) is the record, not this printout.

## Gate: Triage (batch gate)

Triage collects a disposition for the review as a whole — and, when the operator wants finer control, per finding.

**Never present this gate until Step 2's numbered findings block has been printed in this session.** If you are resuming, recovering, or otherwise arrived here without having printed it, print it first.

Present one operator gate framing it as:

"I found N owned reconciliations and M routed findings in module `<module>`. Confirm to open the review — I'll write the plan, apply the owned items, and leave the routed ones tracked for you to run. Or tell me which findings to drop, or cancel."

Offer the disposition choices (*Open the review and action all owned items* / *Let me deselect some* / *Cancel — just show me the report*). If the operator chooses to deselect, the walk that follows is a **batch gate** (binding: *Runtime bindings → Batch gates*): collect an explicit keep/drop disposition per finding, and act on none of them until the full set is confirmed; the kept findings become the plan.

**An ownerless *decided, not built* annotation is offered here as an acceptable finding, not filed under observations.** The operator chooses one of three dispositions, and the plan line records it (Step 3): **name an owner** — `inline-reconcile`, sub-line `Owner: <module>/<feature-or-Q-slug>`; **the claim is stale, delete it** — `inline-reconcile` in a `plan.md`, sub-line `Disposition: delete — stale`; or, for a stale claim in `architecture.md`, `route:/b-design`. Declined, it stays an observation. A review never pushes a finding into the queue (`_bower/framework-reference.md` → *Findings queue*, rule 6), so the plan is the record.

**Check a named owner at the gate.** A `<module>/<feature>` must be an entry in that module's `## Build order` that can still build something — not `✓`, not carrying `Remaining: none`; if the operator names one of those, say which and ask again. A `<module>/Q-<slug>` must be an open item in that module's `findings.md`, and naming it **withdraws it from absorption in this same triage** — say so as you accept it. You cannot create a queue item: where the right owner does not exist, the finding stays open and the operator records the item (`/b-feature` offers one at its own gate) or picks another disposition.

Routed findings are **not** informational at this gate — accepting them puts them in the checklist, where they hold the review open until run or won't-fixed. Say that plainly when asking. A review whose findings are *all* routed is a normal outcome and still opens a review.

**Pre-review findings are absorbed at this gate, or not at all.** If Step 2 printed queued items, the confirmation here also authorises moving the accepted ones into the plan — except any item that owns a forward-written claim, which is not offered and stays in the queue. That set is whatever is true at the end of this gate: the ones Step 2 marked, plus any the operator has just named as an owner here. Say so in the question, and offer them per item if the operator is deselecting. An absorbed item is renumbered into the `F` sequence, its brief carried verbatim, and removed from the queue in Step 3; from then on the plan's copy is the one that counts, and the review holds it open. An item left unabsorbed stays in the queue untouched — a legitimate answer, not a deferral.

**Do not write the plan, set the marker, or apply anything until the operator confirms.** If they cancel, emit the findings and observations as a read-only handoff, leave `Review:` untouched, and stop — a cancelled triage means no review was opened.

## Gate: Constitution consent (only if contradictions were reported)

If the report's `## Constitution contradictions` section has entries, ask about them at a **second, separate** operator gate — never merged into the triage question, which authorises *this command* to act; this one authorises an edit to a file the command does not own.

Per contradiction, restate the verbatim quote and its `docs/constitution.md:NN` before asking. Offer: correct the claim to match reality · move it under `## Not yet in force` (it was an aspiration) · leave it alone. Edit `docs/constitution.md` only on an explicit instruction to do so. Anything else means leave the file untouched.

This gate runs even when the operator cancelled the triage gate, and even when every dimension came back clean.

**A corrected constitution can invalidate findings that were measured against it.** If an accepted reconciliation's `Bearing:` names a claim the operator just corrected, say so and re-confirm that item before it goes in the plan.

## Step 3: Write the Plan

After confirmation, if there is at least one accepted finding **of any class**, write `docs/modules/<module>/review-plan.md` *before* applying anything:

```markdown
# Review plan: <module>

Open review, diagnosed YYYY-MM-DD against 5 features. **Not living documentation** — this file is deleted at closeout, when `module-status.md`'s `Review: ✓` becomes the record. While it exists the module is in review (`Review: 🚧`): `/b-recap` summarises it and the docs viewer makes its findings readable. A command handed a routed finding ticks that one box on discharge, appending `— done <date> via <command>`; every other edit here, and the disposal of any item, belongs to `/b-review <module>` alone, which re-verifies each routed tick against the code before closing.

Dispositions: `[ ]` open · `[x]` resolved · `[~]` won't fix (operator decision, with date).

## Findings

- [ ] F3 — token-refresh/plan.md stale on TTL — inline-reconcile — docs/modules/<module>/token-refresh/plan.md:24
- [ ] F1 — ADR-0007 names Redis; code uses in-process — adr-supersede — /b-adr supersede ADR-0007
- [ ] F4 — backfill expired-token refresh test — test-backfill — src/auth/__tests__/refresh.test.ts
- [ ] F5 — session-revoke ✓ with pending verification — status-fix — docs/modules/<module>/session-revoke/status.md
- [ ] F8 — architecture.md claim annotated `decided, not built` names no owner — inline-reconcile — docs/architecture.md:133
  - Owner: `billing/usage-metering` — chosen by the operator at triage YYYY-MM-DD
- [ ] F2 — non-owner 404 vs 403 — route:/b-feature — Run /b-feature modify <module> non-owner-response-consistency according to F2 in docs/modules/<module>/review-plan.md
  - Location: src/auth/login.ts:48 vs src/auth/refresh.ts:61
  - Drift: login returns 404 for a session that isn't the caller's; refresh returns 403 for the equivalent case. Two features, two answers to one question.
  - Resolution: Pick one (404 hides existence, 403 admits it); apply to both. Behavioural change with an acceptance criterion, not a doc reconcile.
- [ ] F7 — session store reaches into billing tables — route:/b-design — Run /b-design session-store-billing-boundary according to F7 in docs/modules/<module>/review-plan.md
  - Location: src/auth/session.ts:88 imports src/billing/repository/internal.ts
  - Drift: auth's module boundary admits only the billing module's public surface; session.ts reads billing's repository internals directly to resolve a plan tier.
  - Resolution: Architectural — the tier lookup belongs behind a billing-owned interface, or the concern belongs in a different module. /b-design decides which.
- [ ] F6 — consolidate JWT helper tests — route:/b-feature — Run /b-feature modify billing consolidate-jwt-helper-tests according to F6 in docs/modules/<module>/review-plan.md
  - Location: src/auth/__tests__/login.test.ts:70, refresh.test.ts:55
  - Drift: both suites carry near-identical unit tests for the shared decodeJwt helper. Redundant; the helper deserves one home.
  - Resolution: Consolidate into one suite. Low priority — the operator may decline.

## Observations (not actionable)

- (from the report's Observations section, or "None.")
```

Shape rules:

- **One `## Findings` checklist, owned and routed together**, each line carrying its class so the reader knows who acts. Order owned-first — those get actioned in this pass — but do not split them into separate sections.
- **A routed item names the exact command to run**, including its target module when the fix belongs to a *different* module than the one under review (F6 above). A cross-module finding stays in *this* module's plan, so the target must be explicit. **`route:/b-design` items get a slug too** — a bare `/b-design` is not a runnable instruction.
- **The command ends `according to F<n> in <path-to-this-plan>`**, on the same line, as part of the command — never a parenthetical, a second line, or a bare `F6`. **The path is required, not decorative:** finding IDs are module-local, so `F6` alone does not identify a finding.
- **Every routed item carries a three-line brief**, indented beneath it: `Location:`, `Drift:`, `Resolution:`, copied *verbatim* from the report's finding. **All three, each non-empty**; if a field is genuinely unavailable, say so in the field rather than leaving it blank or writing a bare label. Do not summarise them — the report is gone after this pass. **Owned items do not get a brief** — they are actioned in this same pass with the report still in context.

  **One owned item carries one sub-line, and it is not a brief.** An accepted ownerless-annotation finding gets `Owner: <module>/<feature-or-Q-slug>` or `Disposition: delete — stale`, with the triage date — the operator's choice at the gate, which a resumed review cannot re-derive.

  Sub-bullets are indented and carry **no checkbox** — one checkbox per finding, or `/b-recap`'s and the viewer's disposition counts double-count. Keep each to one line; if `Drift:` needs a paragraph, the finding should have been split.
- **A ticked routed item may carry a completion note**, appended after the pointer as `— done YYYY-MM-DD via <command>`. You do not write it — the discharging command does — but it is part of the line schema, so preserve it on any item you edit, and read it as provenance when auditing the tick; it is not evidence the drift is gone.
- **Record the diagnosis date and the roster count** in the preamble. The count is the length of `## Build order` right now, and it is what gets written into `Review: ✓ (N of N features)` at closeout.
- `## Observations` is advisory, rides along so an interrupted session sees the whole picture, and never blocks closeout.

**Absorbed pre-review findings enter the plan here, and leave the queue in the same pass.** Give each one the next free `F<n>` — never carry its `Q-<slug>` (or legacy `Q<n>`) across — and rewrite its command's trailing clause to `according to F<n> in docs/modules/<module>/review-plan.md`. Copy `Location:` / `Drift:` / `Resolution:` **verbatim**, whatever the item's class — the no-brief rule for owned items is about not *writing* one, never about stripping one that exists. Then remove the item from `docs/modules/<module>/findings.md`, and delete that file if it is now empty.

Do both halves together. Say in one line which items you absorbed and what the queue has left.

Then set the marker: write `Review: 🚧` in `module-status.md`'s `## Module review` section. Plan and marker go together — if you wrote one, write the other, in the same pass.

If there are **no** accepted findings (the module is clean, or the operator dropped everything), do not write a plan or marker yet. Retain the diagnosis-time roster count and go straight to the closeout gate with zero findings. A clean review is still a completed review.

## Step 4: (reserved — numbering aligns Apply with the rest of the family)

## Step 5: Mediate

Walk the `## Findings` checklist. Tick each box as it is disposed of — **update the file as you go, not in a batch at the end**; the plan's value is that it is accurate at the moment a session dies.

**Owned items — action them now.** For each open owned item, in any order:

- **`inline-reconcile`** — edit the stale `plan.md` / `status.md` line to match the code. This is living-doc maintenance; no further gate. Tick the box.

  **Where the item is an ownerless annotation, act on its sub-line, read from the plan** (a resumed review has no conversation): `Owner:` — re-check it still resolves (a `<module>/<feature>` not `✓` and not `Remaining: none`; a `<module>/Q-<slug>` still open in that module's `findings.md`), then write it into the annotation and change nothing else; if it no longer resolves, leave both alone, leave the item open, and say what changed. `Disposition: delete — stale` — delete claim and annotation from the `plan.md`. An item with neither sub-line was never decided: do not choose, do not tick; re-put it to the operator.

  **One exception, deliberately narrow: a stale *decided, not built* annotation in `docs/architecture.md`** — the owner landed and the annotation survived. Delete the annotation (the banner's lines, or the inline clause) and change nothing else in that file. If deleting it would leave the surrounding prose *wrong* rather than merely unmarked, re-classify the item `route:/b-design` in place, leave it open, and say why.
- **`status-fix`** — correct the dishonest marker. If the fix is "flip ✓ to 🚧 because a manual check is pending," do that. If it's "the manual check actually passes," confirm with the operator (it's a real verification) before flipping to ✓ and clearing the `Pending verification:` line. Whenever a feature ends this step at ✓, leave its `status.md` in the **terminal form** — marker, `## Verification`, `## Next move` → `(none — complete)` — which also discharges a finding about a forward-pointing next move on a finished feature. Tick the box.
- **`test-backfill`** — write the test for the already-agreed behaviour and run it. If it passes, tick the box. **If writing the test reveals the code is actually wrong**, do not paper over it: re-classify the item in place to `route:/b-feature`, leave it open, and note it — a behavioural defect needs the propose-confirm gate.
- **`adr-supersede`** — invoke `/b-adr` with the ADR-ID and the rationale. **Pass the finding as cited evidence, not as operator intent**: its ID, the module whose plan holds it, and its `Location:` / `Drift:` brief. What the operator actually did was accept that finding at the triage gate and agree to supersede, so the ADR's attribution reads *"Drift found by review (`auth` F3); the operator accepted the finding at triage and chose to supersede."* Never *"the operator chose"* the decision itself — nobody put options to them — and never *ratified*: a batch triage disposition claims a disposition and no more, where *ratified* is reserved for a per-item decision against a cited artefact. The class covers supersede *or narrow*: `/b-adr`'s supersede-vs-narrow test decides whether the drifted ADR is replaced or kept `accepted` with an exception carved out, and either outcome resolves the finding. Its own gate fires. On success, tick the box. If the operator rejects the draft at `/b-adr`'s gate, treat it as a request to redraft, not to skip; if they abandon ADR work entirely, leave the item open (or `[~]` if they call it won't-fix) rather than deleting it silently.

If implementation reveals the report was wrong about a finding (the drift doesn't actually exist), don't force the reconcile — mark it `[~]` with `report was wrong: <why>` and move on.

**Routed items — do not action them.** Present them and stop. The operator runs the routed command, which ticks its own box on discharge; re-invoking `/b-review <module>` is for the findings still open and for closeout. Boundary erosion (`route:/b-design`) is never actioned here under any circumstances, and a design run never ticks — see the re-classification rule below.

**An item you find already `[x]` is left alone here.** The closeout gate audits every routed tick against the code before the plan is deleted, after all of them have landed.

**A routed item is ticked when the drift it names is gone — not when the command it names has run.** The two come apart for `/b-design`, which decides rather than implements: the decision has landed, the drift has not moved. Before ticking any routed item, open the `Location:` from its brief and confirm the disagreement is actually gone — one targeted read per item, not a re-review. Never tick on the operator's report that they ran something, and never on seeing related-looking changes in the tree.

**When a `route:/b-design` item's decision has landed but its code has not, re-classify in place.** Same finding, same `F<n>`, same unticked box: replace the class with `route:/b-feature` and the command with the implementation command, and rewrite the brief so the design output is carried forward — `Location:` still names the offending code, `Resolution:` becomes *implement <the ADR>'s decision here*, and `Drift:` names the accepted ADR as the side the code now contradicts. Tell the operator you did it and why. Keep the finding's number: they may be holding a handoff that names it. If the operator decides the implementation is not worth doing, that is a `[~]` won't-fix.

**On a resumed review, check the briefs before presenting.** If an open routed item is missing any of `Location:`/`Drift:`/`Resolution:`, or carries one as a bare label with no value — the plan predates v0.32, or was hand-edited — say so once, naming the items.

Do **not** offer to write the missing fields yourself — reconstructing a brief from code is a review performed with less context than `bower-reviewer` had. Offer the operator the two real options instead: carry on without briefs (the commands still run; whoever discharges a finding re-derives it, as before v0.32), or discard and re-diagnose — delete `review-plan.md`, set `Review: ⏸`, and run `/b-review <module>` fresh. Name the cost of the second: a reviewer run, and any `[~]` won't-fix decisions come back to be declined again. Never delete the plan without their agreement.

**Won't-fix.** Any item can be disposed of as `[~]` on an operator decision, routed items included. Record it as `[~] F6 — <gist> — won't fix (operator, YYYY-MM-DD)`. You may *propose* a won't-fix when an item has become moot, but never mark one unprompted — it discharges work the operator agreed to at the triage gate.

## Gate: Closeout

When every item in `## Findings` carries a disposition (`[x]` or `[~]`), the review is finishable — but **verify the routed ticks before offering the gate.** Closeout deletes the plan, so this is the last moment any of it is recoverable. For each `[x]` routed item, read the `Location:` from its brief and confirm the drift is gone. Owned items were applied by this command and need no re-check; `[~]` items are decisions, not claims about code.

A completion note (`— done 2026-08-10 via /b-feature <slug>`) is provenance, not evidence: it says which command and date to attribute the claim to, nothing about whether the drift is gone. Older ticks may also have been made under the pre-v0.34 rule, or by an operator answering "yes, I ran it." Read the code in every case.

**A legacy plan has no briefs, and that does not block closeout.** A plan written before v0.32 gives a routed tick no `Location:` to check. Locate the code from the finding's gist if the gist makes it unambiguous; where it does not, the item is **unverifiable, not failed** — do not untick it, and do not invent a location to check. Count those separately in the gate line and name them, so the operator can eyeball the ones nothing confirmed: `routed ticks: 3 verified, 2 unverifiable (F5, F9 — no brief; plan predates v0.32)`. They may still close the review.

Report the result as a line in the gate, always — `routed ticks verified: 5 of 5`. If a tick is checked and does not hold, do not present the gate: untick that item, re-classify it if the reason is a `route:/b-design` decision whose code never landed, say plainly what you found, and report progress instead.

Present one operator gate:

"All N findings in module `<module>` are disposed of (`<x> resolved, <y> won't fix`). Close the review? I'll delete the plan and record `Review: ✓ <today>`."

Offer: *Close the review* / *Keep it open — more to do* / *Show me the plan first*. Closing is the operator's call, not yours: they may know of related work still landing.

**A clean review (zero accepted findings, arriving here straight from Step 3) has no plan and no marker.** Phrase the gate as: "The review of `<module>` found nothing to act on. Record it? I'll write `Review: ✓ <today> (<N> of <N> features)`." Offer *Record it* / *Don't record — treat as never reviewed*. On confirmation, run only step 3 below with the roster count retained from Step 3 — steps 1, 2, and 4 have nothing to do (no markers changed, no plan exists to delete).

**If any item is still open, do not present this gate.** Report progress instead (`3 of 7 findings disposed`), leave `Review: 🚧` and the plan in place, and emit the Step 6 handoff naming what remains.

On confirmation:

1. If any status marker changed, run `/b-index` so module status reflects reality. If `/b-index` is not invokable, correct the module-level marker in `module-status.md` and leave `docs/index.md` to the next regeneration — never hand-edit the index (see *Status is never curated* in `b-index.md`).
2. If a reconcile changed a feature's resumption picture, refresh that feature's `status.md` accordingly (≤150 words, current-state).
3. Write `Review: ✓ YYYY-MM-DD (<N> of <N> features)` in `module-status.md`'s `## Module review`, using today's date and the diagnosis-time roster count — from the plan's preamble when a plan exists, or the count retained from Step 3 for a clean review — **not** a recount of `## Build order` now: features added during mediation were not part of this review.
4. **Delete `docs/modules/<module>/review-plan.md`.** `Review: ✓` is now the record; `✓` with a plan on disk is a broken state.

Steps 3 and 4 are one unit — never do one without the other. (A clean review is not an exception: it has no plan, so step 4 is vacuously done, not skipped.)

## Step 6: Handoff

Emit a single handoff block. State the review state explicitly — whether the operator can walk away, and whether coming back means `/b-review` again.

```
Module <module>: Review 🚧 in review — 3 of 7 findings disposed
                 (or: Review ✓ closed YYYY-MM-DD — 5 of 5 features)

Resolved this pass:
  - <one line per disposed item, or "(none)">

Still open — tracked in review-plan.md:
  - Run /b-feature modify <module> <slug> according to F1 in docs/modules/<module>/review-plan.md
  - Run /b-design <slug> according to F7 in docs/modules/<module>/review-plan.md
  - (none — all findings disposed)

Constitution:
  - <docs/constitution.md:NN — corrected | moved to "Not yet in force" |
     left as-is at the operator's request>, or "(none reported)"

Observations:
  - <non-actionable note, or "(none)">

Next move:
  - <the single most important open command, or:>
    Run /b-review <module>                        (resume mediation, nothing else owed)
    Run /b-recap                                  (orient before deciding)
    (none — module reviewed clean and closed)
```

**Print the command exactly as the plan carries it — reference included, on one line.** Do not shorten it to fit the column, and do not move it to a second line: a two-line handoff is a one-line paste plus a dropped clause. Reproduce the gist as a trailing comment only if it fits; the reference is the part that cannot be lost.

When the review is still open, say in one line that `/b-review <module>` resumes it and does not re-analyse.

Pick exactly one recommended next move. A `route:/b-design` finding (boundary erosion) outranks everything — if one exists, it is the next move.

## Resuming mediation

When Step 0 found `Review: 🚧` with a plan on disk, you skipped diagnosis. Read the plan, then run Step 5 against its open `## Findings` items exactly as above — including the routed ones, which you tick only once you have checked the code and found the drift gone, never on the operator's report that a command landed — then the closeout gate if everything is disposed of, then the Step 6 handoff.

Do **not** re-spawn the reviewer: the findings were already gated when the plan was written. If the operator wants a *fresh* review rather than a resume, the current review has to close first (or they delete the plan and reset the marker themselves); say so rather than running both.
