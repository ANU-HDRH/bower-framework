# Bower Roadmap

Deferred framework improvements and the triggers that make each one worth picking up. This file is not loaded into context by default — it's a canonical home for ideas that are named but not scheduled.

Each item has a one-line description and a *revisit trigger*: the signal that turns it from deferred to worth doing.

## Ready to schedule

Triggers fired; these are candidates for near-term work rather than deferred ideas.

- **`/bower-adopt` for brownfield** — A command that reverse-engineers a `docs/` skeleton from an existing codebase with no prior Bower adoption. Distinct from `/b-upgrade`, which refreshes an *already-adopted* project across framework versions; this is the cold-start path for a codebase Bower has never touched.
  *Trigger fired:* brownfield-adoption pain has surfaced in practice — wanting Bower's design surface on a substantial existing codebase without a from-scratch scaffold. Ready to plan.

## Deferred items

- **Interface-observation tooling wired into `/b-ui`** — Integrate an observation tool (e.g. `chrome-devtools-mcp` for web, equivalent harnesses for TUI/desktop) into `/b-ui` Step 4 as **graceful enhancement**: when an observation tool is available in the session, take a screenshot (or capture equivalent state — DOM dump for web, terminal capture for TUI, window state for desktop) *before* the PENDING USER manual-check question, so the user sees "here's what it looks like, confirm or tell me what's off" instead of being asked to go check themselves. Sessions without the tool fall back to today's behaviour — no hard dependency, no required setup. Same posture as the rest of Bower: opinionated about shape, light about prerequisites. Includes documenting the WSL2 headless setup for web tooling, since that's where most adopters will hit setup friction first. Scope discipline: this is the screenshot-before-confirm hook only; ongoing test-harness enforcement of `ui.md` invariants is the next item.
  *Revisit trigger:* two or more real `/b-ui` (or path-2 ad-hoc) cycles in a project where the manual-check round-trip produces back-and-forth that a screenshot would have prevented. The pain should be felt before the dependency is added — the integration is cheap enough that it doesn't earn pre-emptive work.

- **Living invariants for `ui.md` via test harness** — Treat invariants written in `docs/ui.md` ("destructive actions are undoable for 5s", "modals trap focus", "navigation persists in URL", "ESC closes overlays") as testable contracts and wire a test runner to assert them: Playwright for web, Textual's pytest support for TUIs, native test harnesses for desktop. Today invariants are written but not enforced — they sit in the doc as commitments that can drift silently from code. Project-specific by nature: different surfaces need different harnesses, and not every project will want the overhead. Likely lives in `constitution.md` conventions plus an optional pattern in `module-status.md` for which features carry interaction-pattern tests, rather than as a framework default. Distinct from the screenshot-before-confirm item above: that's verification *at acceptance time*; this is *ongoing enforcement* between commits.
  *Revisit trigger:* a project actually writes invariants in `ui.md` that drift from code, and the drift is caught only at manual review (or worse, by a user). Until that pain surfaces, the test-harness investment isn't worth its overhead.

- **Retirement lifecycle and `♻️` marker** — A convention for what happens to features that are removed or abandoned (keep `plan.md` as historical record, move under `modules/<m>/retired/`).
  *Revisit trigger:* when a project first retires a feature.

- **`architecture.md` splitting for scale** — Keep `architecture.md` as a short overview; push component-level detail into module-scoped architecture docs. Shares territory with the *Slim `docs/index.md` and `module-status.md`* item below — both push a growing top-level doc's detail down into module scope; if either is picked up, weigh doing them together.
  *Revisit trigger:* when any project's `architecture.md` passes ~500 lines.

- **Single source of truth for duplicated schemas** — Schema text still appears in more than one place (e.g. the ADR schema in `/b-adr`, `framework-reference.md`, and `docs/adr/index.md`). Acceptable duplication for now, since each copy serves a distinct load path, but it can drift silently. The fix is to nominate one canonical copy per schema and generate or `@`-include the rest. (The broader CLAUDE.md tiering this was bundled with was realised in v0.20 — see `changes.md` — and is no longer roadmap work.)
  *Revisit trigger:* a schema change that has to be applied in three places and one is missed.

- **Constitution template and archive rules** — A schema for `constitution.md` and explicit rules for what belongs in `_bower/archive/`.
  *Revisit trigger:* a project's `constitution.md` drifts into an ad-hoc shape that a template would have prevented, or `_bower/archive/` contents become ambiguous about what belongs there — the pain of no schema felt in a real project, rather than a project-count milestone.

- **Durable-ephemeral proposals on disk** — `docs/proposals/<slug>.md` written at the gate, deleted on completion, to survive session boundaries.
  *Revisit trigger:* if session-boundary pain shows up after first real use.
  *Partially realised (v0.18):* `/b-review` instantiates this pattern for the review use-case — `docs/modules/<module>/review-plan.md` is written at the triage gate and deleted on completion, surviving a mid-apply crash. The *general* convention (a `docs/proposals/` home for any gated, multi-step change) is still deferred; review proved the shape works before generalising it.

- **ADR index Decision summary per row** — Add a one-line Decision summary to each row of `docs/adr/index.md`, so bundled ADRs (several commitments under one umbrella title) surface their commitments via the index without opening each file. A `/b-index` change. First discussed and deferred during v0.17 (the lightweight-ADR work) on the grounds that no failure had yet surfaced.
  *Revisit trigger:* when a reader has to open multiple ADRs to recover commitments a title-only index hid. `/b-review` is now a structured source of this signal — its `bower-reviewer` records "an ADR's commitments weren't visible from the index row" as a non-actionable observation. Two or more such observations across real reviews is the trigger to add the column.

- **Extend the implementation-agent boundary to `/b-module`** — v0.20 delegates `/b-feature`'s post-gate implementation to the `bower-implementer` subagent; `/b-module` still implements inline and suffers the same (worse — N features per session) context accumulation. The extension is a per-feature spawn inside the build loop, reusing the same subagent and report contract. If `/b-module` adopts the same report shape, revisit whether the report contract should graduate from the agent prompt to a `_bower/` schema file (deliberately skipped in v0.20: one producer, one consumer, never parsed from disk).
  *Revisit trigger:* the delegation pattern validated on a real project's `/b-feature` cycles — a few features implemented through `bower-implementer` with reports that reconciled cleanly and no divergence-handling surprises.

- **Slim `docs/index.md` and `module-status.md` back into routers; separate `integration-plan.md`** — Observed in a mature project: `docs/index.md` grows a rolling project narrative repeating plans, UI docs, ADRs, and module status; a module-integration note grows into a detailed future end-to-end specification. Cost is modest but grows linearly with project maturity and taxes every feature invocation. The shape: `docs/index.md` stays at module marker / current feature / next feature / blockers; `module-status.md` at build order, boundary invariant, integration-state pointer; detailed cross-feature integration obligations move to a `docs/modules/<module>/integration-plan.md` loaded mainly by `/b-integration`; feature detail stays in feature plans. Shares territory with the *`architecture.md` splitting for scale* item above — both push detail out of a growing top-level doc into module scope; weigh doing them together.
  *Revisit trigger:* a project's index or module-status narrative measurably taxing feature invocations again after v0.20's selective orientation lands — the selective reads may already blunt the cost enough.

- **Token optimisation pass** - A pass through all framework instructions to tighten up the language reduce the token count as a speed and cost optimisation. Overall framework token use is still on the light side compared to many frameworks, and there is no active harm on the overly verbose instructions. Implementing this requires a definition of "token optimisation" which is a mini research project in itself.
  *Revisit trigger:* Possibly for a 1.0 release, when the framework shape is stable.
