# Architecture

## Runtime view

Two modules and two deliberate defects.

## Software architecture

**Build-order rationale.** `clean` first because it has no dependencies.

**Reassignable ownership** is a mutable column distinct from immutable creation
provenance (**decided, not built** — [ADR-0002](/docs/adr/0002-module-decision.md),
feature `clean/Q1`). Conformant: no roster entry carries this, so an open
findings-queue item owns it, and whoever drains Q1 deletes the annotation.

**Typed boundaries** everywhere (**decided, not built** —
[ADR-typed-boundaries](/docs/adr/typed-boundaries.md), feature `drifted/never-planned`).
`never-planned` is in no build order, so nothing can ever delete this.

**Retry semantics** are shared (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `dupe/built-feature`).
That entry is ⏸, so this is silent — even though `drifted/built-feature` is ✓.

**Backoff** is shared too (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `built-feature`).
Unqualified: it could mean either module, so nothing can reliably remove it.

**Token passing** at the boundary (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/built-feature`).
That entry is ✓ and this annotation is in a doc the feature does not live in, so
the discharge was simply missed — the unambiguous half of the stale check.

**Tombstones** mark deleted rows (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/Q-drift-tombstone`).
That item is ticked, so the annotation outlived its owner.

**Shared retry** across the drift table (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/Q-abandoned-retry`).
Won't-fixed: the work is not happening, so the claim goes rather than the marker.

**Soft deletes** everywhere (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `drifted/Q-never-recorded`).
No such item in that module's queue — drained and deleted, or never recorded.

**Bulk import** (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `dupe/Q-orphan-owner`).
`dupe` has no findings.md at all, so the owner cannot exist.

**Audit trail** on every write (**decided, not built** —
[ADR-0002](/docs/adr/0002-module-decision.md), feature `dupe/pending-verify`).
That entry is 🚧 with its plan stamped `Confirmed`: the code exists and only a
manual check is pending, so the discharge was missed — a 🚧 owner is built when
its plan says so, and mid-build when it does not.

**Event sourcing** for the drift table.

> **Decided, not built** — [ADR-0001](/docs/adr/0001-universal-decision.md).

No feature named, so nothing can delete this either.

### clean

**Purpose.** The conformant module. Contributes no findings at all.

**Data concern.** The `a` and `b` tables.

**Depends on.** Nothing.

**Consumed by.** `drifted`

### drifted

**Purpose.** Carries one instance of most per-feature drift conditions.

**Data concern.** The `drift` table.

**Features.** `built-feature` · `ghost-feature`

**Depends on.** `clean`

**Consumed by.** Nothing.

### ghost

**Purpose.** Declared here with no directory under docs/modules/.

**Data concern.** None — it does not exist.

**Depends on.** `clean`

**Consumed by.** Nothing.

### dupe

**Purpose.** Holds a feature name that `drifted` also holds, so the two must not
collide in the annotation index.

**Data concern.** None — it exists for its build order.

**Depends on.** Nothing.

**Consumed by.** Nothing.

### reviewstale

**Purpose.** Reviewed once, then grown — the derived-staleness condition.

**Data concern.** The `snapshot` table.

**Depends on.** Nothing.

**Consumed by.** Nothing.
