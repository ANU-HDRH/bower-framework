# Bower Roadmap

Deferred framework improvements and the triggers that make each one worth picking up. This file is not loaded into context by default — it's a canonical home for ideas that are named but not scheduled.

Each item has a one-line description and a *revisit trigger*: the signal that turns it from deferred to worth doing. Items were last checked against a real project's state on 2026-09-23; an *Evidence* line records what that check found.

## Scheduled

In order. The first is framework-repo tooling and carries no version.

- **A scripted operator for the conformance suite** — `tools/conformance/drive.mjs`: each scenario as a list of turns (invoke, the non-answer probes, confirm), `git status --porcelain` checked after every turn. Claude Code runs through the Agent SDK, whose `canUseTool` callback always receives `AskUserQuestion` and can answer it, free-text non-answers included; Codex runs through its SDK, where `thread.run()` continues one thread across turns and answers a prose gate. The blocking criterion (no gated write before an explicit answer) is scored mechanically from porcelain; restatement by the choice labels, with a model judge as fallback; the operator reviews each ledger row before it is written. Covers C3 and C8 outright, plausibly C1, C2 and C4 (SDK abort, then resume). A row driven through the Claude SDK is the SDK surface, not the TUI, and says so. **Built 2026-09-24; Claude C3 cleared at v0.42.** Remaining: C3 and C8 on Codex; a C8 scenario needs turns that read the presented group (`send` as a function of the stop).

- **v0.43, held unreleased — the rest of the bundle** — *v0.43 carries the v0.42 UI-test fix and the accepted-as-deferred close-out.*
  - **A delegated role's elapsed time is not evidence of failure.** `Runtime bindings` → *Delegation* gains a clause: a polling timeout is not a failure; keep waiting, report progress, request status without interrupting, interrupt only on concrete evidence of a stall. A report produced under interrupt is marked so by the caller, in the artifact, naming what was degraded — the `Context: inline` discipline. Must not prescribe re-verification on the caller's thread. Observed at v0.33: a Codex caller interrupted an implementer running the full suite, then reconciled from a report that may have described an unfinished run.
  - **A viewer check for two ADRs sharing an `id`** — `extract.cjs` keys ADRs in a `Map` and silently keeps one; it is the only post-commit catch for an unrepaired `/b-merge` slug collision. Owed since v0.39.
  - Gate and delegation text both change, so C3 and C8 run through the driver above before the tier claims repeat.

## Deferred items

- **The reviewer misses plan-inventory and verification-count drift** — C8 at v0.43 (`docs/conformance/runs.md`): on `gpt-6-luna` twice and `gpt-6-sol` once, `/b-review` never named a file missing from a plan's `## Components` table (D6) or a `status.md` citing fewer assertions than the test file now holds (D7), and did not list either as ruled out. Both are mechanical comparisons the review schema's spec↔code and status-honesty dimensions cover. Candidate: name the two comparisons in `bower-reviewer`'s survey steps; the viewer's `component-missing` checks only the reverse direction (listed, not on disk).
  *Revisit trigger:* either miss on a real project's review, or the next C8 run on a Claude-side reviewer showing the same gap.


