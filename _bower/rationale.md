# Bower Framework — Rationale

## What Bower Is

Bower is a development pattern for AI-assisted software engineering. It provides structure for planning, documenting, and implementing software projects where AI coding assistants are first-class participants in the workflow.

The pattern optimises for:
- Small teams (solo to ~5 people) building research software
- Projects that span from prototype to maintained infrastructure
- Rapid iteration without sacrificing maintainability
- AI agents that need to discover context efficiently

## Core Principles

### Planning Before Building

AI coding tools make it cheap to write code and expensive to write the *wrong* code. Bower invests the productivity dividend into planning — understanding the problem, making deliberate design choices, and documenting intent *before* implementation begins.

This isn't process theatre. It's acknowledging that the hardest part of software is deciding what to build, not building it.

### Living Documentation

All documents in `docs/` represent the *current state* of the system, not historical records. When authentication changes, you update `modules/auth/plan.md` — you don't create `phase-08-auth-fix.md`.

Git history is the change log. Documents are the map.

This matters especially for AI agents: temporal documentation (phase-01, phase-02) creates contradictory context that degrades AI performance. A single, current source of truth is both human-friendly and machine-friendly.

### Feature Modules

Features are grouped into modules — logical system boundaries that persist across the project lifecycle. During initial build, modules suggest a development sequence. Post-MVP, they define integration boundaries and testing scope.

This contrasts with phase-based organisation where groupings are temporal (what we built in week 1) rather than structural (what handles authentication). Temporal groupings become meaningless the moment the build phase ends.

### AI-Readable Context

The documentation structure is designed for discoverability:
- `CLAUDE.md` loads automatically and provides navigation pointers
- `docs/index.md` gives the full project map with status at a glance
- `plan.md` files contain source locations, eliminating search
- Status markers are machine-parseable

## Relationship to Existing Patterns

### What We Borrow from SpecKit

[SpecKit](https://github.com/github/spec-kit) is GitHub's spec-driven development toolkit. Bower borrows its planning discipline — the idea that specification precedes implementation — and its constitution concept for project-wide conventions.

Where we diverge: SpecKit uses sequential phases (phase-01-auth, phase-02-pdf) that create temporal documentation artifacts. These rot quickly in maintenance. Bower uses modules that persist as living system boundaries.

### What We Borrow from OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) pioneered living specs and explicit change tracking for brownfield codebases. Bower adopts its single-source-of-truth philosophy and status tracking.

Where we diverge: OpenSpec's proposal → review → implement → archive workflow adds ceremony that small research teams don't need. For solo or small-team work, git commits provide sufficient change tracking without parallel structures.

### Why This Direction

Research software engineering has specific characteristics that neither SpecKit nor OpenSpec fully addresses:

1. **Team size is small.** Review overhead of formal change proposals isn't justified. You need planning discipline without process overhead.
2. **Velocity matters, but so does maintainability.** Projects have research output pressure but also need to survive handoff or revisiting months later.
3. **Projects evolve unpredictably.** What starts as "quick test" often becomes critical infrastructure. The pattern works at both ends without switching methodologies.
4. **AI assistance is the norm, not the exception.** Documentation structure should serve AI discoverability as a primary concern, not an afterthought.

## This Implementation

Bower v2 implements these principles through Claude Code's native capabilities:

### Always-Loaded Context (CLAUDE.md)

The reference layer — principles, file layout, status markers, and update rules — lives in `CLAUDE.md` which Claude Code loads automatically into every conversation. This means the agent always knows how the project is structured and what conventions to follow, without being told.

### Slash Commands for Workflow

Process knowledge lives in commands, not documents the agent has to interpret:

- **`/bower-design`** — Entry point that assesses scope and routes to the appropriate workflow
- **`/bower-design-full`** — Heavyweight four-stage design process with hard gates between stages
- **`/bower-feature`** — Lightweight change flow with one gate before implementation
- **`/bower-index`** — Deterministic index regeneration

### Consultation Gates (AskUserQuestion)

Every workflow gate uses the AskUserQuestion tool to present findings and wait for explicit confirmation. The agent recommends; the engineer decides. This is a deliberate design choice — we're building with engineers who expect to be consulted on design decisions, not presented with fait accompli.

### Heavy and Light Paths

Not all changes need the same process. The entry point (`/bower-design`) reads the project's current state and recommends either:

- **Full Design** — For new projects or architectural changes. Four stages with hard gates: problem framing → design decisions → architecture synthesis → module planning.
- **Lightweight Change** — For features, fixes, and enhancements within existing architecture. Propose changes and acceptance criteria, confirm, implement.

The agent recommends a path; the engineer chooses. The boundary between "architectural" and "lightweight" is a human judgement call, not an algorithm.

### Acceptance as Contract

In the lightweight flow, acceptance criteria are proposed *before* implementation and confirmed as part of the gate. They're the contract between engineer and agent — "here's what I'll build and here's how we'll know it works." This applies whether verification is automated tests, manual checks, or both.

## Credit

Developed by the **HASS Digital Research Hub** at the **Australian National University** for research software engineering community use. MIT licensed.
