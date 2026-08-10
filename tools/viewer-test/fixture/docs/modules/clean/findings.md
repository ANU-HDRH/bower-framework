# Findings queue: clean

Open findings recorded outside review. **Not living documentation** — each item is
deleted work: ticked on discharge, and the file is deleted when the last item is
disposed. This file implies no review state and holds nothing open.

Dispositions: `[ ]` open · `[x]` resolved · `[~]` won't fix (operator decision, with date).

## Findings

- [ ] Q1 — feature-b re-parses feature-a's output instead of consuming the typed shape — route:/b-feature — Run /b-feature modify clean typed-boundary-consumption according to Q1 in docs/modules/clean/findings.md
  - Location: src/clean/feature-b.ts:31 vs src/clean/feature-a.ts:12
  - Drift: feature-a returns a typed record; feature-b re-serialises and re-parses it to read one field.
  - Resolution: Consume the typed shape directly and delete the parse. Behavioural, with a test.
- [x] Q2 — duplicate fixture loader in both feature suites — route:/b-feature — Run /b-feature modify clean consolidate-fixture-loader according to Q2 in docs/modules/clean/findings.md — done 2026-07-24 via /b-feature consolidate-fixture-loader
  - Location: src/clean/__tests__/feature-a.test.ts:8, feature-b.test.ts:8
  - Drift: both suites define the same loader; the second copy drifted first.
  - Resolution: One loader in a shared fixture module.
