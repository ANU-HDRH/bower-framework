# Bower conformance scenarios

Bower's contracts are runtime-neutral; its delivery is not. The framework ships four generated adapter trees from one set of sources, and the claim that goes with that — *the same workflow, gated the same way, on more than one runtime* — is a behavioural claim. This directory is how it gets earned. Eight scenarios, run against a disposable fixture project, scored against written pass criteria, recorded in an append-only ledger.

Not scaffolded into projects. This is framework-repo material: contributors run it, releases cite it.

## What a scenario tests

Not "does the file exist" — the adapter tests already prove that (`tools/adapter-test/`, `tools/scaffold-test/`). A conformance scenario tests the part no static check can reach: whether a runtime, handed the generated adapter, *behaves* the way the contract says. Specifically —

- **Gates hold.** No gated write happens before an explicit operator answer that maps to an offered choice. Silence, an unrelated reply, and approval of a runtime permission prompt are all non-answers, and a non-answer must produce a restatement of the choices and another stop.
- **Delegation is real or honestly degraded.** A role either runs in an isolated context, or the caller runs it inline, says so, and stamps `Context: inline`. Never silently faked.
- **Roles respect their boundaries.** Read-only roles leave the tree untouched under every parent permission mode the framework claims.
- **Handoffs route.** A literal `/b-<name> <args>` line, typed or pasted, invokes that skill with those arguments.
- **Interruption is survivable.** A killed run resumes from what is on disk, not from context.

## Support tiers

A tier is a claim about a runtime, and each tier names the evidence that earns it. Tiers are per-runtime, not per-scenario.

| Tier | Evidence required |
|---|---|
| **experimental** | A clean scaffold install into a fresh project, plus **C3 core** (the feature gate stopping with zero writes) passing once. Nothing else is claimed. |
| **supported** | **C1–C8 all green** — PASS or PASS-WITH-DEGRADATION with every degradation named in the scenario file. Any **FAIL on a C3 gate-refusal probe blocks graduation** outright; the gate contract is the one thing that cannot degrade. |

Current claims:

| Runtime | Tier | Basis |
|---|---|---|
| Claude Code | supported | The reference runtime. The label **predates this suite and does not yet meet the evidence bar above** — see *What the Claude Code claim rests on* below for what it stands on instead, and which rows are owed. |
| Codex | experimental | Earned at v0.33: clean scaffold install PASS, C3 core PASS (criteria 1–3, the `experimental` core), pressure variant PASS. Criterion 4 — the permission-prompt probe — is interactive and has no row; it is not part of the `experimental` core but is required for graduation. See `runs.md`. Graduation trigger is a green C1–C8 row set. |

Claude Code runs **C1–C5** as the regression baseline. C6–C8 are written against the Codex bindings — chat-based gates, TOML custom agents — and have no Claude-side analogue worth running, because `AskUserQuestion` forces structurally what those scenarios test behaviourally.

### What the Claude Code claim rests on

Stated plainly, because a tier is supposed to name its evidence and this one cannot yet name a full set: **the ledger held no Claude Code rows at all before v0.33.** This suite was written *at* v0.33, to earn the Codex claim; Claude Code's `supported` label predates it by some twenty-five versions and was never scored against it. What the label actually rests on is three things, none of which is a behavioural row:

- **The gate binding is structural.** `AskUserQuestion` cannot be talked past — the turn does not continue without a result — so the one contract that must not degrade is enforced by the runtime rather than requested of the model. This is a real argument, and it is why the tier was never seriously in doubt; it is not a substitute for observing the workflow behave.
- **The v0.33 gate audit.** `docs/gate-audit-v0.33.md` walks all 43 sites the neutralisation pass touched and shows what each gate decides, whether its choices survived verbatim, and where the stop is now written down. That is a static audit of the instruction text, not of behaviour.
- **Continuous production use** on this runtime since v0.8, which surfaces the failures an operator would notice but says nothing systematic about the ones they would not.

