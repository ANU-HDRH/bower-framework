# stale-pointer

## Purpose

Finished long ago, but its `status.md` still carries the forward-pointing next
move it was given the day it completed — the v0.30 `next-move-on-complete`
instance.

Its `## Components` table is the row-level control for the banner in
`done-but-pending`: one annotated row is suppressed, one unannotated row beside
it still reports. An inline clause covers its own row and no more.

## Components

| File | Purpose |
| --- | --- |
| `src/built.ts` | Shares the parser with built-feature _(modify)_ |
| `src/late-wrapper.ts` | Written by the wrapper feature (**decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/ghost-feature`) _(new)_ |
| `src/really-missing.ts` | Genuinely absent, unannotated — this row must still report _(new)_ |

The retry path is queued (**decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/ghost-feature`).

That last clause is prose *inside* `## Components`, after the table, and covers
nothing in it. Only the canonical blockquote banner before the first row covers a
section; treating any non-table annotation as one let this line suppress
`src/really-missing.ts`, which hides real drift rather than merely inventing a
false finding.
