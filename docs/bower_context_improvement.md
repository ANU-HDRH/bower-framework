# Bower Context-Consumption Review

Date: 2026-07-16

## Executive conclusion

The 200–300k context usage seen during `/b-feature` is real, but it is not simply
the unavoidable price of Bower's engineering rigour. The main issue is that the
workflow packages orientation, planning, implementation, testing, and
reconciliation into one continuously growing model context.

The highest-leverage change is to use the post-gate `plan.md` as a deliberate
context boundary. The orchestrating agent should orient, propose, obtain
confirmation, and write the recovery anchor; a fresh implementation agent should
then receive the approved plan and selected supporting context, implement and
verify the change, and return a concise reconciliation summary to the
orchestrator.

This preserves the gate, acceptance criteria, ADR discipline, and living
documentation while preventing implementation mechanics and accumulated
reasoning from consuming the planning context.

## Evidence from recent sessions

Two recent Claude Code sessions were inspected:

- The completed `topic-progression` run began at approximately 49,733 input-context
  tokens and finished at 295,270.
- It involved 121 distinct model responses and 136 tool calls.
- The model generated approximately 112k output tokens across those responses,
  including its reasoning allocation.
- Visible tool results accounted for approximately 275k characters.
- The in-progress `distress-detection` run had already reached approximately
  146.7k context tokens midway through implementation.

Document loading is therefore a meaningful pre-gate cost, but the dominant
late-session growth comes from a long chain of granular read, edit, test, and
reconcile turns retained in one context.

## What is working well

The basic information architecture is sound:

- `docs/index.md` routes to modules.
- `module-status.md` identifies build order and integration obligations.
- Feature plans provide component maps instead of requiring source rediscovery.
- ADRs have a canonical index.
- `status.md` is deliberately compact and disposable.
- `plan.md` is a durable recovery anchor.

The gate, explicit acceptance criteria, decision reconciliation, and
living-document updates should be preserved. These are not the wasteful parts of
the workflow.

## Findings and recommendations

### 1. Use the recovery anchor as a context boundary

`/b-feature` explicitly writes `plan.md` before implementation so work can recover
from a crashed session. The same property can be used deliberately to shed
context:

```text
orient -> propose -> gate -> write plan
                               |
                      fresh implementation agent
                               v
                   implement -> test -> reconcile
```

The preferred implementation is an isolated agent that receives:

- the approved `plan.md`;
- the target feature and module status paths;
- the selected ADR paths and relevant architecture sections;
- project testing commands and conventions;
- an instruction to report changed files, test evidence, acceptance mapping,
  documentation implications, and any divergence from the approved plan.

The orchestrator should retain ownership of the gate and final reconciliation. If
agent delegation is unavailable, a `/b-feature --resume` or `/b-apply` phase after
a deliberate context reset would provide a similar boundary.

### 2. Batch tool use

The inspected completed run made 136 tool calls over 121 model responses, showing
very little batching. Independent initial reads were generally issued one response
at a time, and implementation used many small edit/reason/edit cycles.

The workflow should direct the model to:

- batch independent orientation reads;
- read source files named by a plan together;
- apply cohesive changes per file or implementation slice;
- avoid rereading an unchanged whole file after each edit;
- run related verification commands together while truncating routine output.

This keeps the same evidence while reducing accumulated reasoning turns.

### 3. Make architecture reads selective

Every feature currently reads all of `docs/architecture.md`, approximately 28k
characters in this project. Most changes need only:

- the system overview;
- the affected module's `## Software architecture` subsection;
- relevant named data flows;
- applicable constraints or extension points.

The existing heading structure already supports section-directed reads. The
command should require the whole document only when a change crosses or cannot be
confidently located within those sections.

### 4. Fix ADR applicability semantics

The current rule loads every accepted ADR with no `modules` field. In this project
that means 18 ADRs, approximately 65k characters. Several are narrower in practice,
including decisions about script versioning, test-harness execution, deployment
maintenance, cloudflared placement, framing, and project artefact authorization.

ADR metadata should distinguish genuinely universal decisions from module and
topic applicability, for example:

```yaml
modules: [interview]
topics: [streaming, control-codes]
scope: module # universal | module | integration | operational
```

The ADR index should expose `modules`, `topics`, `scope`, and ideally a one-sentence
constraint summary. A missing `modules` field should mean "unclassified legacy
ADR," not "load for every feature." Only `scope: universal` should imply universal
loading.

### 5. Keep indexes as routers

`docs/index.md` now contains a long rolling project narrative that repeats details
found in plans, UI documentation, ADRs, and module status. The `interview`
module-integration note has similarly grown into a detailed future end-to-end
specification.

These documents should remain compact:

- `docs/index.md`: module marker, current feature, next feature, and project-level
  blockers;
- `module-status.md`: build order, short boundary invariant, and integration-state
  pointer;
- detailed cross-feature integration obligations: a separate
  `integration-plan.md`, loaded mainly by `/b-integration`;
- feature details: the relevant feature plans.

The present cost is modest, but without separation it grows linearly with project
maturity and affects every future feature invocation.

### 6. Separate current contracts from implementation history

Some feature plans now combine:

- current behavioural contract;
- recovery instructions;
- schemas and algorithms;
- planned acceptance criteria;
- final test counts;
- implementation footnotes and historical evidence.

Completed plans should retain purpose, current contract, component map,
integration points, and current testing categories. Dated counts and
implementation history should be compressed aggressively or left to the short
resumption record and git history. A completed plan should principally describe
the system as it now exists.

### 7. Reduce global instruction duplication

The project-level `CLAUDE.md` imports all of `_bower/framework.md`, currently 307
lines, into every Claude interaction. `/b-feature` adds another 209 lines with
overlap around plans, ADR posture, UI routing, testing, document ownership, and
reconciliation. Together they account for roughly 55k characters before project
documents or source code are read.

A compact globally imported router could contain only:

- Bower identity and version;
- the hard architectural guard;
- document authority hierarchy;
- command routing;
- the requirement to read a component plan before modifying it;
- a pointer to the detailed framework for framework-maintenance questions.

Each slash command should carry the detailed workflow it actually needs.

## Suggested `/b-feature` orientation algorithm

1. Read the compact project index and affected `module-status.md`.
2. Read the target feature's `plan.md` and `status.md`.
3. Read only the affected architecture module subsection and named data flows.
4. Read the ADR index and select by explicit module, topic, and universal metadata.
5. For modify/remove, search sibling plans for exact feature, API, or component
   references and open only matches.
6. Read `scope.md` for add/remove, success-criterion work, or suspected scope
   impact.
7. Read relevant `docs/ui.md` sections after UI impact is established.
8. Read the testing portion of `constitution.md` before verification rather than
   necessarily before proposal.
9. Emit a short inputs-selected ledger so omissions remain auditable.
10. After confirmation, write `plan.md` and hand implementation to a fresh agent.

## Recommended priority

1. Introduce the post-gate implementation-agent boundary.
2. Require batched reads and cohesive edits.
3. Fix ADR applicability metadata and selection.
4. Make architecture and UI reads section-selective.
5. Slim `docs/index.md` and `module-status.md` back into routers.
6. Compact the global framework import.
7. Add a soft size discipline for completed feature plans.

## Overall judgement

Bower's rigour plausibly justifies a 50–100k working context for a feature of this
size. Regularly reaching 250–300k is primarily a workflow-packaging and
turn-granularity problem, not an inherent cost of specification-driven
development.

The implement-agent boundary offers the largest saving without weakening any of
the framework's engineering safeguards.