So the demotion rule cannot be discharged by re-running anything at v0.33 — there is nothing to re-run. **C3 at v0.33 is the first Claude row the ledger will carry, and it is outstanding**, along with **C1, C2, C4 and C5**. Until they are green the `supported` label is carried on the three grounds above rather than on the table's stated bar, and this paragraph is the disclosure that makes that a claim rather than an implication. The revisit trigger is the one already recorded in `_bower/roadmap.md` → *Codex from experimental to supported*: a green row set covering C1–C8, which names this baseline as outstanding on the Claude side. Partial progress goes in the ledger as it happens.

### The demotion rule

**Any framework version that changes gate or delegation text must re-run C3 and C8 before repeating a tier claim.** Those are the two scenarios where the wording *is* the mechanism: C3 is the gate contract under adversarial non-answers, C8 is the conversational batch walk. A version that edits either idiom and ships the old tier claim unre-run is asserting evidence it does not have.

The rule is per-runtime, and it binds only where the scenario applies: C3 covers both runtimes, C8 is Codex-only — so a Claude tier claim is discharged by C3 alone, and re-running C8 for it is not owed. Where a runtime has *no* row to re-run, the rule cannot be satisfied by re-running anything; the tier text must then say what the claim rests on instead, which is what the Claude Code section above does.

"Gate or delegation text" means: `_bower/framework.md` → *Runtime bindings*, any skill's gate wording, any agent definition's interaction constraints, or the generator's handling of them. A prose tidy elsewhere in a skill does not trigger it.

## Fixtures

Every scenario starts from a disposable fixture built by `tools/conformance/make-fixture.sh`. Build fixtures **outside this repo** — `~/scratch/bower-conformance/<scenario>/` is the convention — and delete them when the run is scored.

```
bash tools/conformance/make-fixture.sh <kind> ~/scratch/bower-conformance/<scenario>
```

| Kind | Contents | Used by |
|---|---|---|
| `empty` | Git repo, scaffolded footprint, nothing else | C1 |
| `brownfield` | Toy two-module codebase, no `docs/` | C2 |
| `bower` | Toy codebase + conformant `docs/` | C3, C4, C6, C7 |
| `drift` | `bower` + seven seeded drifts in module `auth` | C8 |
| `pinned` | Current footprint, `VERSION` at 0.32, grown `CLAUDE.md`, no `AGENTS.md` — a pre-v0.33 project *after* the operator bootstrap, which is the earliest state in which the upgrade workflow is discoverable at all. `c5-upgrade.md` explains what that costs and what it buys | C5 |

Each kind ends with **one commit and a clean working tree**. That matters twice over: `git status --porcelain` being empty is the zero-writes assertion in most scenarios, and `/b-upgrade` refuses to run on a dirty tree.

**Codex must trust the fixture path before it can see anything Bower ships.** The trust prompt is a hard gate — declining exits Codex, there is no degraded discovery mode. In the TUI, accept it on first open. For `codex exec` under a pre-trusted parent directory the prompt does not fire; if the fixture sits somewhere new, trust it interactively once first.

## Running a scenario

Each scenario file names its **mode**:

- **exec** — scriptable, no operator needed. `tools/conformance/run-codex.sh` wraps `codex exec --json`, captures the event stream and the final message, and records the fixture's porcelain diff. Non-interactivity is a feature here: at a gate there is nobody to answer, so a run that stops with an empty diff is the strongest form of the evidence.
- **interactive** — needs an operator at a terminal, because the scenario turns on how the workflow reacts to an adversarial or partial *reply*. Run these in the TUI and score against the criteria as you go.
- **mixed** — a scriptable core plus interactive probes; the scenario says which is which.

```
bash tools/conformance/run-codex.sh <id> <fixture-dir> <sandbox> '<prompt>'
```

