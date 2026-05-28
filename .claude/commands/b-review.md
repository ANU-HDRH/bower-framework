# Bower Module Review

You are running the Bower module-review workflow. This reviews **one completed (or near-complete) module** with fresh eyes, surfaces where the build diverged from what the docs, decisions, and rest of the module say it should be, and reconciles the divergences it can resolve itself — routing the rest to the commands that own them.

The review exists because a sequential, feature-at-a-time build systematically misses properties that only become visible once the module is whole: whether the tests cover the *interactions* between features, whether the docs still match the code, whether features built weeks apart answer the same question the same way. The implementing agent had every rationalisation for the current code in context; this command gets a fresh pair of eyes by delegating diagnosis to the read-only `bower-reviewer` subagent.

The target module: $ARGUMENTS

## Important Behavioural Rules

- **Diagnosis is read-only; the apply is bounded.** The `bower-reviewer` subagent surveys and reports — it never writes. This command *acts*, but only on the **owned** reconciliation classes (`inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`). Everything else is routed to `/b-feature` or `/b-design` as a literal-command next move. The command never makes a behavioural or architectural change itself.
- **The plan is the recovery anchor.** Accepted findings are written to `docs/modules/<module>/review-plan.md` *before* any reconciliation is applied. If the session crashes mid-apply, that file plus `git status` is what makes resumption possible — same discipline as `/b-feature`'s post-gate `plan.md` write. The file is transient: it is deleted when every reconciliation is checked.
- **One gate.** The triage gate is the contract — the operator picks which owned reconciliations to action. You do not re-gate each item, except that `adr-supersede` items run through `/b-adr`, whose own gate fires.
- **Out-of-band volume is safe here by construction.** A review fix pass batches only changes that are *individually* ad-hoc-safe under existing framework rules: doc↔code reconciles (gate-free living-doc maintenance), test backfill for already-agreed behaviour, status-marker corrections, and ADR supersessions (gated by `/b-adr`). The one unsafe category — boundary erosion — is always routed to `/b-design` and never enters the plan. The hard-redirect rule still holds.
- **Literal-command handoff.** Every routed finding and every "next move" names the exact slash command to type next, never free prose.

## Step 0: State Check

Before anything else, determine which mode you're in:

- **If `docs/modules/<module>/review-plan.md` already exists** → you are **resuming**. Skip diagnosis (Steps 1–2). Go straight to Step 5 (Apply) against the existing plan's unchecked reconciliations. Re-reviewing while a plan is open would discard in-progress work; the open plan means reconciliation is already owed.
- **Otherwise** → you are **starting a fresh review**. Proceed to Step 1.

Confirm the module exists (`docs/modules/<module>/module-status.md` is present). If it does not, stop and say so — recommend `/b-recap` to find the right module name. Review is most valuable when the module is complete (all features ✓, integration ✓), but it does not hard-require completion; if the module is mid-build, note that the review will find expected gaps and let the operator decide whether to proceed.

## Step 1: Diagnose (spawn the subagent)

Spawn the `bower-reviewer` subagent via the Agent tool. Pass it the module name and the project root. The subagent reads the module's `module-status.md`, each feature's `plan.md`/`status.md`, the constitution's testing conventions, the `## Software architecture` entry, the ADRs touching the module, and the code — then returns a **review report** conforming to `_bower/review-schema.md`.

Do not re-derive the review yourself or second-guess the subagent's findings inline. Its isolation is the point — it sees the code without the implementer's context. Your job is to consume the report, gate it, and execute against it.

## Step 2: Present the Findings

Print the report's findings to the operator as a readable, numbered block — grouped by dimension, ordered by severity, each showing the drift (the two things that disagree), the proposed resolution, and the class. Include the `## Considered and ruled out` and `## Observations (not actionable)` sections — the negative space is how the operator judges whether the review was thorough, and the observations carry signal (e.g. an ADR whose commitments weren't visible from the index) that doesn't become an action.

Separate the findings visually into:

- **Owned reconciliations** — `inline-reconcile`, `test-backfill`, `status-fix`, `adr-supersede`. These are what this command can action.
- **Routed** — `route:/b-feature`, `route:/b-design`. These need another command's gate; you'll surface them as next moves, not action them.

This printed block is transient triage material — the operator reads it here. It is not written to disk except as the plan (next step).

## Gate: Triage

Present one AskUserQuestion asking the operator to confirm disposition. Frame as:

"I found N owned reconciliations and M routed findings in module `<module>`. Confirm to write the reconciliation plan and apply, let me know which owned items to drop, or cancel."

Offer the disposition choices (e.g. *Action all owned reconciliations* / *Let me deselect some* / *Cancel — just show me the report*). If the operator chooses to deselect, ask them to name the finding numbers to drop; the rest become the plan. The routed findings are informational at this gate — they are carried to the handoff regardless, since this command never actions them.

**Do not write the plan or apply anything until the operator confirms.** If they cancel, emit the routed findings and observations as a read-only handoff and stop.

## Step 3: Write the Plan

After confirmation, if there is at least one accepted owned reconciliation, write `docs/modules/<module>/review-plan.md` *before* applying anything:

