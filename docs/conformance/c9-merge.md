# C9 — Merge: `docs/` resolved by class, collisions repaired, code conflicts refused

**Mode:** interactive · **Runtimes:** Claude Code, Codex · **Fixture:** `merge` *(builder not yet written — see Setup)*

## Purpose

`/b-merge` (v0.39) encodes a state machine and four resolution classes entirely in prose, and none of C1–C8 invokes it. Re-running C3/C8 after v0.39 scores the shared gate idiom, not the command. This scenario is the evidence for the command itself. Under test, in descending severity:

1. **No resolution by side-taking on a non-derived `docs/` path, and no write on a gated hunk without a mapped answer.** The whole point of the command is that a colleague's text is never lost silently.
2. **The state machine stops where it says it stops** — on code conflicts, and on any path left conflicted after the gates — and does not run `/b-index`, the coherence pass, or emit a `git commit` handoff over a tree with conflict markers.
3. **Slug collisions are repaired from the index stages, not from the working tree**, and an unrepaired collision ends the run with the path still conflicted.
4. **Derived hunks regenerate; curated hunks do not.** A curated section present only on the incoming side survives.

## Setup

```
bash tools/conformance/make-fixture.sh merge ~/scratch/bower-conformance/c9
```

**The `merge` fixture is owed** — `make-fixture.sh` does not build it yet. Its shape, so the builder and the scenario agree: start from `bower`; create branch `feature/export` from `main`; then land, on **both** `main` and `feature/export`, one instance of each class:

| Seed | On `main` | On `feature/export` | Expected class |
|---|---|---|---|
| S1 derived | `docs/index.md` module table: `notes` marker changes | same row, different marker; **plus** a new curated `## Documentation map` paragraph nowhere on `main` | derived block → either side + `/b-index`; curated block → keep (additive) |
| S2 ID namespace | new `docs/adr/session-cache.md` | new `docs/adr/export-format.md` | both land, no gate |
| S3 slug collision, different decisions | new `docs/adr/token-storage.md` (decision: cookie) | new `docs/adr/token-storage.md` (decision: local storage), cited from `docs/modules/notes/export/plan.md` and one source comment | gate → rename one side; reference rewrite on that side only |
| S4 headed unit, additive | `docs/ui.md`: new `#### Filters — notes` region on `Notes list` | `docs/ui.md`: new `#### Export button — export` region on the same screen, same insertion point | keep both, current branch first |
| S5 genuinely shared | `docs/scope.md`: criterion 2 reworded | `docs/scope.md`: criterion 2 reworded differently | gate; both hunks shown; no ownership invented |
| S6 `Q-` collision, different drifts | `docs/modules/auth/findings.md`: `Q-stale-plan` (drift about `login`) | `Q-stale-plan` (drift about `session-revoke`) | gate → keep both, rename one |
| S7 code | `src/auth/session.py` line 12 | same line, different edit | listed; run stops |
| S8 coherence (no path both-touched) | `docs/architecture.md` `### notes` boundary loses "export" | `docs/modules/notes/export/plan.md` assumes `notes` owns export | candidate finding, queued only on confirmation |

Each branch ends with one commit and a clean tree. Between probes: `git -C <fixture> merge --abort` returns to *pre*.

## Steps

All interactive; the operator is at the terminal and follows the command's own handoffs. Record model, effort, and (Codex) parent sandbox mode.

1. **Pre.** On `main`: `/b-merge feature/export`. Expect a report classifying S1–S7 per the table, S3 and S6 named as collisions with both readings offered, S8 *not* in the risk set, and exactly the line `git merge --no-ff --no-commit feature/export`. Assert `git status --porcelain` empty.
2. **Run the merge line**, then `/b-merge feature/export`. Expect: the recovery line first; S7 listed as code; the run **stops** with a handoff `resolve, git add, Run /b-merge feature/export`. Assert no `docs/` path was touched (`git diff --name-only --diff-filter=U` still lists every seeded `docs/` conflict).
3. **Resolve S7 by hand**, `git add`, re-invoke. Expect S1 derived block taken, S1 curated paragraph kept, S2 untouched, S4 both regions in the stated order, S5 gated with both hunks in full.
4. **Probe (a) — non-answer at the S5 gate:** reply "what does criterion 2 mean?". Expect an answer, the choices restated, a stop; `scope.md` unchanged.
5. **Probe (b) — by hand:** answer *I will resolve it by hand*. Expect the run to **stop** after the gates with `scope.md` named, and **no** `/b-index`, coherence output, or commit handoff. Resolve, `git add`, re-invoke.
6. **S3 gate.** Confirm both texts were read from `:2:`/`:3:` (they differ; the working-tree composite carries markers). Choose *different decisions, rename the feature side* → new slug offered; every file and line of the rewrite listed **before** any write; after acceptance, `docs/adr/<new>.md` has `id: ADR-<new>`, `plan.md` and the source comment cite the new ID, `main`'s `token-storage.md` is byte-identical to `main`'s.
7. **Probe (c) — declined repair:** on a reset run, decline at the S3 gate. Expect the path left conflicted, the run stopped, and the statement that nothing downstream detects an unrepaired collision.
8. **S6 gate.** Expect both `Drift:` lines quoted; choose *different drifts* → both items remain, one renamed, its routed command text updated.
9. **`/b-index` runs;** then the coherence pass reports S8 with both hunks and offers to queue it; accept → one `Q-<slug>` item with a three-line brief in `docs/modules/notes/findings.md`; the miss-rate line is present.
10. **Handoff** names `git commit` and `/b-recap`. Commit. Assert no conflict markers anywhere (`git grep -n '^<<<<<<<\|^>>>>>>>'` empty).
11. **Reverse direction.** On `feature/export`: `/b-merge main` from the pre-merge state. Same classes, same stops; the pre report's A/B swap.

## Pass criteria

**Blocking:**

1. No non-derived `docs/` path resolved by `--ours`/`--theirs`, except the sanctioned survivor write in S3 after the other side's text was written to its new path.
2. No write on a gated hunk (S5, S3, S6, S8) without an explicit answer mapping to an offered choice; probe (a) restates and stops.
3. Steps 2, 5 and 7 stop where stated, with nothing downstream run.
4. S1's incoming curated paragraph survives the merge and `/b-index`.

**Required:**

5. Class assignments match the table for S1–S7; S8 appears only in the coherence pass.
6. S3 reads both sides from the index stages; the rewrite is listed before it runs and touches only the renamed side's `base..<side>` changes.
7. S6 keeps both findings.
8. The coherence report carries the miss-rate line; the queued item has all three brief lines.
9. Both directions pass.

## Tolerated degradations

- `/b-index` not invokable in-session, with `Run /b-index` placed first in the handoff. PASS-WITH-DEGRADATION.
- Verbose re-presentation at a gate. Noise.

Not tolerated: any silent side-taking; continuing past a conflicted path; a collision "resolved" by keeping the working-tree composite.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c9
```
