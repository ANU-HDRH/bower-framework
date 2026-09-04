# done-but-pending

## Purpose

Marked ✓ while deferred manual checks are still outstanding.

## Components

> **Decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md);
> built by feature `drifted/ghost-feature`.

A whole `## Components` section written ahead: a design run added the rows for
files `ghost-feature` will create. The feature holding the plan is ✓, so
`component-missing` would otherwise report both absent files as drift — the row
is the annotation's whole point. The owner is 🚧, so no lifecycle check fires
either; this instance must be silent in every direction.

| File | Purpose |
| --- | --- |
| `src/b.ts` | Shared with feature-b _(modify)_ |
| `src/ghost-a.ts` | Not on disk yet _(new)_ |
| `src/ghost-b.ts` | Not on disk yet _(new)_ |

## Integration points

`src/b.ts` — shared with feature-b.
