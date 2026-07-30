# Bower Module Review

You are running the Bower module-review workflow. This reviews **one completed (or near-complete) module** with fresh eyes, surfaces where the build diverged from what the docs, decisions, and rest of the module say it should be, and reconciles the divergences it can resolve itself — routing the rest to the commands that own them.

The review exists because a sequential, feature-at-a-time build systematically misses properties that only become visible once the module is whole: whether the tests cover the *interactions* between features, whether the docs still match the code, whether features built weeks apart answer the same question the same way. The implementing agent had every rationalisation for the current code in context; this command gets a fresh pair of eyes by delegating diagnosis to the read-only `bower-reviewer` subagent.

The target module: $ARGUMENTS

## Important Behavioural Rules

- **Diagnosis is read-only; the apply is bounded.** The `bower-reviewer` subagent surveys and reports — it never writes. This command *acts*, but only on the **owned** reconciliation classes (`inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`). Everything else is routed to `/b-feature` or `/b-design` as a literal-command next move. The command never makes a behavioural or architectural change itself.
- **Review is a state, not a single pass.** `## Module review`'s `Review:` marker in `module-status.md` goes ⏸ → 🚧 at the triage gate and 🚧 → ✓ only at closeout, when every accepted finding carries a disposition. Between those points the module is *in review*, the plan is on disk, and the operator can leave and come back across as many sessions as the work takes. Re-invoking `/b-review <module>` while the marker is 🚧 **resumes mediation** — it never re-diagnoses.
- **The plan tracks every accepted finding, owned and routed alike.** `docs/modules/<module>/review-plan.md` holds one `## Findings` checklist. Owned/routed decides *who acts*, not what is tracked — a routed item is ticked when the operator has run the command it names. This is what stops a pile of `/b-feature` findings scrolling off the console with no record. A plan is written whenever there is at least one accepted finding, **including a routed-only review**.
- **The plan is also the recovery anchor.** It is written *before* any reconciliation is applied, so a mid-apply crash leaves that file plus `git status` as the resumption material — same discipline as `/b-feature`'s post-gate `plan.md` write. It is transient: deleted at closeout, when the `Review: ✓` marker replaces it as the durable record.
- **One gate to start, one to close.** The triage gate authorises the work; the closeout gate confirms the review is finished. You do not re-gate each item in between, except that `adr-supersede` items run through `/b-adr`, whose own gate fires.
- **No findings log survives closeout.** What was fixed is in the commits; what was not was an operator decision. Do not write a findings history anywhere. The record is `Review: ✓ <date> (<N> of <N> features)` and nothing more.
- **Out-of-band volume is safe here by construction.** A review fix pass batches only changes that are *individually* ad-hoc-safe under existing framework rules: doc↔code reconciles (gate-free living-doc maintenance), test backfill for already-agreed behaviour, status-marker corrections, and ADR supersessions (gated by `/b-adr`). The one unsafe category — boundary erosion — is tracked in the plan but always routed to `/b-design` and never actioned here. The hard-redirect rule still holds.
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

Re-diagnosing while a plan is open would discard in-progress work and re-derive findings the operator has already triaged; the open plan means mediation is already owed.

**If `## Module review` is missing entirely**, the project predates the section. Treat the module as never reviewed, say so in one line, and write `## Module review` with `Review: ⏸` before proceeding — do not infer a past review from git history or from prose elsewhere in the file.

**Broken state.** The marker and the plan are two sides of one fact, so a disagreement means a prior run died mid-flight or something hand-edited one of them. Do not guess. State what you found and ask the operator which to trust: the plan is the substantive artifact, so `🚧` + no plan is normally *"that review was lost — start fresh"*, and a plan present under `⏸`/`✓` is normally *"the marker was never set or was closed early — resume mediation and set it to 🚧"*. Act only on their answer.

Review is most valuable when the module is complete (all features ✓, integration ✓), but it does not hard-require completion; if the module is mid-build, note that the review will find expected gaps and let the operator decide whether to proceed.

## Step 1: Diagnose (spawn the subagent)

Spawn the `bower-reviewer` subagent via the Agent tool. Pass it the module name and the project root. The subagent reads the module's `module-status.md`, each feature's `plan.md`/`status.md`, the constitution's testing conventions, the `## Software architecture` entry, the ADRs touching the module, and the code — then returns a **review report** conforming to `_bower/review-schema.md`.

