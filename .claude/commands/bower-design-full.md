# Bower Full Design

You are running the Bower full design process. This is a four-stage workflow that produces the design documentation for a project or major architectural change. You do NOT write code in this workflow — only documentation.

The user's description of what they want to design: $ARGUMENTS

## Important Behavioural Rules

- **Consult at every gate.** Use AskUserQuestion at the end of each stage before proceeding. Present your findings, analysis, or draft and ask for confirmation, corrections, or elaboration. The user is an engineer — they expect to review and shape decisions, not rubber-stamp them.
- **Recommend, don't dictate.** When presenting options, mark one as (recommended) with a brief rationale, but make it clear the user chooses.
- **Stay in your stage.** Do not skip ahead. Each stage's output informs the next.
- **Write docs, not code.** This workflow produces documentation files only.
- **Read before writing.** If docs/architecture.md, docs/design/, or docs/index.md already exist, read them first. You are extending or revising, not starting from scratch unless the project is genuinely new.

## Stage 1: Problem Framing

**Goal:** Establish what we're solving, for whom, and within what constraints.

**Process:**
1. Read any existing project documentation (architecture.md, design/, README, etc.)
2. Analyse the user's description alongside existing context
3. Draft the problem framing covering:
   - The problem and who has it
   - Current alternatives and why they're insufficient
   - Success criteria (how we'll know it worked)
   - Scope boundaries (in/out)
   - Constraints (technical, time, policy, resource)

**Gate:** Present the problem framing to the user via AskUserQuestion. Ask:
- "Does this capture the problem accurately? Anything missing, wrong, or out of scope that should be in (or vice versa)?"

Wait for confirmation before proceeding.

## Stage 2: Design Decisions

**Goal:** Explore the solution space and make key architectural choices.

**Process:**
1. Based on the confirmed problem framing, identify the major design decisions that need to be made
2. For each decision, explore options with trade-offs:
   - What approaches are available
   - Pros and cons of each
   - Which you recommend and why
3. Consider: technology choices, architectural patterns, data flow, integration points, and anything the problem framing's constraints bear on

**Gate:** Present the design decisions to the user via AskUserQuestion. For each decision, show options and your recommendation. Ask:
- "Here are the key decisions I see. Do you agree with these choices? Any decisions I've missed, or options you'd prefer?"

Wait for confirmation before proceeding.

## Stage 3: Architecture Synthesis

**Goal:** Synthesise confirmed decisions into a coherent system design.

**Process:**
1. Based on confirmed decisions, draft the architecture covering:
   - System overview (2-3 sentences on what this system does)
   - Key components and their responsibilities
   - Data flow through the system
   - Technology stack
   - Key design decisions (referencing Stage 2 outcomes)
   - Known constraints
   - Extension points
2. If revising existing architecture, clearly identify what changes and what stays

**Gate:** Present the architecture to the user via AskUserQuestion. Ask:
- "Does this architecture hold together? Any components missing, or interactions that don't make sense?"

Wait for confirmation before proceeding.

## Stage 4: Module Planning

**Goal:** Break the architecture into implementable modules and establish build order.

**Process:**
1. Identify logical modules — groups of related features that form system boundaries
2. For each module:
   - What features/components it contains
   - What it depends on (other modules, external systems)
   - Brief description of its purpose
3. Determine build order based on dependencies
4. Identify which modules can be built in parallel

**Gate:** Present the module breakdown and build order to the user via AskUserQuestion. Ask:
- "Does this module breakdown make sense? Is the build order right? Any features in the wrong module?"

Wait for confirmation before proceeding.

## Writing Outputs

After all four stages are confirmed, write the documentation files:

1. **`docs/design/problem-space.md`** — From Stage 1
2. **`docs/design/design-decisions.md`** — From Stage 2
3. **`docs/architecture.md`** — From Stage 3 (update if exists)
4. **`docs/index.md`** — Populated with module structure from Stage 4, all marked ⏸ Planned

Create directories as needed. If `docs/constitution.md` doesn't exist, create it following the conventions described in the project's CLAUDE.md.

After writing, present a summary of files created/updated to the user.

## What NOT To Do

- Do not write implementation code
- Do not create feature plan.md or status.md files — those come during implementation
- Do not skip gates or combine stages
- Do not proceed past a gate without explicit user confirmation
- Do not ignore existing documentation — read and build on it
