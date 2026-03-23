# Bower Spec Export

You are generating a single specification document from the project's Bower documentation. This document is for sharing with people outside the project — stakeholders, collaborators, reviewers, or other teams.

Optional scope or instructions from the user: $ARGUMENTS

## Step 1: Read Everything

1. Read `docs/architecture.md`
2. Read `docs/design/problem-space.md` and `docs/design/design-decisions.md` (if they exist)
3. Read `docs/index.md` to identify all modules and features
4. Read every `plan.md` across `docs/modules/`
5. Read every `module-status.md` for integration context

Note which files exist and which don't — the spec should only cover what's documented.

## Step 2: Determine Scope

Use AskUserQuestion to confirm what should be included. Present:

- The full list of modules and features you found
- Whether design context (problem space, design decisions) exists
- Your recommendation: full project spec, or a subset

Ask: "What should the spec cover? Everything, or specific modules/areas? And who's the audience — this affects the level of technical detail."

Wait for confirmation.

## Step 3: Synthesize

Write a single markdown document with this structure (adapt sections to what actually exists):

```
# [Project Name] — Specification

## Overview
[2-3 paragraphs: what this system does, why it exists, who it's for.
Drawn from architecture.md overview and problem-space.md.]

## Problem Context
[From problem-space.md: the problem, current alternatives, success criteria, scope.
Skip if no design/ docs exist.]

## Design Decisions
[From design-decisions.md: key choices and rationale.
Present as narrative, not a raw decision log. Focus on decisions the reader needs
to understand to make sense of the architecture.
Skip if no design/ docs exist.]

## Architecture
[From architecture.md: components, data flow, technology stack, constraints.
Include extension points if relevant to the audience.]

## Modules

### [Module Name]
[From module-status.md: what this group of features does together.
From each feature's plan.md: purpose, how it works, key components,
integration points. Omit source locations, test paths, and internal
status tracking — the reader doesn't need those.]

[Repeat for each module in scope]

## Known Limitations
[Aggregate from plan.md known limitations sections.
Only include if substantive.]
```

## Step 4: Present

Write the spec to a file. Use AskUserQuestion to confirm the output path. Suggest `docs/spec.md` by default, but note that if this is a one-off export, the user might prefer a location outside `docs/` so it doesn't get treated as a living document.

## Rules

- **Strip internal details.** Source file paths, test file paths, status markers, work-in-progress items, and deferred work are internal. Don't include them.
- **Narrative over template.** The output should read as a coherent document, not a concatenation of templates. Use transitions, combine related points, and cut redundancy.
- **Respect the audience.** If the user says it's for a non-technical stakeholder, reduce implementation detail. If it's for a technical reviewer, keep it.
- **Don't invent.** Only include what's in the documentation. If something is missing or thin, note the gap rather than filling it with assumptions.
- **Don't update project docs.** This command reads and exports. It doesn't modify any existing Bower documentation.
