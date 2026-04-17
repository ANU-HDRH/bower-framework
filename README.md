# Bower Framework v0.5

A lightweight AI-assisted development pattern for research software engineering.

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
│       ├── bower-design-full.md    # Full design: 4 stages with hard gates
│       ├── bower-feature.md        # Lightweight change: propose → confirm → build
│       └── bower-index.md          # Regenerate docs/index.md
├── _bower/
│   ├── rationale.md                # Why Bower works this way
│   └── archive/                    # Previous framework docs (historical)
└── README.md
```

## Commands

| Command | Purpose |
|---------|---------|
| `/bower-design` | Start here. Assesses scope and routes to full design or lightweight change. |
| `/bower-design-full` | Four-stage design process: problem → decisions → architecture → modules. Hard gates at each stage. |
| `/bower-feature` | Lightweight flow for features/fixes within existing architecture. One gate before code. |
| `/bower-index` | Regenerate `docs/index.md` from current module status markers. |
| `/bower-spec` | Export a single specification document for sharing with others. |

## How It Works

`/bower-design` reads your project's current state and recommends a workflow:

- **Full Design** — For new projects or architectural changes. Four stages with engineer review at each gate.
- **Lightweight Change** — For features, fixes, and enhancements. Proposes changes and acceptance criteria, confirms with you, then implements.

The agent recommends; you decide. Every gate uses explicit confirmation — no changes without your sign-off.

## Project Documentation Structure

When Bower runs, it creates and maintains:

```
docs/
├── index.md                    # Auto-generated navigation and status
├── scope.md                    # Current scope, non-goals, success criteria
├── constitution.md             # Process conventions
├── architecture.md             # System design and key decisions
├── design/                     # Problem space and design decisions
└── modules/
    └── <module>/
        ├── <feature>/
        │   ├── plan.md         # How it works, components, testing
        │   └── status.md       # Resumption snapshot (~150 words)
        └── module-status.md    # Integration testing
```

Deferred framework improvements live in [`_bower/roadmap.md`](_bower/roadmap.md) — named items with revisit triggers, so they don't clutter active docs or get lost.

## About

A project by the **HASS Digital Research Hub** at the **Australian National University**.

## License

MIT