- **External obligations — ethics protocols and their kin constrain design and have no home** — *Raised at v0.34; trigger fired 2026-09-23; parked by the operator for design thinking, not for evidence.* An approved ethics protocol, a data management plan, a data-classification policy, a funder condition, a data-sovereignty commitment or a licence says where data may live, who may see it, what must be de-identified. These are constraints on implementation, written outside the project and amended on someone else's schedule, and nothing tells an agent building a feature that the protocol forbids what it is about to do.

  **Why nothing existing fits.** `constitution.md` is normative but self-authored and freely amendable. An ADR records a choice the project made; an obligation is a premise its choices answer to. `docs/reference/` is read-only but not binding. The missing class is **read-only and binding**. It also inverts *code is truth, ADR is hypothesis*: against an approved protocol, contradicting code is a defect, not evidence the document drifted — an agent applying the default rule will conclude the protocol is stale.

  **Evidence from the first real case.** A project vendored its full approved HREC package under `docs/reference/ethics/` with a hand-written `README.md` that grades each document's relevance (binding / context), extracts each software obligation with its clause citation, and disclaims any conformance claim. Its `constitution.md` carries an *Ethics-critical behaviours* list: each behaviour traced to a clause, each pinned by a named test that fails if the behaviour weakens, and weakening one requires an ADR. What that shows:
  - The predicted landing in `constitution.md` happened, but the project made the rule non-amendable itself; the predicted failure (an agent treating it as amendable) did not.
  - **A named pinning test is a workable discharge link.** It is derivable — the test exists and asserts the obligation, or it does not — which answers the objection that a hand-kept discharge field rots. Weigh against *An implementation state for ADRs* below.
  - The raw-package trap is live: the application, participant information sheets and reviewer correspondence are in the repository.
  - One listed behaviour is binding on the project's own authority (a retention period the protocol leaves unnamed and the privacy policy states). The class includes self-imposed commitments promoted to binding, and the admission test must say how.

  **Design questions (operator, 2026-09-23).** Onboarding: obligations extracted into something ADR-like, and consulted at propose time as ADRs are. Shape: extend the ADR — accepting a further stretch of what the *A* already means — or a sibling register reusing ADR machinery (stable ID, source, lifecycle, `scope`/`modules`/`topics`, generated index) with different semantics.

  **Constraints any design must meet:**
  - **Admission test:** can this be violated by a line of code, a schema or a deployment choice? If not, it is a value statement and does not belong.
  - **Lifecycle is the mechanism:** anticipated → submitted → in force → amended, visible at load, because it decides hard boundary versus working assumption. Amendment is the common case, and supersession initiated from outside the project does not transfer from ADRs.
  - **Verbatim with provenance;** extraction is gated, human-reviewed work — the step where an agent most plausibly gets it subtly wrong.
  - **Any audit produces evidence and gaps for a human, never an attestation,** and says what it did not look at. A report headed "ethics conformance" can end up cited to an ethics committee.
  - **Cost:** a new document class touches the viewer's schema contract, `/b-index`, `/b-spec`, likely `/b-design` Stage 2 and the analyst's brief. Sized like the review lifecycle.

  *Revisit trigger:* the operator's shape decision. Design from the real project's `README.md` and constitution text, not from imagined protocols.

- **Multi-writer Bower — the residue** — *v0.38 (slug IDs, module-owned `ui.md` regions, migration renumbering) and v0.39 (`/b-merge`, *Working in parallel*) shipped 2026-08-25.* Still owed: a run of `/b-merge` on a real two-branch merge; the duplicate-`id` viewer check is scheduled for v0.43. Design position: small-team branch-and-merge, no PR review assumed, merges by people not fluent with git, solo work pays nothing. IDs are names never counts; a `docs/` conflict is impossible by construction or has a one-word resolution. Deliberately not built:
  - **Coherence detection beyond the two sides' diffs** — a branch contradicting docs neither side changed is `/b-review`'s territory. *Trigger:* an incoherence that `/b-merge` and `/b-recap` both missed.
  - **A scripted `/b-index` on the viewer's parser** — makes regenerate-never-merge idempotent. *Trigger:* a regenerate-on-conflict producing an index neither branch had, or a request for `/b-index` in CI.
  - **Late-bound or renumbered IDs** — needs an integration stage Bower will not have. *Trigger:* only if one arrives for another reason.
  - **Blast-radius listing at the `/b-feature` gate.** *Trigger:* a merge conflict caused by a cross-module write the operator never saw proposed.

- **Whether the choice gate captures reasoning** — *v0.37 replaced `## Alternatives considered` with attribution.* **Evidence (2026-09-23):** of ~30 ADRs a real project wrote under v0.37 or later, ~24 carry attribution and roughly half of those give the operator's reason, often quoted verbatim; bare `The operator chose X.` lines are a minority. The feared outcome — a corpus of bare selections — has not appeared. Reasoning: `_bower/rationale.md` → *What an ADR Can Honestly Claim*.
  *Revisit trigger:* a later corpus trending toward bare selections.

- **Three memory-shaped facts with no Bower home** — *v0.35 put project state in the repository; its audit found three shapes no artifact takes:* an open question about an accepted ADR; a per-document trust annotation for imported material; a cross-cutting multi-session plan. The first real migration homed all three at the gate rather than reporting them unclassifiable: a *"Provenance — not authoritative"* blockquote on the document itself (a live candidate shape), a project-local design-discussion file, and a plan parked under `## Not yet in force` (mild over-promotion). **Evidence (2026-09-23):** the same project now keeps a `docs/design/` folder Bower does not know about — design records and a discussion file, curated from `docs/index.md` and cited by ADRs. The trust annotation shares territory with the external-obligations item: both are per-document authority markers.
  *Revisit trigger:* a second project's migration audit hits one of these shapes, whether reported unclassifiable or near-fit homed; a stranded fact misdirects a session; or a second plan lands in `## Not yet in force`. Design from the real entries.

