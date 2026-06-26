# Bower Roadmap

Deferred framework improvements and the triggers that make each one worth picking up. This file is not loaded into context by default — it's a canonical home for ideas that are named but not scheduled.

Each item has a one-line description and a *revisit trigger*: the signal that turns it from deferred to worth doing.

## Deferred items

- **Interface-observation tooling wired into `/bower:ui`** — Integrate an observation tool (e.g. `chrome-devtools-mcp` for web, equivalent harnesses for TUI/desktop) into `/bower:ui` Step 4 as **graceful enhancement**: when an observation tool is available in the session, take a screenshot (or capture equivalent state — DOM dump for web, terminal capture for TUI, window state for desktop) *before* the PENDING USER manual-check question, so the user sees "here's what it looks like, confirm or tell me what's off" instead of being asked to go check themselves. Sessions without the tool fall back to today's behaviour — no hard dependency, no required setup. Same posture as the rest of Bower: opinionated about shape, light about prerequisites. Includes documenting the WSL2 headless setup for web tooling, since that's where most adopters will hit setup friction first. Scope discipline: this is the screenshot-before-confirm hook only; ongoing test-harness enforcement of `ui.md` invariants is the next item.
  *Revisit trigger:* two or more real `/bower:ui` (or path-2 ad-hoc) cycles in a project where the manual-check round-trip produces back-and-forth that a screenshot would have prevented. The pain should be felt before the dependency is added — the integration is cheap enough that it doesn't earn pre-emptive work.

- **Living invariants for `ui.md` via test harness** — Treat invariants written in `docs/ui.md` ("destructive actions are undoable for 5s", "modals trap focus", "navigation persists in URL", "ESC closes overlays") as testable contracts and wire a test runner to assert them: Playwright for web, Textual's pytest support for TUIs, native test harnesses for desktop. Today invariants are written but not enforced — they sit in the doc as commitments that can drift silently from code. Project-specific by nature: different surfaces need different harnesses, and not every project will want the overhead. Likely lives in `constitution.md` conventions plus an optional pattern in `module-status.md` for which features carry interaction-pattern tests, rather than as a framework default. Distinct from the screenshot-before-confirm item above: that's verification *at acceptance time*; this is *ongoing enforcement* between commits.
  *Revisit trigger:* a project actually writes invariants in `ui.md` that drift from code, and the drift is caught only at manual review (or worse, by a user). Until that pain surfaces, the test-harness investment isn't worth its overhead.

- **Package Bower as a Claude Code plugin** — Replace the `scripts/scaffold.sh` distribution model with a Claude Code plugin / marketplace. Projects would install Bower with one command and receive updates through plugin update mechanisms rather than `/bower:upgrade`'s clone-and-walk-migrations. The migration-notes discipline stays — it's still needed for project-side doc-shape changes between versions — but the framework-file copying half of `/bower:upgrade` becomes free, and the scaffold script can retire. Significant structural rework: Bower's distribution model becomes plugin-native rather than script-native.
  *Revisit trigger:* once Bower has reached a solid beta — the framework's shape is stable enough that plugin packaging won't churn against active framework evolution. Deferred deliberately so the framework matures before locking it into a distribution channel.

- **`/bower-adopt` for brownfield** — A command that reverse-engineers a `docs/` skeleton from an existing codebase with no prior Bower adoption.
  *Revisit trigger:* after first real-project use of Bower v0.3.

- **Retirement lifecycle and `♻️` marker** — A convention for what happens to features that are removed or abandoned (keep `plan.md` as historical record, move under `modules/<m>/retired/`).
  *Revisit trigger:* when a project first retires a feature.

- **`architecture.md` splitting for scale** — Keep `architecture.md` as a short overview; push component-level detail into module-scoped architecture docs.
  *Revisit trigger:* when any project's `architecture.md` passes ~500 lines.

- **CLAUDE.md tiering and single-source-of-truth pass** — Two coupled problems. (1) CLAUDE.md is auto-loaded into every session and has grown large; most sessions pay for content they don't consume. (2) Schema definitions are duplicated — the ADR schema appears in CLAUDE.md, `.claude/commands/bower:adr.md`, and `_bower/rationale.md`, even though `docs/adr/index.md` is meant to be the canonical schema reference per CLAUDE.md's own posture. The fix is two coupled moves: split CLAUDE.md into a thin always-loaded layer (status markers, command list, navigation, the "what to update when" table) plus an on-demand `_bower/framework.md` that individual commands load when they need spec detail; and establish explicit single-sources-of-truth so duplications stop drifting silently. The `@`-include CLAUDE.md feature is reorganisation, not reduction — the real win is on-demand loading by commands. Worth doing as a `/bower:design` pass on the bower-framework repo itself, since it crosses architecture (where framework docs live), scope (what's framework vs project), and conventions (how commands consume spec).
  *Revisit trigger:* met — observed during Bower 0.10 work on the framework repo; ADR schema visibly duplicated across at least three files, and `docs/adr/index.md`'s intended role as canonical schema reference was not in fact load-bearing.

- **Constitution template and archive rules** — A schema for `constitution.md` and explicit rules for what belongs in `_bower/archive/`.
  *Revisit trigger:* before second real project.

- **Version migration conventions** — The version marker itself is resolved (CLAUDE.md header carries it, auto-loaded). What's missing is a convention for how an adopting project migrates between Bower releases (e.g., v0.4 → v0.5): what changes, who runs it, how CLAUDE.md customisations are preserved.
  *Revisit trigger:* when a real adopting project first needs to cross a Bower version boundary.

- **Durable-ephemeral proposals on disk** — `docs/proposals/<slug>.md` written at the gate, deleted on completion, to survive session boundaries.
  *Revisit trigger:* if session-boundary pain shows up after first real use.
  *Partially realised (v0.18):* `/bower:review` instantiates this pattern for the review use-case — `docs/modules/<module>/review-plan.md` is written at the triage gate and deleted on completion, surviving a mid-apply crash. The *general* convention (a `docs/proposals/` home for any gated, multi-step change) is still deferred; review proved the shape works before generalising it.

- **ADR index Decision summary per row** — Add a one-line Decision summary to each row of `docs/adr/index.md`, so bundled ADRs (several commitments under one umbrella title) surface their commitments via the index without opening each file. A `/bower:index` change. First discussed and deferred during v0.17 (the lightweight-ADR work) on the grounds that no failure had yet surfaced.
  *Revisit trigger:* when a reader has to open multiple ADRs to recover commitments a title-only index hid. `/bower:review` is now a structured source of this signal — its `bower-reviewer` records "an ADR's commitments weren't visible from the index row" as a non-actionable observation. Two or more such observations across real reviews is the trigger to add the column.

- **Token optimisation pass** - A pass through all framework instructions to tighten up the language reduce the token count as a speed and cost optimisation. Overall framework token use is still on the light side compared to many frameworks, and there is no active harm on the overly verbose instructions. Implementing this requires a definition of "token optimisation" which is a mini research project in itself.
  *Revisit trigger:* Possibly for a 1.0 release, when the framework shape is stable.