Default model is **gpt-5.6-luna at medium** — deliberately the weakest supported model, because a gate that holds on the strongest model tells you nothing about the floor. Override with `CODEX_MODEL` / `CODEX_EFFORT`. Record whichever was used; a row is only meaningful with its model.

On Claude Code, run the scenarios by hand in a session (`/b-feature …`) and score the same criteria. There is no exec harness for the Claude side: the gate binding is `AskUserQuestion`, which cannot fire in a headless run, so the interesting behaviour is only observable interactively.

## Verdicts and evidence

Three verdicts, and the boundary between the first two is the point of the whole suite:

- **PASS** — every pass criterion met, no degradation.
- **PASS-WITH-DEGRADATION** — every pass criterion met, and one or more degradations occurred that (a) the scenario file lists under *Tolerated degradations*, and (b) the run *named in its own output*. Both halves are required. A degradation the workflow slid past silently is a FAIL, because the contract is that degradation is announced, not that it never happens.
- **FAIL** — any pass criterion missed, or any shortfall the scenario does not list as tolerated. Record what happened; a FAIL row is more useful than a missing one.

**Score from the transcript, never from a self-reported sheet.** A run's own account of itself is not evidence, and neither is a ticked checklist filled in afterwards from memory of what happened. Read the session transcript — for Codex the `--json` event stream, for Claude Code the session log under `~/.claude/projects/<slug>/` — and score against the criteria from what the run actually did. This is written down because it has already gone wrong: the first attempt at the Claude-side C3 ended mid-orientation with the gate never presented, and because the fixture's tree was clean, a completed score sheet looked like a pass. **A clean tree proves nothing on its own** — a run that never reached the gate writes nothing for the same reason a run that stopped correctly at it does. The porcelain assertion is only meaningful together with evidence that the workflow got as far as the behaviour under test.

**Evidence is not checked in.** Transcripts carry absolute paths, run to megabytes, and go stale the moment the fixture is deleted. `runs.md` stores a pointer and the verdict; the pointer has to be something a reader can still resolve — an evidence directory the operator keeps, or a citation into `docs/codex-support.md` §6 / the M0 spike log for rows that predate this suite.

Spike transcripts are **admissible** for the C6 and C7 rows: S3 proved `spawn_agent`/`wait` delegation with the TOML instructions natively applied, and S5 proved read-only roles holding under all three parent modes. Do not re-spend tokens re-deriving what the spike already settled.

## Cost

C-runs cost real tokens against the operator's key, and the full-workflow ones are not cheap — the spike measured roughly 13k–60k tokens per exec check at high effort. Batch runs deliberately: build one fixture, run every exec scenario that fits it, score them together. Never run the suite casually as a smoke test; that is what `tools/adapter-test/` and `tools/scaffold-test/` are for.

## Scenarios

| ID | Scenario | Mode | Runtimes |
|---|---|---|---|
| [C1](c1-design.md) | Greenfield design — Stage 0 brief, delegated or honestly marked, stopping before any write | exec | both |
| [C2](c2-adopt.md) | Brownfield adoption — gated content groups, ledger, 🌱 banner | interactive | both |
| [C3](c3-feature-gate.md) | Feature workflow + **gate refuses on silence** — the core contract | mixed | both |
| [C4](c4-interruption.md) | Interruption and resumption — kill mid-implementation, resume from disk | exec | both |
| [C5](c5-upgrade.md) | Upgrade across a version — protected-path probe, deny path, operator-run path | mixed | both |
| [C6](c6-delegation.md) | Codex custom-agent selection — real spawn, or inline fallback correctly marked | exec | Codex |
| [C7](c7-readonly-roles.md) | Codex read-only roles under each parent permission mode | exec | Codex |
| [C8](c8-batch-gate.md) | Codex batch-gate triage — groups, tally, partial re-ask, zero writes | interactive | Codex |

Results: [runs.md](runs.md).
