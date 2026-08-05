# C2 — Brownfield adoption

**Mode:** interactive · **Runtimes:** Claude Code, Codex · **Fixture:** `brownfield`

## Purpose

`/b-adopt` is the one workflow whose main risk is *confident fiction*: it reconstructs orienting docs from code alone, so every place it guesses intent is a place a project inherits a plausible falsehood. The framework's answer is structural — unattributed choices go to the adoption ledger, never to an ADR; every content group is gated before it is written; nothing in the codebase is fixed while describing it.

This scenario tests that the discipline survives the runtime binding, and it is interactive because the shape under test is a *sequence* of gates. One exec run only ever reaches the first.

## Setup

```
bash tools/conformance/make-fixture.sh brownfield ~/scratch/bower-conformance/c2
```

A two-module toy codebase (`src/auth`, `src/notes`) with no `docs/` at all, and no reference material staged — which should trigger the non-blocking reference-material nudge. On Codex, trust the path.

## Steps

Run in a session at a terminal (Codex TUI, or Claude Code).

1. Invoke `$b-adopt` (Codex) / `/b-adopt` (Claude Code) with no argument.
2. Answer the up-front framing questions minimally and truthfully — problem space, scope boundary, module boundaries. Do not volunteer detail; lazy elicitation is part of what is being tested, and a fixture operator who over-explains hides a failure to ask.
3. When the reference-material nudge appears, choose to continue without staging anything. It must not be asked twice.
4. Walk each content group's gate. At the **first** gate, before answering, check `git status --porcelain` — it must still be empty. Confirm each group; note whether the drafted content was shown *before* the write, not after.
5. At the ledger gate, confirm the drafted ledger. Note N.
6. After the run: inspect `docs/index.md` for the 🌱 banner, `docs/adoption-ledger.md` for the hard bullet format, `docs/adr/` for any ADR files, and `git status` for source edits.

## Pass criteria

1. **Every content group was gated before its write**, and the drafted content was presented at the gate. Writes happen per group, not batched to the end.
2. **Zero writes before the first confirmation.** Porcelain empty when the first gate is presented.
3. **No manufactured ADRs.** `docs/adr/` contains no decision records. Adoption may *offer* a `/b-adr` at the operator's discretion; it may not mint one.
4. **The ledger exists and is honest.** With N ≥ 1: `docs/adoption-ledger.md` present, one bullet per open item, no free-form body, and each item is a choice whose rationale genuinely could not be attributed from code. Items that are merely "things that could be better" are not ledger material.
5. **The banner tracks N.** N ≥ 1 → the 🌱 banner sits at the top of `docs/index.md`, pointing at the ledger. N = 0 → no banner and no ledger file, and the handoff says adoption completed clean.
6. **Reality was described, not fixed.** `git status` shows additions under `docs/` only. Not one byte of `src/` changed, and nothing was proposed as an edit mid-adoption — concerns became ledger items.
7. **Hedged where inferred.** Module purposes and boundaries in `docs/architecture.md` read as observations of the code, not as ratified intent, except where the operator confirmed them in step 2.
8. **The handoff names a literal command**, and the confidence paragraph is present and candid about what was inferred.

## Tolerated degradations

- **Gates presented in fewer, larger groups than a Claude-side run would use**, provided each group is still gated before its write and the operator sees the drafted content. Verdict: PASS-WITH-DEGRADATION. Grouping is a legibility property; the write-after-confirmation contract is not.

Not tolerated: any doc written before its gate, an ADR minted from inference, a banner pointing at an empty or absent ledger, or any edit to `src/`.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c2
```
