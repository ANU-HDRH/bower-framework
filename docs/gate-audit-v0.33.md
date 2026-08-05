# v0.33 gate audit — every `AskUserQuestion` site, walked

*Review artifact for the v0.33 neutralisation pass (commit `f307134`, "M1 — runtime-neutral instruction bodies"). Not scaffolded into projects; not framework behaviour. Its job is to make the claim "this was an audit, not a rewrite" checkable line by line.*

## What was claimed, and what this checks

The neutralisation pass removed every mention of `AskUserQuestion` from the instruction bodies and replaced it with the runtime-neutral idiom *operator gate* (or *batch gate*), whose mechanics live in one place: `_bower/framework.md` → *Runtime bindings*. The claim attached to that pass is that **no gate lost its decision content** — the same thing is being decided, the same choices are offered, and the stop is at least as explicit as it was.

`AskUserQuestion` blocks structurally: a Claude-only body could leave "and then wait" unwritten because the tool made waiting unavoidable. A chat binding cannot. So the audit's real question at each site is not "was the tool name removed" but **"is the stop now written down?"** — which is why the last column is the one worth reading.

Pre-M1 tree: `6a26a9f`. 43 lines mentioned `AskUserQuestion`; 4 of them were prohibitions (roles that must *not* ask) and 39 were gate instructions.

Columns:

- **Decision** — what the operator is being asked to settle.
- **Kind** — `gate` (single decision) · `batch` (a disposition per item) · `prohibition` (a role forbidden to ask).
- **Choices** — `verbatim` if the offered options survived word for word; `n/a` where the site is a rule referring to a gate defined elsewhere, or the answer is free text.
- **Stop** — `binding` (the stop now comes from *Runtime bindings*' definition of an operator gate, which was previously supplied by the tool) · `already` (the site already spelled out stop-and-wait, and still does) · `added` (M1 wrote new stop or explicitness text at this site).

## Agents and read-only commands (prohibitions)

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 1 | `agents/bower-analyst.md:23` | — (must not ask; the gate on the brief is the caller's) | prohibition | n/a | added — "You cannot ask the operator anything — you have no interaction channel", which states the *absence of a channel* rather than the absence of a tool |
| 2 | `agents/bower-implementer.md:30` | — (a decision needing the user is a divergence: stop and report) | prohibition | n/a | added — same rewording; the divergence protocol is unchanged |
| 3 | `agents/bower-reviewer.md:25` | — (must not ask; triage belongs to `/b-review`) | prohibition | n/a | added — same rewording |
| 4 | `commands/b-recap.md:5` | — (read-only orientation asks nothing) | prohibition | n/a | added — "You do **not** gate — you ask the operator nothing" |

## `/b-adopt`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 5 | `b-adopt.md:23` | Rule: every drafted content group is confirmed before it is written | gate | n/a (rule) | binding, + explicit pointer to *Runtime bindings* |
| 6 | `b-adopt.md:66` | Whether to run the message-only git-history pass, given a cost estimate | gate | verbatim (offer with cost + what it buys; signal-poor still skips and says so) | binding |

## `/b-adr`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 7 | `b-adr.md:13` | Rule: confirm the draft before it reaches disk | gate | n/a (rule) | binding, + pointer |
| 8 | `b-adr.md:102` | Accept or adjust the drafted ADR (filename, ID, frontmatter, body) | gate | verbatim — the gate body below the line is untouched | binding |

## `/b-analysis`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 9 | `b-analysis.md:13` | Supply a change description when the request is empty | gate | n/a (free text) | **added** — "ask the user for a change description and stop — end the turn and wait". The one site where the old text relied entirely on the tool to do the waiting |

## `/b-design`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 10 | `b-design.md:14` | Rule: each stage with delta confirms its **drafted content**, not its applicability | gate | n/a (rule) | binding, + pointer |
| 11 | `b-design.md:31` | Which open `route:/b-design` finding this run is discharging, when several match | gate | verbatim — the findings, plus "none of these — proceed with what I typed" | binding |
| 12 | `b-design.md:49` | Stage 0: accept the analyst's change brief | gate | verbatim — "Confirm to proceed, amend it (tell me what to add/remove/change), or stop" | binding |
| 13 | `b-design.md:62` | Per-stage: accept the drafted content before files are written | gate | verbatim | binding |

## `/b-feature`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 14 | `b-feature.md:26` | Rule: the proposal is confirmed before any code is written | gate | n/a (rule) | binding, + pointer, + **"get *explicit* confirmation"** |
| 15 | `b-feature.md:91` | The proposal and its acceptance criteria | gate | verbatim — "Confirm to proceed, or tell me what to adjust" | binding |
| 16 | `b-feature.md:136` | `DIVERGED-STOPPED`: what to do about the implementer's divergence (the re-gate) | gate | verbatim — the divergence report supplies them | binding |
| 17 | `b-feature.md:138` | Same decision on the inline-fallback path, where the caller hit the divergence itself | gate | verbatim | binding — reworded to "stop and re-gate with the user"; the fallback also now stamps `Context: inline` on the report |
| 18 | `b-feature.md:152` | Renegotiate an acceptance criterion whose test is MISSING | gate | verbatim (write the test, or renegotiate) | binding |
| 19 | `b-feature.md:153` | PENDING USER: does each manual acceptance check pass? | **batch** | verbatim — confirmed / failed / deferred, with the same consequences | **added** — "collecting an explicit disposition per check … Do not act on any check's answer until every check has one". Previously "present all manual checks in a single question", which is `AskUserQuestion`'s shape, not a contract |
| 20 | `b-feature.md:179` | Constitution contradiction: edit the file, or leave it | gate | verbatim — correct the claim · move under `## Not yet in force` · leave it alone | already — "Silence, a deferral, or 'noted' all mean leave it" was there and stayed |

## `/b-integration`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 21 | `b-integration.md:10` | Rule: the proposal is confirmed before any code is written | gate | n/a (rule) | binding, + pointer, + "explicit" |
| 22 | `b-integration.md:41` | The proposed integration test — path, assertion count, manual checks | gate | verbatim | binding |
| 23 | `b-integration.md:57` | A test failure that is a real module bug: stop and route to `/b-feature` | gate | verbatim | binding |
| 24 | `b-integration.md:71` | Renegotiate a MISSING assertion | gate | verbatim | binding |
| 25 | `b-integration.md:72` | PENDING USER: does each manual check pass? | **batch** | verbatim — PASS / failure / deferred | **added** — "at a batch gate, one explicit disposition per check" replaces "in one AskUserQuestion" |

## `/b-module`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 26 | `b-module.md:9` | Rule: an in-flight feature that reveals the plan was wrong re-consults rather than continuing | gate | n/a (rule) | binding, + pointer |
| 27 | `b-module.md:58` | The whole-module plan — N features plus the integration test | gate | verbatim | binding |
| 28 | `b-module.md:82` | Renegotiate a MISSING test before continuing the build loop | gate | verbatim | binding |
| 29 | `b-module.md:94` | Module acceptance: every deferred manual check, collected at the end | **batch** | verbatim — "Confirm each, or tell me which failed" | **added** — "at one batch gate, collecting an explicit disposition per check" |

## `/b-review`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 30 | `b-review.md:65` | Triage: open the review, drop findings, or cancel | gate + **batch** | verbatim, and **made explicit** — the three dispositions (*open and action all owned items* / *let me deselect some* / *cancel, just show me the report*) were implicit in the framing sentence and are now enumerated; the deselect walk is labelled a batch gate | **added** — "act on none of them until the full set is confirmed" |
| 31 | `b-review.md:77` | Constitution contradiction (a second, separate gate — it authorises an edit to a file this command does not own) | gate | verbatim — correct · move under `## Not yet in force` · leave alone | already — "Anything else means leave the file untouched" |
| 32 | `b-review.md:174` | Closeout: all findings disposed of, close the review and delete the plan? | gate | verbatim | binding — the routed-tick verification line ahead of it is unchanged |

## `/b-spec`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 33 | `b-spec.md:20` | What the exported spec should include | gate | verbatim — the module/feature list and whether design context exists | binding, + pointer |
| 34 | `b-spec.md:75` | The output path for the written spec | gate | verbatim — `docs/spec.md` default, with the outside-`docs/` caveat | binding |

## `/b-ui`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 35 | `b-ui.md:21` | Rule: the proposal, including ≥2 viable alternatives, is confirmed before code | gate | n/a (rule) | binding, + pointer, + "explicit" |
| 36 | `b-ui.md:55` | Which UI option to build | gate | verbatim — "Pick one to proceed, or tell me what to adjust" | binding |
| 37 | `b-ui.md:81` | Does the implemented UI look right (after stating what changed and what to look at) | gate | verbatim; the three-step framing above it is untouched | binding |
| 38 | `b-ui.md:112` | Mid-implementation: the approach needs to change significantly | gate | verbatim | binding |

## `/b-upgrade`

| # | Site | Decision | Kind | Choices | Stop |
|---|---|---|---|---|---|
| 39 | `b-upgrade.md:24` | Which framework version the project is on, when `_bower/VERSION` is missing | gate | verbatim — the versions gathered from both changelog files | already — "Stop and wait for their answer before proceeding" |
| 40 | `b-upgrade.md:25` | The framework repo URL, when `_bower/SOURCE` is missing | gate | verbatim — including the default suggestion | binding |
| 41 | `b-upgrade.md:58` | Commit cadence across a multi-version upgrade | gate | verbatim — between each step, or all steps then commit | binding |
| 42 | `b-upgrade.md:107` | The migration plan for one version | gate | verbatim — apply · adjust · skip this step · abort upgrade | binding |
| 43 | `b-upgrade.md:163` | Rule: migration notes that cannot be interpreted are asked about, not guessed at | gate | n/a (rule) | binding |

## Gates added by this pass

Two, both in `/b-upgrade` Step 5, and both forced by the spike finding that a protected-path write fails hard with no approval prompt (`docs/codex-support.md` §6):

- **5b — the operator-run scaffold confirmation.** After handing the operator the exact scaffold command, the workflow waits for their explicit word that it ran, and verifies against a file the new version ships. Written as an operator gate precisely because the tempting failure is to assume it happened.
- **5b — the denial path.** If the operator declines, the upgrade aborts honestly: no migration applied, `_bower/VERSION` untouched, clone path reported. Not a gate, but the decision the gate exists to permit.

## Verification greps

Run from the repo root; all four hold at v0.33.

```bash
# No runtime tool names in any instruction body or the reference spec.
grep -rn 'AskUserQuestion\|Agent tool\|subagent_type' .claude/ .agents/ .codex/ skills-src/ _bower/framework-reference.md
# → no matches

# Runtime bindings is the only place in the router where a binding is named.
grep -rn 'AskUserQuestion' _bower/
# → _bower/framework.md: Runtime bindings section only (2 hits — operator gate,
#   batch gate). Everything else is prose *about* the binding, not an
#   instruction to use it: rationale.md ×2 and changes.md ×1.

# Every argument binding line has one shape.
grep -rn '\$ARGUMENTS' .claude/commands/
# → 11 hits, all `The request (<label>): $ARGUMENTS`

# The generated trees match their sources.
node scripts/build-adapters.cjs --check
```

The first grep is also a generator lint (`build-adapters.cjs` fails the build on a deny-listed token in any body), so a regression cannot reach a release: `scripts/release.sh` runs `--check` before it tags anything.
