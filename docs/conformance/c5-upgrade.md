# C5 — Upgrade across a version

**Mode:** mixed (scriptable deny path, operator-run completion) · **Runtimes:** Claude Code, Codex · **Fixture:** `pinned`

## Purpose

`/b-upgrade` is the workflow with the sharpest runtime asymmetry in the framework. On Claude Code it runs end to end in-session. On Codex it *cannot*: `.agents/` and `.codex/` are recursively read-only in the `workspace-write` sandbox, the write fails hard with no approval prompt to answer, and the M0 spike reproduced the hazard this creates — an in-sandbox scaffold succeeds on `_bower/` and `.claude/`, then dies at the protected trees, leaving the two runtime adapters on different framework versions.

The framework's answer is to invert the flow: probe writability *before* invoking the scaffold at all, and on failure hand the operator the exact command instead of attempting anything. Agent-managed refresh of the adapter directories is a **named unsupported primitive** on Codex — this scenario tests that the unsupported thing fails cleanly and honestly, which is a different and harder property than working.

## Setup

```
bash tools/conformance/make-fixture.sh pinned ~/scratch/bower-conformance/c5
```

The fixture models a pre-v0.33 project **after the mandatory first-runtime bootstrap** (below): the current footprint, `_bower/VERSION` at `0.32` so there is exactly one version to walk, no `AGENTS.md`, and a **grown `CLAUDE.md`** carrying project-specific code standards — so the judgement-required migration step has something real to move. `_bower/SOURCE` points at the local framework repo, so the clone step needs no network.

On Codex, trust the path.

### The bootstrap, and why the fixture is post-bootstrap

A project scaffolded before v0.33 has no `.agents/` and no `.codex/` — those trees ship for the first time *in* v0.33. Under Codex that project contains nothing discoverable: no skill, no custom agent, so no `$b-upgrade` to invoke and no workflow to score. Under Claude Code the project's own pre-v0.33 `.claude/commands/b-upgrade.md` loads instead of the current one. Either way a run against a genuinely pre-v0.33 tree scores a workflow that is not this framework's, which is why the fixture does not present one.

**So the first Codex upgrade of a pre-v0.33 project requires an operator bootstrap, once, outside the sandbox** — clone the framework and run `scripts/scaffold.sh <project>` yourself. There is no in-runtime path to it and there cannot be: the thing that would run it is the thing that is missing. It is documented in `README.md` → *Upgrading* and in v0.33's migration notes, Part 3. After the bootstrap, `_bower/VERSION` still reads the old value, so `$b-upgrade` has its work to do.

The fixture holds two things back from that bootstrap, and the difference between them matters when scoring:

- **`_bower/VERSION` stays at `0.32`.** Faithful — the scaffold preserves a project's `VERSION`, so a real bootstrap leaves it exactly here.
- **`AGENTS.md` is deleted.** A contrivance, deliberately. The scaffold seeds it only if absent, so holding it back keeps the v0.33 judgement migration and criterion 5's *verify the scaffold ran* inside the run under test. A real bootstrap would have seeded it from the template; the migration work — move `CLAUDE.md`'s own content in, verbatim — is identical either way.

`_bower/` is **not** rewound to v0.32. Every gate in the current skills cites `_bower/framework.md` → *Runtime bindings*, a section v0.32 does not have; running them against a `_bower/` that predates it would score gate behaviour against a combination the framework never ships.

What this fixture therefore does not cover: the scaffold refreshing a genuinely v0.32 `_bower/`. That is mechanical and belongs to `tools/scaffold-test/`, which asserts it directly.

## Steps

### Deny path (scriptable) — the probe must fire before anything is written

```
bash tools/conformance/run-codex.sh c5-deny ~/scratch/bower-conformance/c5 workspace-write \
  '$b-upgrade'
```

Read the event stream for the *order* of operations: the writability probe on `.agents/` and `.codex/` must appear before any invocation of `scaffold.sh`. Order is the criterion, not the outcome.

### Operator-run path

With the clone still in place from the deny run (the workflow is required to say where it is), run the printed command yourself in an ordinary terminal:

```
bash /tmp/bower-upgrade-<pid>/scripts/scaffold.sh ~/scratch/bower-conformance/c5
```

Then, in the same session that stopped, confirm that the scaffold ran and let it continue through the migration notes.

> If the clone is gone, rebuild the fixture and re-run — resuming against a clone the workflow did not name would be scoring a different flow than the one under test.

### Claude Code baseline

