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

## Getting Started

Bower is a set of files you drop into a project that uses [Claude Code](https://claude.com/claude-code). It doesn't install anything, run a server, or require an account beyond your existing Claude Code setup. If you've never used Claude Code before, install it first and make sure `claude` runs in a terminal — Bower is built on top of it.

### 1. Put Bower into your project

Either start a new project directory, or open an existing one. Then copy the Bower files in:

```bash
# from inside your project directory
git clone https://github.com/anu-hdrh/bower-framework /tmp/bower
cp -r /tmp/bower/CLAUDE.md /tmp/bower/.claude /tmp/bower/_bower .
rm -rf /tmp/bower
```

(Or just clone this repo and use it as your project — that works too.)

You should now have, at the top of your project:

- `CLAUDE.md` — instructions Claude Code reads on every session
- `.claude/commands/` — the `/bower-*` slash commands
- `_bower/` — framework rationale and roadmap (you don't normally edit these)

### 2. Tell Claude about your project's code standards

Open `CLAUDE.md` and scroll to the bottom. There's a section called **Project-Specific Code Standards** — add anything you'd tell a new collaborator about the codebase: language, formatter, test runner, conventions you care about. Two or three bullets is enough to start; you can grow it later.

You don't need to do anything to "load" this file. Claude Code reads it automatically every time you start a session in this directory. Same for the slash commands — they appear as soon as `.claude/commands/` is present.

### 3. Start a Claude Code session and run `/bower-design`

```bash
cd your-project
claude
```

Then, at the Claude prompt, type:

```
/bower-design I want to build <one-sentence description of what you want>
```

`/bower-design` is the entry point. It looks at your project, decides whether you need a full design pass or a lightweight change, and routes you accordingly. You don't pick the workflow yourself — it asks you, recommends one, and waits for your answer.

### What happens next

- **New project (no `docs/architecture.md` yet):** you'll be routed into the full five-stage design, which produces `docs/architecture.md`, scope, and module plans before any code is written. There are review gates at each stage — nothing happens without your sign-off.
- **Existing project, small change:** you'll be routed into the lightweight change flow, which proposes the change and acceptance criteria, waits for your confirmation, then implements.

After the first design pass, day-to-day work usually means running `/bower-feature` (one feature) or `/bower-module` (a whole module's worth). If you come back to the project later and don't remember where you were, run `/bower-recap` — it reads the docs and tells you the current state without changing anything.

> **Heavy vs. light design.** There's no separate `/bower-design-light` command — lightweight design happens *inside* `/bower-feature`, in its propose → acceptance-criteria → confirm gate before any code is written. The `/bower-design` router sends greenfield and architectural work to `/bower-design-full`, and everything else to `/bower-feature`.

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

A project of the [**HASS Digital Research Hub**](https://hdrh.anu.edu.au/) at the **Australian National University**.

## License

MIT
