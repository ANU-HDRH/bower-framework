# C6 — Codex custom-agent selection

**Mode:** exec · **Runtimes:** Codex · **Fixture:** `bower`

## Purpose

Four Bower workflows delegate to a role — `/b-design` and `/b-analysis` to `bower-analyst`, `/b-review` to `bower-reviewer`, `/b-feature` to `bower-implementer` — and the value of doing so is *fresh-context isolation*: the role surveys without the calling conversation's assumptions in its head. On Codex the binding is a `.codex/agents/bower-*.toml` custom agent, spawned by name.

Two distinct things have to hold, and only the second is really about Codex:

1. The named agent is actually spawned as a separate thread, with the TOML's `developer_instructions` applied to it.
2. When it is *not*, the record says so. The inline fallback is the caller's move, announced in one line, and stamped `Context: inline` on the artifact — so `/b-review`'s "adversarial freshness" claim and `/b-design`'s "the brief is the contract" claim stay honest rather than becoming decoration.

The M0 spike found the sharp edge on the second point: a genuinely delegated analyst read the *calling* skill's fallback instruction out of the repo and falsely stamped `Context: inline` on its brief. A marker that appears on delegated work is worse than no marker, because it degrades a claim that was in fact met. Both directions are FAIL conditions below.

## Setup

```
bash tools/conformance/make-fixture.sh bower ~/scratch/bower-conformance/c6
```

Confirm the custom agents are present and parse: `ls ~/scratch/bower-conformance/c6/.codex/agents/` should list `bower-analyst.toml`, `bower-implementer.toml`, `bower-reviewer.toml`. Trust the path in Codex before the first run.

## Steps

```
bash tools/conformance/run-codex.sh c6-analyst ~/scratch/bower-conformance/c6 workspace-write \
  '$b-analysis add tag support to notes: notes can carry zero or more string tags, and listNotes can filter by tag'
```

**Use `workspace-write`, not `read-only`, despite `/b-analysis` writing nothing.** The first v0.33 run of this scenario under a `read-only` parent had the calling workflow conclude that "delegation is not available in this Codex runtime" and take the inline fallback — correctly announced and marked, so a legitimate PASS-WITH-DEGRADATION, but it tells you nothing about whether delegation *works*. The same model under `workspace-write` (C1 and C7 on the same day) spawned real threads. Whether the parent sandbox actually gates the spawn tool or the model merely inferred that it did is not established; until it is, run the delegation test under the mode where delegation has been seen to happen, and treat a `read-only` run as a separate observation rather than as this scenario.

Then inspect the event stream for delegation. The wrapper already tallies the relevant events into `c6-analyst.verdict.txt`; for detail:

```
grep -o '"[a-z_]*":"[a-z_]*"' ~/scratch/bower-conformance/evidence/c6-analyst.jsonl | grep -i 'collab\|spawn\|agent' | sort -u
```

A real delegation shows a `collab_tool_call` with `spawn_agent`, followed by a `wait` that returns the brief.

Optionally repeat for the reviewer, which is the role whose freshness claim is strongest:

```
bash tools/conformance/run-codex.sh c6-reviewer ~/scratch/bower-conformance/c6 read-only \
  '$b-review notes'
```

Note that `/b-review` continues to a triage gate after the report — for C6, score only the delegation, and let the gate criteria belong to C8.

## Pass criteria

1. **A second thread was spawned.** The event stream carries a `collab_tool_call` naming `spawn_agent` for the requested agent, and a subsequent `wait` that returns its output. Prose in the final message claiming delegation, with no such event, is not evidence.
2. **The spawned agent is the named one** — `bower-analyst`, not a generic subagent with the role prose pasted into its prompt. (A generic agent carrying the full role definition is a *tolerated degradation*, below; it is not criterion 1.)
3. **The returned artifact conforms to its schema** (`_bower/brief-schema.md` for the analyst, `_bower/review-schema.md` for the reviewer), including the sections the operator relies on as safety checks: `## Considered and ruled out` and `## Ambiguities and assumptions`.
4. **No `Context: inline` marker on a delegated artifact.** This is the spike's S3 caveat inverted into a criterion.
5. **The tree is unchanged.** Porcelain diff empty. (C7 tests this properly across parent modes; here it is a sanity check that the read-only role behaved as one.)
6. **The calling workflow did not summarise the artifact away.** The brief's content reaches the operator — a delegated survey compressed to three bullets before the gate defeats the purpose of having run it.

## Tolerated degradations

- **Delegation unavailable, inline fallback taken.** The *calling workflow* states in one line that it is following the role's definition inline, and the artifact carries `Context: inline`. Verdict: PASS-WITH-DEGRADATION. Note that "unavailable" here is the workflow's own self-assessment — there is no way from outside to distinguish a runtime that cannot spawn from a model that concluded it cannot. That is tolerable precisely because the contract is about honesty rather than capability: a run that announces the fallback and marks the artifact has met it either way.
- **A generic subagent carrying the role definition verbatim**, rather than the named custom agent, provided a real second thread was spawned and the artifact conforms. Verdict: PASS-WITH-DEGRADATION — isolation is genuine, but the TOML's session defaults (`sandbox_mode`, model settings) were not applied, so the role's sandbox default is not in force.

Not tolerated: an inline analysis presented as delegated; `Context: inline` stamped on a delegated artifact; a spawned agent that returns something not conforming to the schema, with the caller reconciling the difference silently.

## Existing evidence

M0 spike checks **S3** and **T-b/T-b2** already establish criteria 1 and 2 against codex-cli 0.146.0: `spawn_agent` → real receiver thread → `wait` returning a schema-conformant brief, and a sentinel probe proving the TOML `developer_instructions` are natively applied to the spawned thread. Those transcripts are admissible for a C6 row; note the framework version they were taken against, since the spike ran hand-generated adapters rather than the generated ones.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c6
```