Do not re-derive the review yourself or second-guess the subagent's findings inline. Its isolation is the point — it sees the code without the implementer's context. Your job is to consume the report, gate it, and execute against it.

## Step 2: Present the Findings

Print the report's findings to the operator as a readable, numbered block — grouped by dimension, ordered by severity, each showing the drift (the two things that disagree), the proposed resolution, and the class. Include the `## Considered and ruled out` and `## Observations (not actionable)` sections — the negative space is how the operator judges whether the review was thorough, and the observations carry signal (e.g. an ADR whose commitments weren't visible from the index) that doesn't become an action.

Separate the findings visually into:

- **Owned reconciliations** — `inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`. These are what this command actions itself.
- **Routed** — `route:/b-feature`, `route:/b-design`. These need another command's gate; you surface them, the operator runs them. They are still *tracked* in the plan.

Print the report's `## Constitution contradictions` section too, **separately from both groups and unabridged** — verbatim quote, `docs/constitution.md:NN`, the contradicting evidence, and which findings leaned on the claim. It is neither owned nor routed: `constitution.md` is human-owned, so it gets its own consent gate below and never enters the plan.

This printed block is transient triage material. The operator reads it here, and the plan (next step) is what makes it survive the session — say so if the finding count is large, because the console is not the record.

## Gate: Triage

Present one AskUserQuestion asking the operator to confirm disposition. Frame as:

"I found N owned reconciliations and M routed findings in module `<module>`. Confirm to open the review — I'll write the plan, apply the owned items, and leave the routed ones tracked for you to run. Or tell me which findings to drop, or cancel."

Offer the disposition choices (e.g. *Open the review and action all owned items* / *Let me deselect some* / *Cancel — just show me the report*). If the operator chooses to deselect, ask them to name the finding numbers to drop; the rest become the plan.

Routed findings are **not** informational at this gate — accepting them puts them in the checklist, where they hold the review open until run or won't-fixed. Say that plainly when asking, so the operator understands they are agreeing to tracked work, not just reading a list. A review whose findings are *all* routed is a normal outcome and still opens a review.

**Do not write the plan, set the marker, or apply anything until the operator confirms.** If they cancel, emit the findings and observations as a read-only handoff, leave `Review:` untouched, and stop — a cancelled triage means no review was opened.

## Gate: Constitution consent (only if contradictions were reported)

If the report's `## Constitution contradictions` section has entries, ask about them in a **second, separate** AskUserQuestion — never merged into the triage question above, because the triage question authorises *this command* to act, and this one authorises an edit to a file the command does not own.

Per contradiction, restate the verbatim quote and its `docs/constitution.md:NN` before asking, so the operator can open the file and read the line in context rather than trusting a summary. Offer: correct the claim to match reality · move it under `## Not yet in force` (it was an aspiration) · leave it alone. Edit `docs/constitution.md` only on an explicit instruction to do so — that makes the edit prompted, which ownership permits. Anything else means leave the file untouched.

This gate runs even when the operator cancelled the triage gate, and even when every dimension came back clean: a false constitution is worth surfacing on its own, and it is the one thing here nothing else in the framework is looking for.

**A corrected constitution can invalidate findings that were measured against it.** If an accepted reconciliation's `Bearing:` names a claim the operator just corrected, say so and re-confirm that item before it goes in the plan — the bar it was judged against has moved.

## Step 3: Write the Plan

After confirmation, if there is at least one accepted finding **of any class**, write `docs/modules/<module>/review-plan.md` *before* applying anything:

```markdown
# Review plan: <module>

Open review, diagnosed YYYY-MM-DD against 5 features. **Not living documentation** — this file is deleted at closeout, when `module-status.md`'s `Review: ✓` becomes the record. While it exists the module is in review (`Review: 🚧`): `/b-recap` summarises it, the docs viewer makes its findings readable, and `/b-review <module>` is the only workflow that edits or disposes of them.

Dispositions: `[ ]` open · `[x]` resolved · `[~]` won't fix (operator decision, with date).

## Findings

- [ ] F3 — token-refresh/plan.md stale on TTL — inline-reconcile — docs/modules/<module>/token-refresh/plan.md:24
- [ ] F1 — ADR-0007 names Redis; code uses in-process — adr-supersede — /b-adr supersede ADR-0007
- [ ] F4 — backfill expired-token refresh test — test-backfill — src/auth/__tests__/refresh.test.ts
- [ ] F5 — session-revoke ✓ with pending verification — status-fix — docs/modules/<module>/session-revoke/status.md
- [ ] F2 — non-owner 404 vs 403 — route:/b-feature — Run /b-feature modify <module> non-owner-response-consistency
- [ ] F7 — session store reaches into billing tables — route:/b-design — Run /b-design
- [ ] F6 — consolidate JWT helper tests — route:/b-feature — Run /b-feature modify billing consolidate-jwt-helper-tests

## Observations (not actionable)

- (from the report's Observations section, or "None.")
```