- **Growth of the always-read documents** — Three related items, all pushing detail from a growing top-level document into module scope; weigh together.
  - **What `docs/index.md` may be.** Read in full by every command, so size is a standing tax; curated sections have no wholesale writer, so only grow. v0.28 took the cheap half (curated budget, overflow report, the viewer's `oversized-table-cell`). Open: whether an index may only point, or its overview becomes bounded derived state `/b-index` owns.
  - **`integration-plan.md`** — move detailed cross-feature integration obligations out of `module-status.md`, loaded mainly by `/b-integration`. v0.41's density budget and shape test may make this unnecessary.
  - **`architecture.md` splitting** — a short overview, component detail in module-scoped docs. *Trigger:* ~500 lines.

  **Evidence (2026-09-23):** on the most mature real project, `index.md` is 58 lines, the largest `module-status.md` 104, `architecture.md` 306. The one oversized table cell is in a `plan.md`, not the index — the pattern has moved to where no budget applies.
  *Revisit trigger:* an index needing a surgical edit it cannot get; a second project growing an unbounded curated section; `architecture.md` past ~500 lines; or oversized cells recurring in plans. Cheapest bundled with other work in `/b-index`.

- **Where `module-status.md` compaction runs** — *v0.41 put it inline at reconcile and review closeout.* A tired context may skip it; delegation was rejected because a fresh subagent would load cold what the orchestrator has already read. The job is bounded so a skip fails safe.
  *Revisit trigger:* `module-status.md` files growing across several runs that each had the chance to compact.

- **Viewer drift checks wired into `/b-review` or `/b-recap`** — `extract.cjs` computes ~two dozen mechanical findings overlapping the reviewer's *spec↔code drift* and *status honesty* dimensions; a reviewer shelling it would get them free, as graceful enhancement when `node` is present. Not done because it makes the extractor's output a contract, and a second orientation source that can disagree with `docs/` needs a rule for which wins.
  *Revisit trigger:* a review missing a finding the drift page showed, or two reviews whose owned-drift items are all things the extractor computes.

- **The viewer's web layer is deliberately untested** — an extractor break is silent and ships; a render break is a blank panel the next reader sees, and nothing consumes the viewer. Only obstacle to a harness is `renderMd`'s `innerHTML` + `marked`.
  *Revisit trigger:* a command consumes viewer output, or a render bug reaches a release.

- **VS Code extension over the extractor** — the client reaches its container through one `HOST` interface, so an extension is a new shell, not new extraction. Deferred for its packaging and API-version burden.
  *Revisit trigger:* drift on the file under the cursor is wanted often enough that a browser tab is the friction.

- **`/b-adopt` v2 and adoption-aware `/b-review`** — *v1 shipped at v0.21.* v2 candidates, gated on a first real adoption: a dedicated survey agent; ledger-aware orientation in `/b-feature`/`/b-module`; a heavier module-boundary pass; whether reusing `🚧` for as-built features is clear. Adoption-aware review is the strongest of them — review is the natural pass for turning as-built code into recorded decisions — and is a reviewer redesign: test coverage, cross-feature consistency, boundary integrity and ADR drift survive on an adopted module; spec↔code drift and status honesty do not. Needs a mode tolerating missing per-feature files, a story for its overlap with the ledger drain, and rewriting `b-adopt.md`'s two prohibitions rather than deleting them.
  *Revisit trigger:* the first real brownfield adoption reported back on, or an operator at the end of one wanting a review pass. Do both together; they touch the same prohibitions.

- **An implementation state for ADRs** — an accepted ADR is a commitment and nothing asks whether it was built; a decision reshaping an existing component adds no roster entry, so nothing schedules it. v0.32 handles the case inside `/b-review`. Candidate: a mutable `implemented:` frontmatter field. Deferred because nothing derives it. The external-obligations evidence above — a named pinning test as a derivable discharge link — is the first candidate derivation; weigh the two together.
  *Revisit trigger:* an unimplemented accepted ADR found by a path other than `/b-review`, or "which ADRs are built?" asked with no way to answer.

- **Review-staleness snapshot at diagnosis vs closeout** — v0.29 counts features at diagnosis, so a review whose routed work added features closes slightly stale. Honest; possibly noise.
  *Revisit trigger:* an operator finding the staleness note unhelpful, twice.

- **Codex from experimental to supported** — needs every scenario in `docs/conformance/` green, and a gate-refusal FAIL blocks it. Outstanding: C2, C4, C5, C8 and C7 under `danger-full-access` on Codex; C1–C5 on Claude Code. Open observations to settle while running them: whether the parent sandbox mode gates delegation (confounded with model and effort so far), and whether a missing `cancel` choice seen once is variance or wording. The scripted operator (*Scheduled*) is the route.
  *Revisit trigger:* a green C1–C8 row set in `runs.md`.

- **Runtime delivery beyond the checked-in pair** — plugins would be a discovery aid over `.agents/skills/`, never a replacement; a third runtime is cheap to generate and expensive to claim, which is the right ratio, and enters by naming what it cannot provide and earning a tier.
  *Revisit trigger:* an operator who cannot use the checked-in footprint, or someone able to score a third runtime against the scenarios.

- **UI observation and living invariants** —
  - **Screenshot before confirm in `/b-ui` Step 4:** when an observation tool is in the session, capture the surface before the manual-check question; without one, today's behaviour. Includes documenting WSL2 headless setup. *Trigger:* two real UI cycles where the manual-check round-trip caused back-and-forth a screenshot would have prevented.
  - **`ui.md` invariants enforced by a test harness** (Playwright, Textual, native). Project-specific; likely a `constitution.md` convention rather than a framework default. *Trigger:* a `ui.md` invariant drifting from code, caught only at manual review or by a user.

- **Forward-written claims — three follow-ons to v0.40** —
  - **Render the decided-but-unbuilt roster** in the viewer, grouped by discharging feature. *Trigger:* annotations accumulating across more than one design run.
  - **Greenfield `architecture.md` after the first feature lands** — the greenfield exemption expires silently. *Trigger:* a `/b-feature` run building on an unbuilt claim as though it existed.
  - **Audit the cited authority** — `forward-write-no-authority` and `forward-write-superseded-authority` as `warn` checks. *Trigger:* a superseded ADR whose annotated claims a later run implements.

  **Evidence (2026-09-23):** `counts.forwardWritten` is 0 on the real project; nothing has been annotated yet.

- **Extend the implementation-agent boundary to `/b-module`** — a per-feature `bower-implementer` spawn in the build loop; if adopted, consider graduating the report contract to a `_bower/` schema. The original trigger (delegation validated on real `/b-feature` cycles) is plausibly met, but no `/b-module` run has happened on the real project since, so the cost it fixes has not been felt.
  *Revisit trigger:* the next real `/b-module` run.

- **Retirement lifecycle and `♻️` marker** — what happens to removed or abandoned features.
  *Revisit trigger:* a project first retires a feature.

- **One canonical copy per duplicated schema** — the ADR schema lives in `/b-adr`, `framework-reference.md`, `/b-index`'s seed and each project's `docs/adr/index.md`; the last is reachable only by migration note. Fix: nominate one copy, generate or include the rest — a delivery change, not to be bundled with a schema change.
  *Revisit trigger:* a schema change applied in several places with one missed. Nearly fired at v0.27.

- **Constitution heading schema and `_bower/archive/` rules** — v0.23 shipped the normative shape rule; the heading schema and archive rules remain.
  *Revisit trigger:* a constitution drifting into an ad-hoc shape the normative split did not prevent, or `_bower/archive/` contents becoming ambiguous.

- **Durable-ephemeral proposals on disk** — `docs/proposals/<slug>.md`, written at a gate, deleted on completion. Two instances exist (`review-plan.md`, `findings.md`), with different owners; the general convention does not.
  *Revisit trigger:* session-boundary pain in a gated multi-step change neither instance covers.

- **ADR index Decision summary per row** — so bundled ADRs surface their commitments without opening each file.
  *Revisit trigger:* two reviewer observations that an ADR's commitments were not visible from its index row.

- **Migrations as per-version files, repo-side** — `docs/migrations/` with an index plus one file per version, none scaffolded; retires `/b-upgrade`'s line-range bookkeeping and simplifies `release.sh`. Open: which index columns stay small.
  *Revisit trigger:* 1.0.

- **Token optimisation** — the criterion is removing instructions that compensate for model limits and letting interfaces carry what prose duplicates (`docs/context_optimisation_report.md`), weighed against conformance runs scored on the weakest supported model. v0.31 removed echo-only restatement blocks from the build and review paths; v0.40 removed justification prose from the five build/review/merge skills, the agents and *Forward-written claims*. Remaining: the report's Tranches 2 (orientation collapse) and 3; the justification cut over the nine remaining commands, each when next edited. Any tranche re-runs C3 and C8.
  *Revisit trigger:* 1.0, or drift between a rule and its negated restatement observed in practice.