```markdown
# Review plan: <module>

Transient reconciliation plan from a review on YYYY-MM-DD. **Not living documentation** — delete this file when every reconciliation is checked. While it exists, the module has reconciliation owed; `/b-recap` surfaces it as outstanding work. Do not consult it except when running `/b-review <module>`.

## Reconciliations (this command actions)

- [ ] F3 — token-refresh/plan.md stale on TTL — inline-reconcile — docs/modules/<module>/token-refresh/plan.md:24
- [ ] F1 — ADR-0007 names Redis; code uses in-process — adr-supersede — /b-adr supersede ADR-0007
- [ ] F4 — backfill expired-token refresh test — test-backfill — src/auth/__tests__/refresh.test.ts
- [ ] F5 — session-revoke ✓ with pending verification — status-fix — docs/modules/<module>/session-revoke/status.md

## Routed (run separately — not actioned here)

- F2 — non-owner 404 vs 403 — Run /b-feature modify <module> non-owner-response-consistency
- F6 — consolidate JWT helper tests — Run /b-feature modify <module> consolidate-jwt-helper-tests

## Observations (not actionable)

- (from the report's Observations section, or "None.")
```

The `## Reconciliations` checklist is what gates the file's life — deletion happens when every box is ticked. The `## Routed` and `## Observations` sections are advisory; they ride along so an interrupted session resuming from the plan still sees the whole picture, but they do not block deletion and are never actioned by this command.

If there are **no** owned reconciliations (every finding is routed, or the module is clean), do not write a plan file. Skip to Step 6.

## Step 4: (reserved — numbering aligns Apply with the rest of the family)

## Step 5: Apply

Walk the `## Reconciliations` checklist. For each unchecked item, in any order:

- **`inline-reconcile`** — edit the stale `plan.md` / `status.md` line to match the code. This is living-doc maintenance; no further gate. Tick the box.
- **`status-fix`** — correct the dishonest marker. If the fix is "flip ✓ to 🚧 because a manual check is pending," do that. If it's "the manual check actually passes," confirm with the operator (it's a real verification) before flipping to ✓ and clearing the `Pending verification:` line. Tick the box.
- **`test-backfill`** — write the test for the already-agreed behaviour and run it. If it passes, tick the box. **If writing the test reveals the code is actually wrong**, do not paper over it: re-classify the finding to `route:/b-feature`, move it to the `## Routed` section unticked, and note it — a behavioural defect needs the propose-confirm gate, not a silent fix here.
- **`adr-supersede`** — invoke `/b-adr` to supersede the drifted ADR, passing the ADR-ID and the rationale. Its own gate fires. On success, tick the box. If the operator rejects the draft at `/b-adr`'s gate, treat it as a request to redraft, not to skip; if they abandon ADR work entirely, move the finding to `## Routed` (or `## Observations`) and leave the box unticked rather than deleting it silently.

If implementation reveals the report was wrong about a finding (the drift doesn't actually exist), don't force the reconcile — strike the item, note why, and move on.

After every reconciliation box is ticked (or honestly moved to Routed/Observations):

1. If any status marker changed, run `/b-index` (or update `docs/index.md` and the module-level marker) so module status reflects reality.
2. If a reconcile changed a feature's resumption picture, refresh that feature's `status.md` accordingly (≤150 words, current-state).
3. **Delete `docs/modules/<module>/review-plan.md`.** Its job is done; leaving it would make it a record that rots.

## Step 6: Handoff

Emit a single handoff block. Re-surface the routed findings and observations as literal next moves — these survive the plan's deletion because the operator still has to act on them (or re-run `/b-review` later to re-derive them).

```
Module <module> reviewed: <N reconciliations applied, M routed, K observations>

Reconciled this pass:
  - <one line per applied reconciliation, or "(none)">

Routed — run separately:
  - Run /b-feature modify <module> <slug>        (<finding gist>)
  - Run /b-design                                 (<boundary-erosion gist>, if any)
  - (none)

Observations:
  - <non-actionable note, or "(none)">

Next move:
  - <the single most important routed command, or:>
    Run /b-recap                                  (orient before deciding)
    (none — module reviewed clean and reconciled)
```

Pick exactly one recommended next move. A `route:/b-design` finding (boundary erosion) outranks everything — if one exists, it is the next move, because architectural drift is the one thing the framework will not let accumulate.

## Resuming an open plan

When Step 0 found an existing `review-plan.md`, you skipped diagnosis. Read the plan, then run Step 5 against its unchecked `## Reconciliations` items exactly as above, finishing with deletion and the Step 6 handoff. Do **not** re-spawn the reviewer — the findings were already gated when the plan was written. If the operator wants a fresh review instead of resuming, they must let the current plan finish (or delete it) first; say so rather than running both.

<critical_constraints>
## What NOT To Do

- Do not skip the subagent and review inline — the fresh-eyes isolation is the point
- Do not apply anything before the triage gate
- Do not write the plan after starting to apply — the plan is the recovery anchor, written first
- Do not action a `route:/b-feature` or `route:/b-design` finding yourself — route it; boundary erosion is a hard-redirect to `/b-design`
- Do not silently fix a behavioural defect a `test-backfill` uncovers — re-route it to `/b-feature`
- Do not flag or "fix" ADRs for verbose or over-scoped prose — bodies are immutable; only drift from code is an ADR finding
- Do not leave `review-plan.md` on disk once its reconciliations are all resolved — delete it
- Do not let the plan accumulate (no dated variants, no second open plan) — one plan per module, finished and deleted before the next review
- Do not manufacture findings — a clean module produces a clean report and an empty plan
- Do not emit free-prose next moves — every routed item and the Next move is a literal slash command
</critical_constraints>
