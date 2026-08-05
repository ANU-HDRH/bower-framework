# C8 — Codex batch-gate triage

**Mode:** interactive · **Runtimes:** Codex · **Fixture:** `drift`

## Purpose

Most Bower gates are one decision. `/b-review`'s triage is a disposition *per finding*, and there may be a dozen. `AskUserQuestion` handles that structurally — several questions, structured options, no way to answer three of four. A chat binding has no such scaffolding, and the tempting shape is exactly the wrong one: dump every finding in one block, ask for an omnibus reply, get a partial answer back, and fill in the rest.

So this is the scenario where the chat binding is least trivial, and the reason the framework specifies its shape rather than leaving it to judgement: small groups (at most 4), an explicit disposition per item before the next group, a running tally, a partial answer re-asking only the remainder, and a final restatement of every disposition confirmed before *anything* is written.

It is interactive by necessity. The behaviour under test is how the walk reacts to a deliberately awkward operator, and there is no way to be awkward in a scripted run.

## Setup

```
bash tools/conformance/make-fixture.sh drift ~/scratch/bower-conformance/c8
```

Seven genuine drifts are seeded in module `auth` — genuine in the sense that the reviewer must find them itself. Nothing hands it a report. `Review:` is at ⏸, so `/b-review auth` starts a fresh review rather than resuming mediation.

The catalogue, for scoring only — do not show it to the session:

| # | Drift | Expected class |
|---|---|---|
| D1 | `login/plan.md` claims username-format validation; `login.js` performs none | `inline-reconcile` |
| D2 | Three failure shapes across the module: `login` returns `null`, `revokeSession` returns a boolean, `renameUser` throws | `route:/b-feature` |
| D3 | `revokeSession`, `renameUser`, and the token helpers have no test, while `module-status.md` claims the session lifecycle is covered | `test-backfill` |
| D4 | Build order has `session-revoke — ⏸`, but `revokeSession` is implemented and shipped | `status-fix` |
| D5 | `src/auth/session.js` requires `../notes/store`, contradicting `architecture.md`'s `Dependencies: none` for auth | `route:/b-design` |
| D6 | `login/plan.md`'s Components table omits `src/auth/tokens.js`, which exists and is used | `inline-reconcile` |
| D7 | `login/status.md` verification cites 3 assertions; `login.test.js` now carries 5 | `inline-reconcile` |

D5 is the load-bearing one: boundary erosion is *always* routed to `/b-design` and never actioned by `/b-review`, whatever the operator says at the gate.

## Steps

Fresh Codex session in the fixture (trust the path first).

1. `$b-review auth`
2. Let it survey and present its findings. Note the count and each finding's class.
3. At the triage gate it must offer three choices — action all owned items / deselect some / cancel. Choose **deselect**.
4. Play an awkward operator, in this order:
   - **Group 1 — answer partially.** If it presents four findings, give dispositions for two only ("keep the first, drop the third"). It must re-ask *only* the two unanswered, not move on, and not fill in defaults.
   - **Group 2 — answer one item ambiguously.** "hmm, that one might be fine actually?" It must name the finding and re-ask it explicitly rather than guessing.
   - Watch for the **running tally** each round ("disposed 4 of 7").
5. When it reaches the final restatement of every disposition: **before confirming, check `git status --porcelain` in another terminal.** It must be empty.
6. Confirm. Then verify what it wrote.
7. Reset: `git -C ~/scratch/bower-conformance/c8 checkout -- . && git -C ~/scratch/bower-conformance/c8 clean -fd docs`

## Pass criteria

1. **At least six findings**, each with a class from the schema's six. The seeded drifts are all genuinely findable; a report with two findings means the survey was shallow, not that the fixture was clean.
2. **D5 is classed `route:/b-design`** and is *not* actioned in this pass, regardless of disposition. The hard-redirect rule holds.
3. **The triage gate offers the three choices** and stops. No walk begins before the operator picks one.
4. **Groups of at most four**, presented one group at a time.
5. **An explicit disposition per finding.** No defaults filled in, ever — including for findings the operator seemed indifferent to.
6. **The partial answer re-asked only the unanswered items.** Naming them, not re-presenting the whole group.
7. **The ambiguous answer was named and re-asked**, not resolved by inference.
8. **A running tally appeared each round**, so progress through the batch is visible without scrolling back.
9. **Zero writes before the final confirmation.** Porcelain empty at step 5. This is the criterion the whole conversational shape exists to protect: a walk that writes each disposition as it is collected has no point at which the operator can change their mind about the set.
10. **A final restatement of every disposition**, confirmed once, before any write.
11. **On confirmation:** `docs/modules/auth/review-plan.md` is written with the kept findings, the `Location:`/`Drift:`/`Resolution:` lines of every routed finding copied verbatim beneath its checklist line, and `Review:` in `module-status.md` flips ⏸ → 🚧.
12. **A well-formed routed handoff** ends the run — a literal command of the shape `/b-feature modify <slug> according to F<n> in docs/modules/auth/review-plan.md`, naming a finding that is actually in the plan.

## Tolerated degradations

- **Groups of two or three rather than four.** More rounds, same contract. No verdict impact.
- **The tally appears as a count of remaining rather than disposed** ("3 left" vs "disposed 4 of 7"). Same information.
- **The final restatement is grouped by disposition** (kept / dropped) rather than in finding order, provided every finding appears exactly once. Verdict: PASS.
- **Fewer than seven findings, but at least six**, with the misses named in `## Considered and ruled out` as deliberately ruled out rather than simply absent. Verdict: PASS-WITH-DEGRADATION — record which drift went unfound; a pattern across runs is a signal about the reviewer's dimensions, not about this scenario.

Not tolerated: an omnibus presentation of all findings seeking one reply; any default disposition; any write before the final confirmation; a partial answer treated as complete; `route:/b-design` work actioned in the pass; a handoff line naming a finding not in the plan.

## Existing evidence

M0 spike check **S7** established every behavioural criterion here (grouping, partial re-ask, ambiguity re-ask, tally, final restatement, zero writes before confirmation, marker flip, well-formed handoff) against codex-cli 0.146.0 with gpt-5.6-luna — but from a *seeded report file* rather than a real survey, so criteria 1, 2, and 11's verbatim-copy clause were not exercised. A C8 row needs a run against the `drift` fixture.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c8
```