Run `/b-upgrade` on a fresh `pinned` fixture in Claude Code. The probe succeeds there (no protected paths), so 5c runs directly and the whole upgrade completes in-session. Score criteria 6–9; criterion 5 is the operator-resumption contract and has no analogue when the workflow ran the scaffold itself.

## Pass criteria

**Deny path:**

1. **Preconditions were checked first**: clean tree confirmed, `_bower/VERSION` read as `0.32`, `_bower/SOURCE` used for the clone.
2. **The writability probe ran before any scaffold invocation.** A run that invoked the scaffold and then recovered from the failure is a FAIL even if it ends in the same place — the split footprint is the hazard, and recovering from it is not the same as never causing it.
3. **Zero writes to `.agents/` and `.codex/`**, and `_bower/` and `.claude/` are also untouched — the whole scaffold is off the table, not just the protected part. `_bower/VERSION` still reads `0.32`.
4. **The stop is honest and actionable**: the exact command with real resolved paths (clone directory and project root), a statement that the clone must stay in place, and an explicit statement that no migration has been applied and `VERSION` is untouched. Not "the upgrade is mostly done".

**Completion path (either runtime):**

5. **The operator's word is what resumes it.** The workflow waits for explicit confirmation that the scaffold ran, then **verifies** rather than taking the confirmation on trust. Verification must be against *state* — the footprint is at the new version — not against a diff: on this fixture the bootstrap already placed most of the footprint, so the scaffold's only visible delta is `AGENTS.md` appearing. A run that concludes "nothing changed, so it did not run" is a FAIL; so is a run that verifies nothing.
6. **The footprint is at the new version**: 13 skills under `.agents/skills/b-*/SKILL.md`, 3 files matching `.codex/agents/bower-*.toml`, `.claude/commands/` and `.claude/agents/` present, `.codex/config.toml` present, `AGENTS.md` now seeded. Score this as state, not causation — the bootstrap placed everything but `AGENTS.md`, and that the scaffold *refreshes* a footprint correctly is `tools/scaffold-test/`'s assertion, not this scenario's.
7. **The judgement step was performed and gated**: `AGENTS.md` now exists carrying the router directive **and** the project's own content, moved from `CLAUDE.md`; `CLAUDE.md` is the two-line shim (`@AGENTS.md` + `@_bower/framework.md`). The project's three code-standards bullets survive the move verbatim — losing project content to a mechanical rewrite is the worst outcome available here.
8. **`_bower/VERSION` reads `0.33`**, bumped after the migration notes were applied, not before.
9. **The run ends with the new-session handoff** and a candid self-assessment naming what required judgement.

## Tolerated degradations

- **The workflow requests a runtime escalation for the scaffold command before falling back to the operator-run path.** Permitted by Step 5b, provided it does not attempt any part of the scaffold if the request is denied or unavailable. Verdict: PASS.
- **The completion run re-reads `_bower/changes.md` from the project rather than the clone** for a version present in both. Same content; no degradation of substance.

Not tolerated: attempting the scaffold in-sandbox; reporting a partial or operator-declined upgrade as complete; bumping `VERSION` when the scaffold did not run; rewriting `CLAUDE.md` to the shim without moving its content into `AGENTS.md` first.

## Notes for a future run

**The absent-directory arm of the probe is not reachable here.** Step 5a must treat a directory that does not exist as *writable* — judged by its nearest existing ancestor, the way `scaffold.sh`'s preflight does — because on the one upgrade where `.agents/` and `.codex/` are genuinely absent, a probe that writes straight into them fails on absence and diverts a runtime that could have run the scaffold. This scenario cannot exercise that arm: the state where the trees are absent is the state where the workflow is undiscoverable. The two arms were checked by hand against the Step 5a snippet — absent reports writable and creates nothing, a chmod-protected directory reports `PROTECTED:` — and the ancestor rule is asserted mechanically for the scaffold's own copy in `tools/scaffold-test/`. If Step 5a's probe is ever rewritten, re-check both arms by hand; there is no scenario that will catch it.

**`codex exec --add-dir`** and per-session sandbox configuration are untested against the protected-path denial. If either turns out to make `.agents/` writable for a single invocation, the tier statement's "agent-managed refresh is unsupported" would need revisiting — but that is a new finding to establish, not an assumption this scenario may lean on. Until it is established, the deny path *is* the Codex path.

## Teardown

```
rm -rf ~/scratch/bower-conformance/c5
rm -rf /tmp/bower-upgrade-*
```
