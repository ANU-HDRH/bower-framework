# shrunk-feature

## Purpose

Planned before built-feature absorbed most of its scope. This plan therefore
overstates what is left to build; the build-order `Remaining:` clause is the
contract.

## Components

| File | Purpose |
| --- | --- |
| `src/shrunk.ts` | Not built yet _(new)_ |

## Access model

> **Decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md);
> built by feature `drifted/shrunk-feature`.

The CLI wrapper reads the drift table directly. Conformant: the feature is ⏸,
the annotation names it, and reconcile will delete this banner.

Per [ADR-0001](/docs/adr/0001-universal-decision.md) the wrapper is typed at the
boundary (**decided, not built** — [ADR-typed-boundaries](/docs/adr/typed-boundaries.md),
feature `drifted/shrunk-feature`). The annotation's own ADR must win over the one the
surrounding claim cites first.
