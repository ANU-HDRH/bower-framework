# Bower Index Generator

Regenerate `docs/index.md` and (if `docs/adr/` exists) `docs/adr/index.md` by scanning the current state of project documentation.

## Process

1. Read `docs/architecture.md` for the system overview (if it exists)
2. Read `docs/constitution.md` to confirm it exists
3. Scan `docs/design/` for design documents
4. Scan `docs/adr/` for ADR files (any file matching `NNNN-*.md`); parse frontmatter from each
5. Scan `docs/modules/` for all modules, features, and their status files
6. For each feature, read its `status.md` to determine the current status marker
7. For each module, read its `module-status.md` for both the `## Build order` markers and the `## Module integration` `Test:` marker

## Output: `docs/index.md`

Write `docs/index.md` with the following structure:

```markdown
# Project Index

## Core System
- [Architecture](architecture.md) — System overview and key decisions
- [Constitution](constitution.md) — Development conventions and standards

## Design Context
- [Problem Space](design/problem-space.md) — What we're solving and why
- [Decision Log](adr/index.md) — Architectural Decision Records (N accepted, M superseded)

## Feature Modules

### <Module Name> [<status>]
<Brief description from module-status.md>
- [<Feature>](modules/<module>/<feature>/) [<status>]
- ...
- [Module Status](modules/<module>/module-status.md)
```

The Decision Log line is included only if `docs/adr/` exists and contains at least one ADR. Counts come from frontmatter `status` fields. Omit the Design Context section entirely if neither `docs/design/` nor `docs/adr/` exists.

## Output: `docs/adr/index.md`

If `docs/adr/` does not exist, skip. Otherwise write `docs/adr/index.md` with the following structure:

```markdown
# Architectural Decision Records

This is the project's decision log. Each ADR records a cross-cutting commitment — a choice that constrains more than one feature. Bodies are immutable once accepted; reversals are written as new ADRs that supersede the old.

**Code is truth, ADR is hypothesis.** An accepted ADR records what the project *decided*, not necessarily what the code currently *does*. If an ADR contradicts current code, the ADR is the stale one — supersede it, do not silently trust it.

## Schema

Frontmatter fields:

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `ADR-NNNN`, four-digit zero-padded, immutable |
| `title` | yes | Sentence case, matches the kebab portion of the filename |
| `status` | yes | `accepted` \| `superseded` \| `deprecated` |
| `date` | yes | `YYYY-MM-DD` |
| `modules` | no | List of Bower module names; **omit entirely** for cross-cutting decisions |
| `supersedes` | no | List of ADR IDs this entry replaces |
| `superseded-by` | no | List of ADR IDs that replaced this entry |

Body sections (in order): `## Context`, `## Decision`, `## Consequences`, `## Alternatives considered`.

Filter by `status: accepted` for "what's true now." Older statuses are historical.

## Active decisions — module-scoped

| ID | Title | Modules | Date |
|---|---|---|---|
| [ADR-NNNN](NNNN-kebab-title.md) | <title> | <modules> | <date> |

(Listed by ascending ID. Includes only `status: accepted` ADRs that have a `modules` field.)

## Active decisions — cross-cutting

| ID | Title | Date |
|---|---|---|
| [ADR-NNNN](NNNN-kebab-title.md) | <title> | <date> |

(Listed by ascending ID. Includes only `status: accepted` ADRs with no `modules` field.)

## Superseded and deprecated

| ID | Title | Status | Superseded by | Date |
|---|---|---|---|---|

(Listed by ascending ID. Includes `status: superseded` and `deprecated`. Omit the section heading if empty.)
```

The schema section is **fixed boilerplate** — write it verbatim every time, regardless of project. It is the canonical schema reference for the project. The tables underneath are derived from frontmatter.

## Rules

- Order modules in `docs/index.md` by dependency sequence (build order), not alphabetically
- Derive status markers from status.md files: ✓ 🚧 ⏸ 🟡 🔴 🔧
- Module-level status is the "worst" status across both its feature markers *and* its `## Module integration` `Test:` marker (🔴 > 🟡 > 🚧 > ⏸ > 🔧 > ✓). A module with all features ✓ but module integration ⏸ surfaces as 🚧 — the constitution's verified-for-✓ rule made observable.
- Only include sections that exist (skip Design Context if no `design/` and no `adr/` directory)
- Include brief descriptions for each module from its module-status.md
- If no modules exist yet, write the Core System and Design Context sections only
- For ADR tables: if a row's `modules` field is empty/missing, the ADR belongs in the cross-cutting table; otherwise module-scoped. Order ADRs by ID ascending. Do **not** invent rows — read frontmatter literally.
- If an ADR is malformed (missing required field, unknown status), include it in a final `## Malformed` section with the file path and the issue, so it can be fixed manually. This is the only way schema violations surface.
