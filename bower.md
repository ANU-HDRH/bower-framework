# RSE AI-Assisted Development Pattern Specification

## Overview

This pattern provides a lightweight, maintainable structure for research software engineering projects using AI-assisted development. It emphasises living documentation, clear feature modules, and appropriate planning overhead that scales with project needs.

**Key Principles:**
- Planning before building (avoid vibe coding)
- Living documents that update in place (not temporal phases)
- Feature modules for logical grouping and testing
- Single source of truth via directory structure
- AI-readable context via clear organisation

**Target Use Cases:**
- Solo or small team research software projects
- Rapid iteration with maintainability requirements
- Projects spanning prototype → maintained infrastructure
- AI IDE workflows (Claude Code, Cursor, etc.)

---

## Relationship to Existing Patterns

### How This Differs from SpecKit

[SpecKit](https://github.com/github/spec-kit) is GitHub's excellent spec-driven development toolkit, optimised for greenfield (0→1) projects. It follows a linear workflow: Constitution → Specify → Plan → Tasks → Implement, with phases as sequential milestones.

**SpecKit's Strengths:**
- Excellent for initial feature builds with clear dependency ordering
- Strong task generation from plans
- Good enforcement of test-driven development
- Works with multiple AI coding tools

**Where This Pattern Diverges:**
- **Post-MVP maintenance:** SpecKit's phase-based approach creates temporal documentation artifacts (phase-01-auth.md, phase-02-pdf.md). When you need to fix a bug in authentication months later, do you update phase-01 (making it historical fiction) or create phase-08-bug-fixes (a grab bag)? This leads to documentation rot.
- **Living documentation:** This pattern treats all feature docs as living documents that update in place, not sequential phases. The current state of authentication is always in `modules/auth/plan.md`, regardless of when it was built or modified.
- **Feature modules:** We use modules (not phases) to group related features for integration testing. Modules persist post-MVP as logical system boundaries, whereas phases are temporal build sequences.
- **Tool independence:** This pattern is methodology-first, tool-agnostic. You can use SpecKit's CLI for scaffolding if useful, but aren't locked into its workflow.

**What We Borrow from SpecKit:**
- Constitution concept for project-wide conventions
- Planning-before-implementation discipline
- Task breakdown strategies
- Test-driven development emphasis

### How This Differs from OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) is explicitly brownfield-first (1→n), designed for proposing changes to existing codebases. It maintains separation between current truth (`openspec/specs/`) and proposed changes (`openspec/changes/`).

**OpenSpec's Strengths:**
- Excellent change proposal workflow for established systems
- Explicit tracking of what specs are being modified
- Archive pattern preserves history of decisions
- Strong support for changes that span multiple specs

**Where This Pattern Diverges:**
- **Process overhead for small teams:** OpenSpec's proposal → review → implement → archive workflow adds ceremony that may be unnecessary for solo developers or small research teams where you *are* the whole review process.
- **Rapid iteration vs formal proposals:** Research software often needs faster iteration. Creating a formal change proposal for every bug fix or experimental feature adjustment can slow velocity.
- **Git as change log:** For small teams, git commits and branch history may provide sufficient change tracking without the additional OpenSpec structure.
- **Simpler mental model:** Direct updates to living docs (with git history) vs maintaining parallel structures for current state and proposed changes.

**What We Borrow from OpenSpec:**
- Living specs concept (single source of truth)
- Recognition that most work is 1→n, not 0→1
- Clear separation of concerns in documentation
- Explicit status tracking

### Why This Direction?

This pattern is designed specifically for **research software engineering contexts** where:

1. **Team size is small** (often solo, sometimes 2-5 people): The review overhead of formal change proposals isn't justified. You need planning discipline without process theatre.

2. **Velocity matters** but so does maintainability: RSE projects often have research output pressure but also need to be maintainable enough to hand off or revisit months later. The pattern invests AI productivity gains into planning and documentation without drowning in process.

3. **Project types vary widely**: From quick prototypes testing hypotheses to maintained infrastructure serving multiple researchers. The pattern scales by adjusting detail level, not switching methodologies.

4. **Projects evolve from prototype to infrastructure**: Many RSE projects start as "quick test" and become "oh shit, this is now critical infrastructure." The pattern works both pre-MVP (where modules guide build sequence) and post-MVP (where modules define system boundaries).

5. **AI assistance is the norm**: The structure is designed for AI discoverability (grep-based or semantic search) and maintenance (regeneratable indices, clear update targets).

**Core Philosophy:** Use SpecKit's planning discipline and OpenSpec's living documentation concept, but optimise for small-team research velocity and the full prototype→infrastructure lifecycle.

This isn't a rejection of those tools — they solve real problems well. This is an adaptation for a different context: research software engineers who need maintainable velocity without enterprise process overhead.

---

## Directory Structure

```
project-root/
├── docs/
│   ├── index.md                      # Auto-generated development state
│   ├── constitution.md               # Process conventions (reusable template)
│   ├── architecture.md               # System design + project conventions
│   ├── CLAUDE.md                     # Agent context file (see note below)
│   ├── design/                       # Problem space and decisions
│   │   ├── problem-space.md
│   │   └── design-decisions.md
│   └── modules/
│       ├── module-name-1/            # Related features grouped
│       │   ├── feature-a/
│       │   │   ├── plan.md          # How it works, components, testing
│       │   │   └── status.md        # Current state, issues, todo
│       │   ├── feature-b/
│       │   │   ├── plan.md
│       │   │   └── status.md
│       │   └── module-status.md     # Integration testing notes
│       └── module-name-2/
│           └── ...
├── src/                              # Implementation code
└── tests/                            # Test code
```

**Note on Agent Context Files:** The `CLAUDE.md` file provides AI agent context and code standards. Alternative names include `GEMINI.md`, `CURSOR.md`, etc. depending on your tooling. Some teams prefer to keep code standards in `constitution.md` instead — choose what works for your workflow. The key recommendation is to include a link to `docs/index.md` in your agent file so the project documentation is discovered automatically in AI sessions.

---

## Core Documents

### 1. index.md (Auto-Generated)

**Purpose:** Navigation aid and implicit development timeline. Shows project state at a glance.

**Template:**

```markdown
# Project Index

## Core System
- [Architecture](architecture.md) — System overview and key decisions
- [Constitution](constitution.md) — Development conventions and standards

## Design Context
- [Problem Space](design/problem-space.md) — What we're solving and why
- [Design Decisions](design/design-decisions.md) — Key choices and alternatives

## Feature Modules

### Module Name 1 [✓ Complete]
Brief description of what this module provides
- [Feature A](modules/module-1/feature-a/) [✓]
- [Feature B](modules/module-1/feature-b/) [✓]
- [Module Status](modules/module-1/module-status.md)

### Module Name 2 [🚧 In Progress]
Brief description of what this module provides
- [Feature C](modules/module-2/feature-c/) [✓]
- [Feature D](modules/module-2/feature-d/) [🚧]
- [Module Status](modules/module-2/module-status.md)

### Module Name 3 [⏸ Planned]
Brief description of what this module provides
- [Feature E](modules/module-3/feature-e/) [⏸]

---

**Status Markers:**
- ✓ Complete and stable
- 🚧 In active development
- ⏸ Planned but not started
- 🟡 Complete but with known issues
- 🔴 Broken or degraded
- 🔧 Under revision/refactor
```

**Notes:**
- Order modules by development/dependency sequence
- Pre-MVP: Use ✓/🚧/⏸ markers
- Post-MVP: May shift to 🟢/🟡/🔴/🔧 for maintenance tracking
- Regenerate when adding features or changing module status

---

### 2. constitution.md (Reusable Template)

**Purpose:** Define process conventions and collaboration patterns. This is project-agnostic and can be reused across projects without modification. Code standards go in CLAUDE.md (or equivalent agent file), and project-specific conventions go in architecture.md.

**Template:**

```markdown
# Development Constitution

## Living Documentation Principle

All documents in `docs/` are LIVING DOCUMENTS. They represent the current state of the system, not historical records.

**When implementing changes:**
1. UPDATE the relevant plan.md to reflect current implementation
2. UPDATE status.md to reflect what's done/broken/deferred
3. Do NOT create new documents for changes — edit existing ones in place
4. Git history is our change log, not document versions

**When architecture changes:**
- Update architecture.md to reflect new structure
- Update affected feature plan.md files
- Note the rationale for changes

## AI Collaboration Patterns

### Planning Before Building
- Always write or update plan.md before implementing features
- Specify: how it works, key components, verification strategy
- Use planning time to clarify requirements and catch issues early

### Task Generation
When starting new work, generate task breakdowns from the plan:
- Break work into testable increments
- Identify dependencies between tasks
- Note which tasks can run in parallel

### Context Discovery
- Use docs/index.md as primary navigation
- Feature plan.md files contain implementation details
- Module-status.md describes integration behaviour
```

**Notes:**
- The living documentation principle is critical — it changes how AI updates docs
- This file contains no project-specific content — it's fully reusable
- Code standards belong in CLAUDE.md (or keep here if preferred)
- Project conventions belong in architecture.md

---

### 3. CLAUDE.md (Agent Context File)

**Purpose:** Provide AI agents with project context, navigation, and code standards. Named for your AI tool of choice — alternatives include `GEMINI.md`, `CURSOR.md`, etc.

**Template:**

```markdown
# Project Context

This project follows the Bower AI-assisted development pattern. All documentation
is in `docs/` and represents current state (living documents).

**Start here:** [docs/index.md](index.md) — Project navigation and status

## Key Files
- `docs/index.md` — Project navigation and module status
- `docs/constitution.md` — Development process conventions
- `docs/architecture.md` — System design and project conventions

## When Implementing Features
1. Read the relevant plan.md for context
2. Update plan.md if implementation approach changes
3. Update status.md with progress and issues
4. Follow conventions in constitution.md

## Finding Information
- Use docs/index.md to navigate feature modules
- Feature implementation details are in plan.md files
- Integration behaviour is in module-status.md files

---

## Code Standards

[Add your code standards here — type hints, testing philosophy, documentation style, etc.]
```

**Notes:**
- The link to `docs/index.md` is critical — it ensures AI agents discover the full project structure
- Some teams prefer to keep code standards in constitution.md instead
- Name the file to match your AI tooling (CLAUDE.md, GEMINI.md, CURSOR.md, etc.)
- Can include multiple agent files if using different tools

---

### 4. architecture.md

**Purpose:** High-level system design, technology choices, key structural decisions, and project-specific conventions (environment, data handling, etc.).

**Template:**

```markdown
# System Architecture

## Overview
[2-3 sentence description of what this system does]

## Key Components

### Component Name 1
- **Purpose:** What this component does
- **Technology:** Libraries/frameworks used
- **Interfaces:** What it exposes/consumes
- **Location:** Where in codebase

### Component Name 2
[Same structure]

## Data Flow
[Describe how data moves through the system]
- Input sources
- Processing stages  
- Output destinations
- Storage/persistence

## Technology Stack
- **Language:** Python 3.11
- **Key Libraries:** [List major dependencies]
- **Infrastructure:** [Deployment model, hosting, etc.]

## Key Design Decisions

### Decision 1: [Title]
**Context:** What problem we were solving  
**Decision:** What we chose  
**Rationale:** Why we chose it  
**Alternatives:** What we didn't choose and why  

### Decision 2: [Title]
[Same structure]

## Known Constraints
- Performance requirements
- Data sovereignty/privacy requirements
- Budget/resource limits
- Integration requirements

## Extension Points
[Where new capabilities can be added without major restructuring]

## Development Dependencies
[If modules have non-obvious build order, explain why]
Example: "Classification module depends on harvesting producing consistent metadata. Build order: harvesting → classification → analysis."
```

**Notes:**
- Keep high-level — detailed component design goes in feature architecture.md
- Update when making significant structural changes
- Focus on decisions future developers need to understand

---

### 5. design/ Directory

**Purpose:** Capture the human thinking that precedes implementation. Why this project exists, what problems it solves, key trade-offs.

#### design/problem-space.md

```markdown
# Problem Space

## The Problem
[Detailed description of the problem this project addresses]

## Who Has This Problem
[Target users, stakeholders, use cases]

## Current Alternatives
[What people do now, why it's insufficient]

## Success Criteria
[How we'll know this project succeeded]
- Metric 1
- Metric 2
- Qualitative measure

## Scope
**In Scope:**
- [What we're building]

**Out of Scope:**
- [What we're explicitly not building]

## Constraints
- Technical constraints
- Time/resource constraints
- Policy/compliance constraints
```

#### design/design-decisions.md

```markdown
# Design Decisions

## Decision Log

### [Decision Title] — [Date]
**Context:** What situation prompted this decision  
**Options Considered:**
1. Option A — pros/cons
2. Option B — pros/cons  
3. Option C — pros/cons

**Decision:** What we chose  
**Rationale:** Why this option  
**Implications:** What this means for architecture/implementation  

---

[Continue for each major design decision]
```

**Notes:**
- This is where exploratory AI chat transcripts could live (cleaned up)
- Captures *why* before we built *how*
- Especially valuable for novel research software where patterns don't exist yet

---

### 6. Feature Documentation

#### modules/module-name/feature-name/plan.md

**Purpose:** The single source of truth for how this feature works.

**Template:**

```markdown
# Feature Name

## Purpose
[What this feature does and why it exists]

## How It Works
[High-level explanation of the approach]

## Key Components
- **Component A:** Role and responsibility
- **Component B:** Role and responsibility

## Source Location

**Primary source:**
- `src/path/to/main_module.py` — Main implementation

**Tests:**
- `tests/path/to/test_module.py`

## Implementation Details
- Key algorithms or patterns used
- Important libraries or external dependencies
- Configuration or environment requirements

## Integration Points
- What this feature consumes from other features
- What this feature provides to other features
- APIs, interfaces, data contracts

## Verification Strategy

### Testing Approach
- Unit tests for [what]
- Integration tests for [what]
- End-to-end tests for [what]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Known Limitations
[What this feature doesn't do or doesn't handle well]
```

#### modules/module-name/feature-name/status.md

**Purpose:** Track current state, issues, and work in progress.

**Template:**

```markdown
# Feature Name — Status

**Last Updated:** [Date]  
**Status:** [✓ Complete | 🚧 In Progress | 🟡 Has Issues | 🔴 Broken | 🔧 Under Revision]

## Current State
[Brief description of what's working]

## Known Issues
- Issue 1: Description and impact
- Issue 2: Description and impact

## Work In Progress
- [ ] Task or fix description
- [ ] Task or fix description

## Deferred Work
[Things we decided not to do right now and why]
- Deferred item 1: Rationale for deferral
- Deferred item 2: Rationale for deferral

## Performance Notes
[If relevant: benchmarks, bottlenecks, optimization opportunities]

## Recent Changes
[Link to relevant commits or brief notes on major changes]
- [Date]: Change description
```

#### modules/module-name/module-status.md

**Purpose:** Describe how features in this module integrate and test together.

**Template:**

```markdown
# Module Name — Integration Status

**Last Updated:** [Date]  
**Status:** [✓ Complete | 🚧 In Progress | 🟡 Has Issues]

## Module Purpose
[What this group of features accomplishes together]

## Features in Module
- Feature A — [Brief role]
- Feature B — [Brief role]
- Feature C — [Brief role]

## Integration Points
[How features interact within this module]
- Feature A → Feature B: Data/interface description
- Feature B → Feature C: Data/interface description

## Integration Testing

### Test Scenarios
1. **Scenario 1:** Description of end-to-end test
   - Input/trigger
   - Expected behaviour
   - Success criteria

2. **Scenario 2:** [Same structure]

### Test Results
- Scenario 1: ✓ Passing | 🟡 Intermittent | 🔴 Failing
- Scenario 2: [Status and notes]

## Known Integration Issues
[Problems that arise from feature interactions]

## Dependencies
[External modules or systems this module depends on]
```

---

## Workflow Examples

### Starting a New Feature

1. **Determine the module** — Does this fit in an existing module or need a new one?
2. **Create feature directory:** `docs/modules/module-name/feature-name/`
3. **Write plan.md** — Specify how it will work, components, testing strategy
4. **Generate tasks** — "Based on this plan, generate an implementation task breakdown"
5. **Create status.md** — Initialize with "In Progress" status
6. **Implement with tests** — Build according to plan
7. **Update status.md** — Mark complete, document any issues
8. **Update module-status.md** — Add integration test scenarios if needed
9. **Regenerate index.md** — Update project state

### Making Post-MVP Changes

1. **Identify affected features** — What plan.md files need updating?
2. **Update plan.md** — Revise to reflect new implementation
3. **Update status.md** — Note what changed and any new issues
4. **If structure changed** — Update architecture.md
5. **Git commit** — The change log is in version control

### Using with AI IDEs

Create an agent context file (`CLAUDE.md`, `GEMINI.md`, `CURSOR.md`, etc.) in `docs/` following the template in section 3 above. The critical element is the link to `docs/index.md` — this ensures AI agents discover the full project structure automatically.

**Alternative approaches:**
- Some teams prefer keeping code standards in constitution.md rather than the agent file
- Multiple agent files can coexist if using different AI tools
- The agent file can live at project root instead of `docs/` if your tooling requires it

---

## Index Generation Prompt

When adding or changing features, use this prompt to regenerate the index:

```
Please update docs/index.md to reflect the current state of feature modules.

Instructions:
1. Scan docs/modules/ for all modules and features
2. Determine status from status.md files (✓/🚧/⏸/🟡/🔴/🔧)
3. Order modules by development/dependency sequence
4. Include brief descriptions of each module's purpose
5. Link to all plan.md and module-status.md files
6. Keep the core system and design context sections at the top

Use the template in docs/index.md as the structure.
```

---

## Adaptation Notes

### For Different Project Types

**Research Prototype (Days to Weeks):**
- May skip design/ directory if problem is well-understood
- Fewer modules, simpler structure
- Focus on plan.md for key features only

**Maintained Tool (Weeks to Months):**
- Full structure recommended
- Regular index updates
- Comprehensive status tracking

**Infrastructure (Months to Years):**
- Add modules/*/architecture.md for complex features
- More detailed module-status.md with extensive integration tests
- Consider team collaboration conventions in constitution.md

### Team Size Scaling

**Solo Developer:**
- Can skip some ceremony (e.g., detailed status updates)
- Git commits may be sufficient change log
- Focus on plan.md for complex features

**Small Team (2-5):**
- Use full structure
- Regular index regeneration
- Status.md becomes coordination tool

**Larger Teams:**
- May need additional conventions in constitution.md
- Consider feature ownership in status.md
- May need review process for plan.md updates

---

## Example Minimum Project

For testing this pattern, create a minimal example with:

**Project:** Simple Document Processor  
**Purpose:** Extract text and metadata from uploaded PDFs

**Structure:**
```
docs/
├── index.md
├── constitution.md
├── architecture.md
├── CLAUDE.md
├── design/
│   ├── problem-space.md
│   └── design-decisions.md
└── modules/
    ├── ingestion/
    │   ├── file-upload/
    │   │   ├── plan.md
    │   │   └── status.md
    │   └── module-status.md
    └── processing/
        ├── text-extraction/
        │   ├── plan.md
        │   └── status.md
        ├── metadata-extraction/
        │   ├── plan.md
        │   └── status.md
        └── module-status.md
```

This gives you two modules with realistic integration points to test the pattern.

---

## Success Metrics for Testing

When validating this pattern, track:

1. **Time distribution** — How much time on planning vs implementing?
2. **Documentation currency** — Do docs stay updated or rot?
3. **AI context effectiveness** — Does structure help AI find right context?
4. **Maintenance clarity** — Can you understand features months later?
5. **Test generation quality** — Do AI-generated tests work with good plans?

---

## License and Usage

This pattern specification is provided for research software engineering community use. Adapt freely for your projects and share learnings.

