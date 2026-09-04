# built-feature

## Purpose

Marked ✓ in the build order while its own status.md says 🚧, and claims a file
that is not on disk. Links to [a document that does not exist](/docs/nope.md).

## Components

The banner below is **not** the section's first content, so it covers nothing:
a section banner has to sit directly under the heading. `src/missing.ts` must
still report. Accepting a blockquote anywhere before the table would suppress a
genuinely missing, unannotated row — hiding real drift rather than inventing a
false finding, which is the worse direction to fail in.

> **Decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md);
> built by feature `drifted/ghost-feature`.

| File | Purpose |
| --- | --- |
| `src/built.ts` | Exists _(new)_ |
| `src/missing.ts` | Does not exist _(new)_ |

## Access model

Callers pass a token (**decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md),
feature `drifted/built-feature`). The feature is ✓, so reconcile should have deleted this
annotation; it is now the false claim.

## Wrapper

The wrapper resolves options through the shared struct (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/absorbed-feature`).
This feature absorbed the whole of entry 6's scope, so that entry reads `Remaining:
none` and will never build anything — yet it is still ⏸, so neither the stale check
(which wants ✓) nor the unowned check (the owner resolves) can see this. Pull-forward
moved the work without moving the owner's name.
