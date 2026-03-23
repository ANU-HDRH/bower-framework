# Bower Index Generator

Regenerate `docs/index.md` by scanning the current state of project documentation.

## Process

1. Read `docs/architecture.md` for the system overview (if it exists)
2. Read `docs/constitution.md` to confirm it exists
3. Scan `docs/design/` for design documents
4. Scan `docs/modules/` for all modules, features, and their status files
5. For each feature, read its `status.md` to determine the current status marker
6. For each module, read its `module-status.md` for integration status

## Output

Write `docs/index.md` with the following structure:

```markdown
# Project Index

## Core System
- [Architecture](architecture.md) — System overview and key decisions
- [Constitution](constitution.md) — Development conventions and standards

## Design Context
- [Problem Space](design/problem-space.md) — What we're solving and why
- [Design Decisions](design/design-decisions.md) — Key choices and alternatives

## Feature Modules

### <Module Name> [<status>]
<Brief description from module-status.md>
- [<Feature>](modules/<module>/<feature>/) [<status>]
- ...
- [Module Status](modules/<module>/module-status.md)
```

## Rules

- Order modules by dependency sequence (build order), not alphabetically
- Derive status markers from status.md files: ✓ 🚧 ⏸ 🟡 🔴 🔧
- Module-level status is the "worst" status of its features (🔴 > 🟡 > 🚧 > ⏸ > 🔧 > ✓)
- Only include sections that exist (skip Design Context if no design/ directory)
- Include brief descriptions for each module from its module-status.md
- If no modules exist yet, write the Core System and Design Context sections only