Shape rules:

- **One `## Findings` checklist, owned and routed together**, each line carrying its class so the reader knows who acts. Order owned-first — those get actioned in this pass — but do not split them into separate sections; a routed item in a second section stops being tracked work, which is the failure this shape fixes.
- **A routed item names the exact command to run**, including its target module when the fix belongs to a *different* module than the one under review (F6 above). A cross-module finding stays in *this* module's plan — the plan is a review artifact, not a work queue — so the target must be explicit or the reader loses it.
- **Record the diagnosis date and the roster count** in the preamble. The count is the length of `## Build order` right now, and it is what gets written into `Review: ✓ (N of N features)` at closeout.
- `## Observations` is advisory, rides along so an interrupted session sees the whole picture, and never blocks closeout.

Then set the marker: write `Review: 🚧` in `module-status.md`'s `## Module review` section. Plan and marker go together — if you wrote one, write the other, in the same pass.

If there are **no** accepted findings (the module is clean, or the operator dropped everything), do not write a plan or marker yet. Retain the diagnosis-time roster count and go straight to the closeout gate with zero findings. A clean review is still a completed review, and it is the case where recording the fact matters most — there is no other evidence it happened.

## Step 4: (reserved — numbering aligns Apply with the rest of the family)

## Step 5: Mediate

Walk the `## Findings` checklist. Tick each box as it is disposed of — **update the file as you go, not in a batch at the end**; the plan's value is that it is accurate at the moment a session dies.

**Owned items — action them now.** For each open owned item, in any order:

