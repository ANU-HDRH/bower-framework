# Bower Roadmap

Deferred framework improvements and the triggers that make each one worth picking up. This file is not loaded into context by default — it's a canonical home for ideas that are named but not scheduled.

Each item has a one-line description and a *revisit trigger*: the signal that turns it from deferred to worth doing.

## Deferred items

- **`/bower-adopt` for brownfield** — A command that reverse-engineers a `docs/` skeleton from an existing codebase with no prior Bower adoption.
  *Revisit trigger:* after first real-project use of Bower v0.3.

- **Retirement lifecycle and `♻️` marker** — A convention for what happens to features that are removed or abandoned (keep `plan.md` as historical record, move under `modules/<m>/retired/`).
  *Revisit trigger:* when a project first retires a feature.

- **`architecture.md` splitting for scale** — Keep `architecture.md` as a short overview; push component-level detail into module-scoped architecture docs.
  *Revisit trigger:* when any project's `architecture.md` passes ~500 lines.

- **CLAUDE.md tiering and single-source-of-truth pass** — Two coupled problems. (1) CLAUDE.md is auto-loaded into every session and has grown large; most sessions pay for content they don't consume. (2) Schema definitions are duplicated — the ADR schema appears in CLAUDE.md, `.claude/commands/b-adr.md`, and `_bower/rationale.md`, even though `docs/adr/index.md` is meant to be the canonical schema reference per CLAUDE.md's own posture. The fix is two coupled moves: split CLAUDE.md into a thin always-loaded layer (status markers, command list, navigation, the "what to update when" table) plus an on-demand `_bower/framework.md` that individual commands load when they need spec detail; and establish explicit single-sources-of-truth so duplications stop drifting silently. The `@`-include CLAUDE.md feature is reorganisation, not reduction — the real win is on-demand loading by commands. Worth doing as a `/b-design` pass on the bower-framework repo itself, since it crosses architecture (where framework docs live), scope (what's framework vs project), and conventions (how commands consume spec).
  *Revisit trigger:* met — observed during Bower 0.10 work on the framework repo; ADR schema visibly duplicated across at least three files, and `docs/adr/index.md`'s intended role as canonical schema reference was not in fact load-bearing.

- **Constitution template and archive rules** — A schema for `constitution.md` and explicit rules for what belongs in `_bower/archive/`.
  *Revisit trigger:* before second real project.

- **Version migration conventions** — The version marker itself is resolved (CLAUDE.md header carries it, auto-loaded). What's missing is a convention for how an adopting project migrates between Bower releases (e.g., v0.4 → v0.5): what changes, who runs it, how CLAUDE.md customisations are preserved.
  *Revisit trigger:* when a real adopting project first needs to cross a Bower version boundary.

- **Durable-ephemeral proposals on disk** — `docs/proposals/<slug>.md` written at the gate, deleted on completion, to survive session boundaries.
  *Revisit trigger:* if session-boundary pain shows up after first real use.
