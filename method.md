# Bower Method

> **Draft** — This operational guide is a skeleton for team refinement.

This document describes how to operationalise the Bower Framework through each phase of a project's lifecycle.

---

## Phase 1: Project Setup

### Goal
Establish the documentation structure and AI agent configuration.

### Steps

1. **Create directory structure:**
   ```
   project-root/
   ├── docs/
   │   ├── design/
   │   └── modules/
   ├── src/
   └── tests/
   ```

2. **Copy constitution.md template** from Bower into `docs/constitution.md`
   - This is reusable as-is for most projects
   - Add project-specific code standards later

3. **Create CLAUDE.md** (or GEMINI.md, etc.) at project root:
   ```markdown
   # Project Context
   
   **Start here:** [docs/index.md](docs/index.md)
   **Development conventions:** [docs/constitution.md](docs/constitution.md)
   
   ## Project-Specific Code Standards
   [Add as needed]
   ```

4. **Create placeholder files:**
   - `docs/index.md` — empty, will be populated after design
   - `docs/architecture.md` — empty, will be populated after design

### Documents Created
| File | Status |
|------|--------|
| `docs/constitution.md` | Complete (template) |
| `CLAUDE.md` | Complete |
| `docs/index.md` | Placeholder |
| `docs/architecture.md` | Placeholder |

---

## Phase 2: Design Process

### Goal
Establish the problem space, design decisions, and high-level architecture through AI-assisted conversation.

### AI Conversation Prompts

**Starting the design conversation:**
```
I'm starting a new project. Help me think through the design by exploring:

1. What problem are we solving?
2. Who has this problem and what do they currently do?
3. What are the key constraints (technical, time, policy)?
4. What does success look like?
5. What's explicitly out of scope?
```

**Exploring implementation approaches:**
```
Given the problem space, let's explore implementation options:

1. What are the main architectural approaches?
2. What are the key technology choices and trade-offs?
3. What are the major components/subsystems?
4. How does data flow through the system?
```

### Outputs

After the design conversation, ask the AI to produce:

1. **problem-space.md** — Following the template in `bower.md`
   - Place in `docs/design/problem-space.md`

2. **design-decisions.md** — Key choices with rationale
   - Place in `docs/design/design-decisions.md`

3. **architecture.md** — System overview, components, data flow
   - Update `docs/architecture.md`

### Documents Touched
| File | Action |
|------|--------|
| `docs/design/problem-space.md` | Create |
| `docs/design/design-decisions.md` | Create |
| `docs/architecture.md` | Populate |

---

## Phase 3: MVP Planning

### Goal
Break the implementation into modules (temporal sequence for MVP), determine dependencies, and establish the build order.

### AI Conversation Prompts

**Planning the MVP breakdown:**
```
Based on the architecture, help me plan the MVP implementation:

1. What are the logical modules/subsystems?
2. What is the dependency order? (What must be built first?)
3. For each module, what are the key components?
4. What's the minimum we need for a working system?
```

**Establishing module sequence:**
```
Let's establish the build order:

1. Which module produces output that others depend on?
2. Can any modules be built in parallel?
3. What integration points exist between modules?
```

### Outputs

1. **Module list with sequence** — Update `docs/index.md`:
   ```markdown
   ## Modules
   
   ### Module 1 [⏸ Planned]
   Description of what this module does
   - [Component A](modules/module-1/component-a/) [⏸]
   - [Component B](modules/module-1/component-b/) [⏸]
   
   ### Module 2 [⏸ Planned]
   ...
   ```

2. **Architecture refinement** — Update `docs/architecture.md`:
   - Add Development Dependencies section
   - Document module build order

### Documents Touched
| File | Action |
|------|--------|
| `docs/index.md` | Populate with module list |
| `docs/architecture.md` | Add build order |

---

## Phase 4: Module Iteration (MVP Build)

### Goal
For each module in sequence, plan components, create documentation, implement, and track status.

### Process Per Module

> **[NEEDS REFINEMENT]** — The exact workflow for iterating through modules during MVP is still being refined. Below is the current working model.

#### 4.1 Plan the Module

**AI conversation:**
```
I'm starting work on [Module Name]. Based on the architecture:

1. What components does this module need?
2. What does each component do?
3. What are the integration points with other modules?
4. What's the implementation order within this module?
```

