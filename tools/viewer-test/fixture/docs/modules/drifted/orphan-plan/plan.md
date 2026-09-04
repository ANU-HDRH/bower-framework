# orphan-plan

## Purpose

Has a plan and no status.md, and appears in no build order.

The wrapper takes its options as a struct (**decided, not built** — gate 2026-07-30,
feature `drifted/orphan-plan`). Self-owned and not yet rostered: that is what an
interrupted `/b-feature` add leaves, and `feature-not-in-build-order` already names
the repair, so `forward-write-unowned` must stay quiet. Also the only annotation here
decided by a gate rather than an ADR.

## Components

| File | Purpose |
| --- | --- |
| `src/a.ts` | Shared _(modify)_ |
