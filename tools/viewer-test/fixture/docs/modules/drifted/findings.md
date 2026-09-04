# Findings queue: drifted

Open findings recorded outside review. **Not living documentation** — each item is
deleted work: ticked on discharge, and the file is deleted when the last item is
disposed. This file implies no review state and holds nothing open.

Dispositions: `[ ]` open · `[x]` resolved · `[~]` won't fix (operator decision, with date).

## Findings

- [x] Q-drift-tombstone — the tombstone column was never added — route:/b-feature — Run /b-feature modify drifted add-tombstone according to Q-drift-tombstone in docs/modules/drifted/findings.md — done 2026-07-26 via /b-feature add-tombstone
  - Location: src/drift.ts:14
  - Drift: architecture.md described a tombstone column; the table had none.
  - Resolution: Add the column and backfill.
- [~] Q-abandoned-retry — shared retry semantics — route:/b-feature — Run /b-feature modify drifted shared-retry according to Q-abandoned-retry in docs/modules/drifted/findings.md
  - Location: src/drift.ts:40
  - Drift: architecture.md described shared retry; nothing implements it.
  - Resolution: Won't fix 2026-07-27 — the operator dropped the requirement.
