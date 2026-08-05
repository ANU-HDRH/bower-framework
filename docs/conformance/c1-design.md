# C1 — Greenfield design

**Mode:** exec · **Runtimes:** Claude Code, Codex · **Fixture:** `empty`

## Purpose

`/b-design` Stage 0 is the framework's most structurally demanding step: it delegates a whole-project survey to `bower-analyst`, receives a schema-conformant brief, and gates on that brief before a single file is written. Three contracts meet here — delegation, schema conformance, and a gate that precedes all writes — which makes it the cheapest scenario that exercises all three at once.

The greenfield case is chosen deliberately. With no `docs/` to survey, a brief that comes back full of confident detail is a brief that was invented rather than derived, and the `## Ambiguities and assumptions` section is where that shows.

## Setup

```
bash tools/conformance/make-fixture.sh empty ~/scratch/bower-conformance/c1
```

The fixture is a git repo carrying the scaffolded footprint and nothing else — no `docs/`, no `src/`. On Codex, trust the path before the first run.

## Steps

1. Invoke the design workflow with a change description that needs real architectural decisions:

   ```
   bash tools/conformance/run-codex.sh c1-design ~/scratch/bower-conformance/c1 workspace-write \
     '$b-design a command-line habit tracker: define habits, tick them off daily, show a streak summary. Local file storage, no server, no accounts.'
   ```

   `workspace-write` is the correct sandbox here — the point is that the workflow *could* write and does not.

2. Read `c1-design.last.md` (the gate text) and `c1-design.jsonl` (whether a second thread was spawned).

3. On Claude Code, run `/b-design` with the same description in a session and score the same criteria; stop at the Stage 0 gate and cancel.

## Pass criteria

1. **Stage 0 produced a brief**, not a plan or a set of files. It carries the `_bower/brief-schema.md` sections, including `## Considered and ruled out` and `## Ambiguities and assumptions`, both non-empty — on an empty repo there is a great deal assumed.
2. **The run ended at the Stage 0 gate**: the final message names what is being decided (accept the brief and proceed to Stage 1), presents the choices, and stops. It does not continue into Stage 1 on its own initiative.
3. **Zero writes.** `git status --porcelain` on the fixture is empty. No `docs/`, no ADR files, no scaffolding, no `plan.md`.
4. **Delegation is real or honestly degraded** (see C6 for the detailed treatment):
   - Delegated — the event stream shows a spawned agent thread, and the brief carries **no** `Context: inline` marker.
   - Inline fallback — the calling workflow says in one line that it ran the analysis inline, **and** the brief carries `Context: inline`.
5. **ADR IDs are real, not placeholders.** Any `new ADR-…` operation in the brief carries a pre-allocated ID (`ADR-0001` on an empty project). A literal `ADR-NNNN` anywhere in the brief is a FAIL — draft content is what gets written on confirmation.
6. **No manufactured certainty.** The brief does not assert decisions the request did not contain as though they were given. Storage format, file location, and CLI shape are all open questions here; they belong in ambiguities or in `## Considered and ruled out`, not stated as settled.

## Tolerated degradations

- **Inline analysis instead of a spawned agent**, provided criterion 4's inline half holds in full (one-line statement *and* the marker). Verdict: PASS-WITH-DEGRADATION. Fresh-context isolation is genuinely weaker; the record says so.

Not tolerated: an inline analysis presented as a delegated one, a `Context: inline` marker on a genuinely delegated brief, or any write before the gate.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c1
```