#### 4.2 Set Up Component Documentation

For each component identified:

1. **Create plan.md** at `docs/modules/<module>/<component>/plan.md`:
   - Purpose
   - How it works
   - Key components
   - Source location (planned paths)
   - Integration points
   - Verification strategy

2. **Create status.md** at `docs/modules/<module>/<component>/status.md`:
   - Status: ⏸ Planned
   - Current state: Not started
   - Work in progress: Initial tasks

3. **Create module-status.md** at `docs/modules/<module>/module-status.md`:
   - List of components
   - Integration points within module
   - Integration testing notes

#### 4.3 Implement Components

For each component:

1. **Read plan.md** before starting
2. **Implement** following the plan
3. **Update status.md** as work progresses:
   - Change status to 🚧 In Progress → ✓ Complete
   - Note any issues encountered
   - Document deviations from plan
4. **Update plan.md** if implementation differs from original design

#### 4.4 Complete Module

1. Update **module-status.md** with integration test results
2. Update **index.md** — change module status to ✓ Complete
3. Move to next module

### Documents Touched Per Component
| Task | Documents |
|------|-----------|
| Plan component | Create `plan.md`, `status.md` |
| Implement | Update `status.md` |
| Complete | Update `status.md`, possibly `plan.md` |
| Complete module | Update `module-status.md`, `index.md` |

---

## Phase 5: Post-MVP Maintenance

### Goal
Handle ongoing changes — features, fixes, and enhancements — while keeping documentation current.

### Scenario: Bug Fix to Existing Component

1. **Read** the component's `plan.md` for context
2. **Fix** the issue in code
3. **Update** `status.md`:
   - Add to Known Issues (if systemic)
   - Add to Recent Changes
4. **Update** `plan.md` only if the fix changes the design

**Documents touched:** `status.md`, possibly `plan.md`

### Scenario: New Feature in Existing Component

1. **Read** the component's `plan.md`
2. **Update** `plan.md` with new functionality:
   - Add to How It Works
   - Add to Implementation Details
   - Update Source Location if new files
3. **Implement** the feature
4. **Update** `status.md`:
   - Add to Recent Changes

**Documents touched:** `plan.md`, `status.md`

### Scenario: New Component in Existing Module

1. **Create** `docs/modules/<module>/<new-component>/plan.md`
2. **Create** `docs/modules/<module>/<new-component>/status.md`
3. **Update** `module-status.md`:
   - Add component to list
   - Add integration points
4. **Update** `index.md`:
   - Add component link under module
5. **Implement** the component

**Documents touched:** Create `plan.md`, `status.md`; update `module-status.md`, `index.md`

### Scenario: New Module

1. **Create** module directory: `docs/modules/<new-module>/`
2. **Create** component documentation (as per Phase 4)
3. **Create** `module-status.md`
4. **Update** `index.md`:
   - Add new module section
5. **Update** `architecture.md` if structural change

**Documents touched:** Create module structure; update `index.md`, possibly `architecture.md`

### Quick Reference: What to Update

| Change Type | plan.md | status.md | module-status.md | index.md | architecture.md |
|-------------|---------|-----------|------------------|----------|-----------------|
| Bug fix | Maybe | Yes | — | — | — |
| Feature (existing component) | Yes | Yes | Maybe | — | — |
| New component | Create | Create | Yes | Yes | — |
| New module | Create | Create | Create | Yes | Maybe |
| Architecture change | Yes | — | Maybe | — | Yes |

---

## Summary

| Phase | Key Activity | Main Outputs |
|-------|--------------|--------------|
| 1. Setup | Create structure | `constitution.md`, `CLAUDE.md` |
| 2. Design | AI-assisted exploration | `problem-space.md`, `design-decisions.md`, `architecture.md` |
| 3. MVP Planning | Break into modules | `index.md` with module list, build order |
| 4. Module Iteration | Plan → Document → Implement → Update | `plan.md`, `status.md`, `module-status.md` per component |
| 5. Post-MVP | Maintain living docs | Update relevant docs per change type |

---

## See Also

- [bower.md](bower.md) — Full framework specification
- [docs/constitution.md](docs/constitution.md) — Development conventions
- [docs/index.md](docs/index.md) — Example project structure

