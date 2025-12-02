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

## Documentation Structure

Each component is documented at `docs/modules/<module>/<component>/` containing:

- **plan.md** — How the component works, its design, and source locations
- **status.md** — Current state, known issues, and work in progress

**Before working on any component**, read its `plan.md` first. This file contains:
- Component purpose and design
- Source file locations (eliminating need to search for implementations)
- Test file locations
- Integration points with other components

The source location section in plan.md provides direct paths to implementation files, avoiding separate searches for code.

## Standards

### Testing Philosophy
- **End-to-end tests:** For data pipelines and workflows
- **Integration tests:** At module boundaries (module-status.md)
- **Unit tests:** For complex logic, pure functions, transformations
- Generate tests alongside implementation when plan is clear

### Documentation Style
- Write for future-you in 6 months
- Explain *why* decisions were made, not just *what*
- Keep it concise — prefer clarity over completeness
- Update docs as part of implementation, not after
