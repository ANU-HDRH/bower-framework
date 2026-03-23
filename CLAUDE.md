# Bower Framework v0.2

This project uses the Bower AI-assisted development pattern. Bower optimises for small-team research velocity across the full prototype-to-infrastructure lifecycle.

## Core Principles

- **Planning before building** — Design and document before implementing. Avoid vibe coding.
- **Living documentation** — All docs represent current state, not history. Update in place; git is the change log.
- **Feature modules** — Group related features into modules that persist as system boundaries post-MVP.
- **AI-readable context** — Structure documentation for discoverability by AI agents and humans alike.

## Navigation

- **Start here:** `docs/index.md` — Auto-generated project state and navigation
- **Process conventions:** `docs/constitution.md` — How to contribute, plan, and update documentation
- **System design:** `docs/architecture.md` — Technology choices, key decisions, data flow
- **Design context:** `docs/design/` — Problem space and design decisions (created during full design)

## Documentation Structure

```
docs/
├── index.md                          # Navigation and project state
├── constitution.md                   # Process conventions (reusable)
├── architecture.md                   # System design and key decisions
├── design/                           # Problem space and decisions
│   ├── problem-space.md
│   └── design-decisions.md
└── modules/
    └── <module-name>/
        ├── <feature-name>/
        │   ├── plan.md               # How it works, components, testing
        │   └── status.md             # Current state, issues, todo
        └── module-status.md          # Integration testing notes
```

## Status Markers

Used in `index.md` and `status.md` files:

| Marker | Meaning |
|--------|---------|
| ✓ | Complete and stable |
| 🚧 | In active development |
| ⏸ | Planned but not started |
| 🟡 | Complete with known issues |
| 🔴 | Broken or degraded |
| 🔧 | Under revision/refactor |

## What to Update When

| Change Type | plan.md | status.md | module-status.md | index.md | architecture.md |
|-------------|---------|-----------|------------------|----------|-----------------|
| Bug fix | Maybe | Yes | — | — | — |
| Feature (existing) | Yes | Yes | Maybe | — | — |
| New component | Create | Create | Yes | Yes | — |
| New module | Create | Create | Create | Yes | Maybe |
| Architecture change | Yes | — | Maybe | — | Yes |

## Working Conventions

**Before touching any component:** Read its `plan.md` first — it contains purpose, source file locations, and integration points. Don't search the codebase when the map exists.

**Testing:** End-to-end tests for pipelines and workflows, integration tests at module boundaries, unit tests for complex logic. Generate tests alongside implementation when the plan is clear.

**Documentation style:** Write for future-you in 6 months. Explain *why* decisions were made, not just *what*. Keep it concise. Update docs as part of implementation, not after.

## Bower Commands

Use `/bower-design` as the entry point for all new work. It assesses scope and routes to the appropriate workflow:

- **Full Design** — Four-stage process for new projects or architectural changes: problem framing → design decisions → architecture → module planning
- **Lightweight Change** — For features, fixes, and enhancements to existing architecture: propose changes → acceptance criteria → confirm → implement

Use `/bower-index` to regenerate `docs/index.md` from current module status.

Use `/bower-spec` to export a single specification document from project documentation, suitable for sharing with stakeholders or other teams.

## Framework Reference

- `_bower/rationale.md` — Why Bower works this way, design principles, comparison to alternatives


## Project-Specific Code Standards

<!-- Add your project's code standards below this line -->
