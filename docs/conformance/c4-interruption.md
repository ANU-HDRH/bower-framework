# C4 — Interruption and resumption

**Mode:** mixed (interactive kill, scriptable resume) · **Runtimes:** Claude Code, Codex · **Fixture:** `bower`

## Purpose

Bower's durability claim is that state lives on disk, not in context: `plan.md` written before any code, status markers as the phase record, and `git status` as the ledger of work in flight. The claim is only worth anything if a *new session with no memory of the last one* can pick the work up. That is what this scenario kills a run to find out.

The failure mode being hunted is not a crash — it is a resumed session that quietly re-derives the plan instead of reading it, and so implements something the operator never confirmed.

## Setup

```
bash tools/conformance/make-fixture.sh bower ~/scratch/bower-conformance/c4
```

On Codex, trust the path.

## Steps

1. In a session at a terminal, invoke the feature workflow:

   ```
   $b-feature add a logout feature to the auth module: logout(token) revokes the session and returns whether a session was revoked, with tests
   ```

2. Confirm at the gate. Let it write `plan.md` and begin implementing.

3. **Kill it mid-implementation** — once at least one source file has been touched but before the run reconciles and updates status. Ctrl-C twice in the Codex TUI, or Esc/interrupt in Claude Code. Do not let it finish, and do not tidy up.

4. Record the interrupted state: `git -C ~/scratch/bower-conformance/c4 status --porcelain`. Keep a copy — it is the evidence baseline for criterion 4.

5. **In a completely fresh session** (quit and restart; instruction files are read once per session), orient:

   ```
   bash tools/conformance/run-codex.sh c4-recap ~/scratch/bower-conformance/c4 read-only \
     '$b-recap'
   ```

6. In another fresh session, resume with the command `/b-recap` named:

   ```
   $b-feature logout
   ```

   Score how it starts, not just how it ends.

## Pass criteria

1. **`plan.md` exists on disk** and was written before any source file was touched. Check the interrupted state from step 4: if source files changed and no plan exists, the ordering contract failed and the rest of the scenario is moot.
2. **`/b-recap` identifies the in-flight work** from disk alone: it names the feature, notes that its status marker is 🚧 with uncommitted changes present, and does not claim the feature is complete or absent.
3. **`/b-recap` names a literal resume command** for it — `/b-feature logout` or equivalent — not prose advice.
4. **The resumed run reads the existing plan rather than re-proposing.** It says which plan it is resuming from, does not re-run the propose-and-gate cycle from scratch, and does not write a second `plan.md` or a differently-named feature directory.
5. **Existing uncommitted work is acknowledged, not clobbered.** The resumed run inspects what is already on disk and builds on it. Overwriting a half-finished file after reading it is fine; overwriting it *without* reading it is not.
6. **The plan's acceptance criteria are the ones reconciled at the end** — the same criteria the operator confirmed before the interruption, not a fresh set derived after it.
7. `/b-recap` wrote nothing: porcelain diff for the `c4-recap` run identical to the step-4 baseline.

## Tolerated degradations

- **The resumed run re-presents the plan for a brief confirmation before continuing.** Slightly redundant, but conservative in the right direction: it is reading the plan and checking, not re-deriving. Verdict: PASS-WITH-DEGRADATION.
- **`/b-recap` describes the in-flight feature without naming the exact resume command**, provided it names the feature and its state. Verdict: PASS-WITH-DEGRADATION — the operator can still act, with one more step.

Not tolerated: a resumed run that re-proposes the feature from the original request and gates again from zero (the confirmed plan is the contract, and re-deriving it can silently change what gets built); a second `plan.md`; a run that reports the feature complete because the source file exists.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c4
```