- **`inline-reconcile`** — edit the stale `plan.md` / `status.md` line to match the code. This is living-doc maintenance; no further gate. Tick the box.
- **`status-fix`** — correct the dishonest marker. If the fix is "flip ✓ to 🚧 because a manual check is pending," do that. If it's "the manual check actually passes," confirm with the operator (it's a real verification) before flipping to ✓ and clearing the `Pending verification:` line. Whenever a feature ends this step at ✓, leave its `status.md` in the **terminal form** — marker, `## Verification`, `## Next move` → `(none — complete)` — which also discharges a finding about a forward-pointing next move on a finished feature. Tick the box.
- **`test-backfill`** — write the test for the already-agreed behaviour and run it. If it passes, tick the box. **If writing the test reveals the code is actually wrong**, do not paper over it: re-classify the item in place to `route:/b-feature`, leave it open, and note it — a behavioural defect needs the propose-confirm gate, not a silent fix here. The item now holds the review open, which is correct.
- **`adr-supersede`** — invoke `/b-adr` with the ADR-ID and the rationale. The class covers supersede *or narrow*: `/b-adr`'s supersede-vs-narrow test decides whether the drifted ADR is replaced or kept `accepted` with an exception carved out, and either outcome resolves the finding. Its own gate fires. On success, tick the box. If the operator rejects the draft at `/b-adr`'s gate, treat it as a request to redraft, not to skip; if they abandon ADR work entirely, leave the item open (or `[~]` if they call it won't-fix) rather than deleting it silently.

If implementation reveals the report was wrong about a finding (the drift doesn't actually exist), don't force the reconcile — mark it `[~]` with `report was wrong: <why>` and move on.

**Routed items — do not action them.** A routed item is ticked only when the operator has actually run the command it names. In a single session that usually means you present them and stop; the operator runs `/b-feature`, comes back, and re-invokes `/b-review <module>` to tick them off. Ask before ticking a routed item — "did `/b-feature modify …` land?" — rather than assuming from the fact that you see relevant changes in the tree. Boundary erosion (`route:/b-design`) is never actioned here under any circumstances.

**Won't-fix.** Any item can be disposed of as `[~]` on an operator decision, routed items included. Record it as `[~] F6 — <gist> — won't fix (operator, YYYY-MM-DD)`. You may *propose* a won't-fix when an item has become moot, but never mark one unprompted — it discharges work the operator agreed to at the triage gate. Won't-fix needs no further record anywhere; the decision dies with the plan by design.

## Gate: Closeout

When every item in `## Findings` carries a disposition (`[x]` or `[~]`), the review is finishable. Present one AskUserQuestion:

"All N findings in module `<module>` are disposed of (`<x> resolved, <y> won't fix`). Close the review? I'll delete the plan and record `Review: ✓ <today>`."

Offer: *Close the review* / *Keep it open — more to do* / *Show me the plan first*. Closing is the operator's call, not yours: they may know of related work still landing.

**A clean review (zero accepted findings, arriving here straight from Step 3) has no plan and no marker.** Phrase the gate as: "The review of `<module>` found nothing to act on. Record it? I'll write `Review: ✓ <today> (<N> of <N> features)`." Offer *Record it* / *Don't record — treat as never reviewed*. On confirmation, run only step 3 below with the roster count retained from Step 3 — steps 1, 2, and 4 have nothing to do (no markers changed, no plan exists to delete).

**If any item is still open, do not present this gate.** Report progress instead (`3 of 7 findings disposed`), leave `Review: 🚧` and the plan in place, and emit the Step 6 handoff naming what remains. An unfinished review is a perfectly good place to stop — that is the whole point of the state.

On confirmation:

1. If any status marker changed, run `/b-index` so module status reflects reality. If `/b-index` is not invokable, correct the module-level marker in `module-status.md` and leave `docs/index.md` to the next regeneration — never hand-edit the index, whose status is derived from those markers (see *Status is never curated* in `b-index.md`).
2. If a reconcile changed a feature's resumption picture, refresh that feature's `status.md` accordingly (≤150 words, current-state).
3. Write `Review: ✓ YYYY-MM-DD (<N> of <N> features)` in `module-status.md`'s `## Module review`, using today's date and the diagnosis-time roster count — from the plan's preamble when a plan exists, or the count retained from Step 3 for a clean review — **not** a recount of `## Build order` now. The snapshot answers *what was reviewed*, and if routed `/b-feature` work added features during mediation, those features were not part of this review. The review will therefore sometimes read as slightly stale the moment it closes; that is honest.
4. **Delete `docs/modules/<module>/review-plan.md`.** Its job is done, and `Review: ✓` is now the record. Leaving it would both rot and put the module in a broken state (`✓` with a plan on disk).

Steps 3 and 4 are one unit — never do one without the other. (A clean review is not an exception: it has no plan, so step 4 is vacuously done, not skipped.)

## Step 6: Handoff

Emit a single handoff block. State the review state explicitly — the operator needs to know whether they can walk away and whether coming back means `/b-review` again.

```
Module <module>: Review 🚧 in review — 3 of 7 findings disposed
                 (or: Review ✓ closed YYYY-MM-DD — 5 of 5 features)

Resolved this pass:
  - <one line per disposed item, or "(none)">

Still open — tracked in review-plan.md:
  - Run /b-feature modify <module> <slug>        (<finding gist>)
  - Run /b-design                                 (<boundary-erosion gist>, if any)
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

When the review is still open, say in one line that `/b-review <module>` resumes it and does not re-analyse — that is not obvious from the outside, and an operator who thinks resuming means re-running the reviewer will keep the findings in a text editor instead.

Pick exactly one recommended next move. A `route:/b-design` finding (boundary erosion) outranks everything — if one exists, it is the next move, because architectural drift is the one thing the framework will not let accumulate.

## Resuming mediation

When Step 0 found `Review: 🚧` with a plan on disk, you skipped diagnosis. Read the plan, then run Step 5 against its open `## Findings` items exactly as above — including the routed ones, which you tick as the operator confirms the commands landed — then the closeout gate if everything is disposed of, then the Step 6 handoff.

Do **not** re-spawn the reviewer. The findings were already gated when the plan was written, and re-diagnosing would replace triaged work with a fresh derivation the operator never agreed to. If the operator wants a *fresh* review rather than a resume, the current review has to close first (or they delete the plan and reset the marker themselves); say so rather than running both. Re-diagnosis is also how the routed items get lost — the exact failure the plan exists to prevent.
