# Bower Framework v0.7

A lightweight AI-assisted development pattern for research software engineering.

> **⚠️ Draft — feedback actively sought.** Bower is in active development, but it's already been used to build real tools. If you try it, please share what worked and what didn't: open an issue on this repo, or email **matthew.bettinson@anu.edu.au**.

## What is Bower?

Bower provides structure for planning, documenting, and implementing software projects where AI coding assistants are first-class participants. It emphasises:

- **Planning before building** — Design and document before implementing
- **Living documentation** — Documents represent current state, not history
- **Feature modules** — Logical grouping that persists as system boundaries
- **AI-readable context** — Structure optimised for AI agent discoverability

The pattern borrows planning discipline from [SpecKit](https://github.com/github/spec-kit) and living documentation from [OpenSpec](https://github.com/Fission-AI/OpenSpec), optimised for small research teams and the full prototype-to-infrastructure lifecycle.

## Quick Start

1. Clone this repo into your project (or copy the files you need)
2. Edit `CLAUDE.md` — add your project-specific code standards at the bottom
3. Use `/bower-design` in Claude Code to start designing

The `CLAUDE.md` file loads automatically and gives the AI agent full context on project structure and conventions. The slash commands handle workflow.

## Repository Structure

```
bower-framework/
├── CLAUDE.md                       # Always-loaded reference (copy to your project)
├── .claude/
│   └── commands/
│       ├── bower-design.md         # Entry point — assesses scope, routes workflow
│       ├── bower-design-full.md    # Full design: 5 stages with hard gates (includes scaffolding)
│       ├── bower-feature.md        # Lightweight change: propose → confirm → build (one feature)
│       ├── bower-module.md         # Build a whole module: one gate, one integration pass
│       ├── bower-recap.md          # Read-only "where am I, what's next?" orientation
│       ├── bower-index.md          # Regenerate docs/index.md
│       └── bower-spec.md           # Export a single specification document
├── _bower/
│   ├── rationale.md                # Why Bower works this way
│   └── roadmap.md                  # Deferred framework improvements
└── README.md
```

## Commands

| Command | Purpose |
|---------|---------|
| `/bower-design` | Start here. Assesses scope and routes to full design or lightweight change. Greenfield projects are routed to Full Design unconditionally. |
| `/bower-design-full` | Five-stage design process: problem → decisions → architecture → modules → scaffolding. Hard gates at each stage; ends with an explicit handoff to implementation. |
| `/bower-feature` | Lightweight flow for a single feature or fix within existing architecture. One gate before code. Warns if working out of the module's build order. |
| `/bower-module` | Build all features in a module in one pass. One gate up front, one integration pass at the end. Use when the module is small and well-specified. |
| `/bower-recap` | Read-only, advisory "where am I, what's next?" synthesis across project docs. Never writes. |
| `/bower-index` | Regenerate `docs/index.md` from current module status markers. |
| `/bower-spec` | Export a single specification document for sharing with others. |

## How It Works

`/bower-design` reads your project's current state and routes you:

- **Full Design** — For new projects or architectural changes. Five stages with engineer review at each gate: problem → decisions → architecture → modules → scaffolding. Greenfield (no existing `docs/architecture.md`) is routed here unconditionally. Ends with an explicit handoff naming the first module to build and the recommended command (`/bower-module` or `/bower-feature`).
- **Lightweight Change** — For features, fixes, and enhancements within an existing architecture. Proposes changes and acceptance criteria, confirms with you, then implements.

The agent recommends; you decide. Every gate uses explicit confirmation — no changes without your sign-off. `/bower-recap` re-orients you in a fresh session without touching anything.

## Project Documentation Structure

Bower creates and maintains the `docs/` tree below, with `docs/reference/` as an optional home for vendored external material that agents consult but don't rewrite:

```
docs/
├── index.md                    # Auto-generated navigation and status
├── scope.md                    # Current scope, non-goals, success criteria
├── constitution.md             # Process conventions
├── architecture.md             # System design and key decisions
├── design/                     # Problem space and design decisions
├── reference/                  # Vendored external docs for lookup (optional, read-only)
└── modules/
    └── <module>/
        ├── <feature>/
        │   ├── plan.md         # How it works, components, testing
        │   └── status.md       # Resumption snapshot (~150 words)
        └── module-status.md    # Integration testing
```

Deferred framework improvements live in [`_bower/roadmap.md`](_bower/roadmap.md) — named items with revisit triggers, so they don't clutter active docs or get lost.

## Testing

Bower is deliberately unopinionated about testing specifics. The framework assumes tests exist and expects them to be consulted before a feature is marked complete, but it does not prescribe a test runner, directory layout, fixture style, or coverage bar. Those belong to your project, not to Bower.

**Where it lives.** Record your project's testing conventions in `docs/constitution.md`: where tests live, how to run them, what "verified" means for a feature to be marked ✓, and any fixture or data conventions. Bower agents read `constitution.md` as part of their normal workflow and will follow what you've written there.

**What Bower contributes.** The built-in guidance is minimal and applies across project types: end-to-end tests for pipelines and workflows, integration tests at module boundaries, unit tests for complex logic. Plan.md's testing section and each lightweight-change proposal's acceptance criteria reference *your* conventions; Bower provides the hooks, you provide the specifics.

A fuller how-to for setting up `constitution.md` may come later. For now, the shape is: write down what you'd tell a new collaborator about testing this project, and the agents will pick it up.

## About

A project by the **HASS Digital Research Hub** at the **Australian National University**.

## License

MIT
