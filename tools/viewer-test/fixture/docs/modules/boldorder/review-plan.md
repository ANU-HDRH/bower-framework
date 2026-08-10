# Review plan: boldorder

Open review, diagnosed 2026-07-28 against 2 features. Present here with no
`## Module review` marker backing it — the pair is written together, so this is
a review whose marker was never set or was closed without deleting the plan.

Dispositions: `[ ]` open · `[x]` resolved · `[~]` won't fix (operator decision, with date).

## Findings

- [x] F1 — plan.md stale on the parser entry point — inline-reconcile — docs/modules/boldorder/plan.md:12
- [~] F2 — consolidate the two bold helpers — route:/b-feature — won't fix (operator, 2026-07-29)
- [ ] F3 — non-owner 404 vs 403 — route:/b-feature — Run /b-feature modify boldorder owner-response according to F3 in docs/modules/boldorder/review-plan.md
  - Location: src/boldorder/read.ts:48 vs src/boldorder/write.ts:61
  - Drift: read returns 404 for a row that isn't the caller's; write returns 403 for the equivalent case.
  - Resolution: Pick one and apply to both. Behavioural, with an acceptance criterion.
- [ ] F5 — the parser accepts a bare `**` — route:/b-design — Run /b-design bare-emphasis-boundary according to F5 in docs/modules/boldorder/review-plan.md
  - Location: src/boldorder/parse.ts:19
  - Drift:
- [ ] a finding written as free prose, with no class and no pointer
- [x] F13 — resolved routed items are not chased for a brief — route:/b-feature — Run /b-feature modify boldorder already-landed according to F13 in docs/modules/boldorder/review-plan.md — done 2026-07-29 via /b-feature already-landed
- [ ] F14 — a routed finding with no brief at all — route:/b-feature — Run /b-feature modify boldorder no-brief-at-all

  Re-opened 2026-07-30 — the first fix regressed, kept open pending the follow-up.

## Constitution

- docs/constitution.md:9 — operator authorised correcting the coverage claim; recorded so a resumed session knows the edit was consented to.

## Observations (not actionable)

- ADR-0002's commitments were not visible from the ADR index.
