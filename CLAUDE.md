# Bower Framework v0.5

This project uses the Bower AI-assisted development pattern. Bower optimises for small-team research velocity across the full prototype-to-infrastructure lifecycle.

## Core Principles

- **Planning before building** — Design and document before implementing. Avoid vibe coding.
- **Living documentation** — All docs represent current state, not history. Update in place; git is the change log.
- **Feature modules** — Group related features into modules that persist as system boundaries post-MVP.
- **AI-readable context** — Structure documentation for discoverability by AI agents and humans alike.

**Module definition:** A module is a set of features that share data concerns and can be meaningfully integration-tested together. Data concerns are the underlying property; shared integration tests are the observable consequence. If two feature sets don't share data and don't warrant a shared integration test, they belong in separate modules.

## Navigation

- **Start here:** `docs/index.md` — Auto-generated project state and navigation
- **Current boundary:** `docs/scope.md` — What's in scope now, what's deferred, success criteria met/unmet
- **Process conventions:** `docs/constitution.md` — How to contribute, plan, and update documentation
- **System design:** `docs/architecture.md` — Technology choices, key decisions, data flow
- **Design context:** `docs/design/` — Problem space and design decisions (created during full design)

## Document Layers

Bower splits documentation into two layers by *audience* and *style*, not by directory. Design-layer docs are narrative and human-primary; operational-layer docs are terse, bulleted, and agent-primary. Word budgets apply only to operational volatile docs.

| Document | Layer | Primary audience | Ownership | Style | Budget |
|---|---|---|---|---|---|
| `docs/architecture.md` | design | human | co-authored | narrative | — |
| `docs/design/problem-space.md` | design | human | human-owned | narrative | — |
| `docs/design/design-decisions.md` | design | human | human-owned | narrative | — |
| `docs/constitution.md` | design | human | human-owned | narrative | — |
| `docs/scope.md` | design | human | co-authored | narrative | — |
| `docs/modules/**/plan.md` | operational | agent | co-authored | terse bullets / tables | — |
| `docs/modules/**/status.md` | operational | agent | agent-owned | terse bullets | ~150 words |
| `docs/modules/**/module-status.md` | operational | agent | agent-owned | terse bullets | ~200 words |
| `docs/index.md` | operational | agent | agent-owned | tables | — |

**Ownership semantics:** *human-owned* docs may be drafted by the agent during full design, but must not be rewritten unprompted afterwards. *Co-authored* docs are agent-updated in place as changes land, human-reviewed and edited freely. *Agent-owned* docs are routinely maintained by the agent.

## Documentation Structure

```
docs/
├── index.md                          # Navigation and project state
├── scope.md                          # Current scope, non-goals, success criteria
├── constitution.md                   # Process conventions (reusable)
├── architecture.md                   # System design and key decisions
├── design/                           # Problem space and decisions
│   ├── problem-space.md
│   └── design-decisions.md
└── modules/
    └── <module-name>/
        ├── <feature-name>/
        │   ├── plan.md               # How it works, components, testing, trajectory
        │   └── status.md             # Resumption snapshot
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

## status.md — Resumption Framing

`status.md` answers one question: *if I picked this up tomorrow, what's the state and what's the next move?* Current state in a short paragraph or bullets; next move explicit; open issues only if they affect resumption. No history, no changelog, no solved-issue residue. Bug backlog belongs in the external tracker, not here. Budget ~150 words — over budget is a signal to compress, not to split.

## Implementation Trajectory (multi-session features)

Multi-session features maintain an `## Implementation trajectory` section in `plan.md`. As each phase completes, its description is rewritten in place as a one-paragraph précis of *why* that direction was taken — not the steps, which are in git. Current and future phases stay detailed. Single-session features skip the section entirely.

## What to Update When

| Change Type | plan.md | status.md | module-status.md | scope.md | index.md | architecture.md |
|-------------|---------|-----------|------------------|----------|----------|-----------------|
| Bug fix | Maybe | Yes | — | — | — | — |
| Feature (existing) | Yes | Yes | Maybe | Maybe | — | — |
| New component | Create | Create | Yes | Maybe | Yes | — |
| New module | Create | Create | Create | Maybe | Yes | Maybe |
| Architecture change | Yes | — | Maybe | Maybe | — | Yes |
| Scope shift / criterion closed | — | — | — | Yes | — | — |

## Working Conventions

**Before touching any component:** Read its `plan.md` first — it contains purpose, source file locations, and integration points. Don't search the codebase when the map exists.

**Testing:** End-to-end tests for pipelines and workflows, integration tests at module boundaries, unit tests for complex logic. Generate tests alongside implementation when the plan is clear. Project-specific test location, fixtures, runner commands, and verification-required-for-✓ rules live in `docs/constitution.md` — consult it before declaring a feature complete.

**Documentation style:** Design layer is narrative and explains *why*; operational layer is terse bullets and tables. Write for future-you in 6 months. Update docs as part of implementation, not after.

## Bower Commands

Use `/bower-design` as the entry point for all new work. It assesses scope and routes to the appropriate workflow:

- **Full Design** — Four-stage process for new projects or architectural changes: problem framing → design decisions → architecture → module planning
- **Lightweight Change** — For features, fixes, and enhancements to existing architecture: propose changes → acceptance criteria → confirm → implement

Use `/bower-index` to regenerate `docs/index.md` from current module status.

Use `/bower-spec` to export a single specification document from project documentation, suitable for sharing with stakeholders or other teams.

## Framework Reference

- `_bower/rationale.md` — Why Bower works this way, design principles, comparison to alternatives
- `_bower/roadmap.md` — Deferred framework improvements and their revisit triggers


## Project-Specific Code Standards

<!-- Add your project's code standards below this line -->
