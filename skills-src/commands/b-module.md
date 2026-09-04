---
name: b-module
description: Build all features of a small, well-specified module in one pass; one gate, one integration pass.
arguments: the target module
---

# Bower Module Build

You are running the Bower module-build workflow. This builds all features in a single module in one pass, with one gate up front covering the entire module plan and one acceptance check at the end. Use this when the module is small and well-specified; use `/b-feature` instead for exploratory work or modules that will likely need mid-flight design revision.

<!-- bower:arguments -->

## Important Behavioural Rules

- **One gate, one acceptance.** You gate the whole module up front. You do not re-gate each feature individually. If an in-flight feature reveals the plan was wrong, stop and consult the user again at an operator gate (binding: `_bower/framework.md` → *Runtime bindings*) before continuing — same rule as `/b-feature`.
- **Architecture is a hard redirect.** Build only the confirmed module build order; if the module needs an architectural change, stop and recommend `/b-design`.
- **Respect the build order.** Features are implemented in the order listed in `module-status.md` under `## Build order`.
- **Read first.** Architecture, scope, and the module's existing `module-status.md` are the foundation.
- **Acceptance is explicit.** Per-feature acceptance criteria plus a module-level integration test — both agreed at the gate.
- **Literal-command handoff.** Every "next move" you emit (in any feature `status.md`, in the final handoff) names the exact slash command to type next, never free prose. A `status.md` next move is **feature-scoped** — work on that feature or `(none — complete)`; the project-scoped one (next module, integration, review) is printed in the Step 6 handoff and never stored.

## Step 0: Fit Check

Before anything else, confirm this module is actually a good fit for `/b-module`:

- Module has a clear build order in `module-status.md`
- Features are well-specified from Stage 4 planning
- Module size is reasonable (typically ≤3–4 features; more is a smell but not a hard limit)
- No known architectural ambiguity that would force mid-flight redesign

If any of these fail, stop and recommend the user run `/b-feature` instead, feature by feature. State the specific concern.

## Step 1: Understand Context

Batch all independent reads — issue them together, not one per turn.

1. Read `docs/architecture.md` for system context. **A claim annotated *decided, not built* describes code that does not exist** — treat it as non-existent while planning (`_bower/framework-reference.md` → *Forward-written claims*). Find every annotation this build will discharge, project-wide:

   ```
   grep -rinA2 'decided, not built' docs/architecture.md docs/modules/*/*/plan.md
   ```

   Read the owner from the three-line window. Keep the hits naming `<this module>/<any feature in this build order>` and list them by path under Step 2's **Decision impact**. Each is discharged inside the build loop by the iteration that makes it true (3.7; 3.8 for an absorbed entry); 5.12 is the backstop
2. Read `docs/scope.md` — current scope, non-goals, and any success criteria whose `Delivered by:` clause names this module (those are the criteria this build is responsible for)
3. Read the target module's `module-status.md` — integration notes and build order
4. Read `docs/constitution.md` for testing conventions
5. Read any `plan.md` / `status.md` that already exist in this module (e.g. from partial prior work)
6. **Load relevant ADRs.** If `docs/adr/index.md` exists, read it. From the index, identify ADRs with `status: accepted` that (a) have `scope: universal`, (b) list this module under `modules`, (c) have a `topics` entry matching features in this module, or (d) have a title topically relevant to them — even if filed under another module. An ADR with no `scope` and no `modules` is *unclassified* (pre-v0.20) — load it on topical or title match only, never wholesale. Open and read each selected ADR. Treat them as constraints the module plan must respect; flag any that look stale relative to the current code.
7. Read source code for adjacent modules this one depends on

## Step 2: Draft Module Plan

Prepare a combined proposal covering **all features in the module's build order**. For each feature:

- **Purpose** — one line
- **Files affected** — new and modified
- **Technical approach** — brief
- **Acceptance criteria** — tests to write and what each verifies; manual checks if applicable
- **Dependencies** — on earlier features in this module or on other modules

Then, at the module level:

- **Integration test** — what test exercises the module boundary (per the integration notes in `module-status.md`)
- **Scope impact** — whether this build moves the scope boundary, changes a non-goal, or reveals that a success criterion is missing, wrongly worded, or points at the wrong module. Name the criteria this module is responsible for (those naming it under `Delivered by:`) as context for the plan, but do not treat satisfying them as a `scope.md` edit — criteria carry no status
- **UI impact** — if any feature introduces, removes, or restructures a screen, view, or component, name the `docs/ui.md` sections and, under `## Screens`, the regions (`#### <Region> — <module>`) that will be created or rewritten; `none` when the module is pure under-the-hood code. If `docs/ui.md` does not exist and the module introduces UI, Step 5 creates it.
- **Decision impact** — list any accepted ADR loaded in Step 1 that this module's build *touches*: confirms, contradicts (must supersede), narrows (a narrowing ADR — the old decision stays `accepted`), or surfaces as drifted. Note any new cross-cutting decision the module introduces that needs an ADR.
- **What you won't touch** — explicitly note adjacent areas left alone
- **Alternatives, where the plan has genuine branching choices** — two or more viable shapes that neither the module's docs nor the request has settled (the test is `/b-ui`'s). Letter them, give each its reasoning and trade-offs, mark one as recommended. Do not invent them to fill the slot; where the shape is already settled, propose it and say so. This matters more here than in `/b-feature`: this command gates **once** for the whole module, so a choice not offered at that gate is not offered at all.

## Gate: Confirm or Adjust

Present the full proposal at the operator gate. Frame as:

"Here's the full plan for module `<name>`: N features plus the module-boundary integration test. Confirm to proceed, or tell me what to adjust."

Include per-feature acceptance criteria and the integration test — these are the contract.

**Where the proposal lettered alternatives, the letters are choices at this gate too**, presented in the binding's prose form (`_bower/framework.md` → *Runtime bindings*): the operator names one — and may, but need not, say why — or adjusts. A bare letter is a complete answer. Record which option, resolved to its content rather than its letter, and their reason verbatim where they gave one; write both into the affected feature's `plan.md` at Step 3.2, and carry them to `/b-adr` in Step 4.

**Do not write any code until the user confirms.**

## Step 3: Implement

After confirmation, for each feature in build order:

1. Mark the feature 🚧 in `module-status.md` `## Build order`.
2. Create `docs/modules/<module>/<feature>/plan.md` — purpose, components, testing, trajectory (if multi-session, else skip the section). **Annotate it *decided, not built*** with a banner under the title, owner `` feature `<module>/<feature>` `` (this feature, module-qualified), authority `gate YYYY-MM-DD` where this module's gate settled the shape and no ADR was written (spelling: `_bower/framework-reference.md` → *Forward-written claims*). Item 7 deletes it once the tests pass. **If the gate settled a lettered choice affecting this feature**, add one or two lines recording the option the operator named, resolved to its content, and their reason in their own words where they gave one. Never write your own recommendation rationale there as though it were theirs.
3. Implement the feature per the agreed approach.
4. Write/update tests per the agreed acceptance criteria.
5. Run the tests; confirm they pass.
6. **Per-feature acceptance reconciliation (automated only).** Map each agreed criterion to its test:

   ```
   - <criterion> — test: <path::name> — PASS
   - <criterion> — test: <none written> — MISSING
   ```

   MISSING is a blocker — write the test or renegotiate at an operator gate before continuing. Any manual criteria for this feature are deferred to Step 4 and surfaced in a single batch at the end of the module; create `status.md` with a `Pending verification:` line and mark the feature 🚧 (not ✓) for now.
7. Create `docs/modules/<module>/<feature>/status.md` in the form the feature's marker calls for (schema: `_bower/framework-reference.md`, "status.md — Resumption Framing"). If manual criteria remain, that is the **live form** — resumption snapshot, ≤150 words, `Pending verification:` listing the deferred checks, and a `Next move:` of `Run /b-feature <this feature>`. If nothing remains and the feature lands ✓, write the **terminal form** instead: the marker, a `## Verification` section (date, what was run, what passed, plus `Qualification:` if the evidence carries a standing caveat), and `## Next move` → `(none — complete)`. ~50 words.

   **Delete the *decided, not built* banner you wrote at 3.2 and close the plan with `Confirmed YYYY-MM-DD`, in the same edit, whether the feature lands ✓ or 🚧** — the line covers the plan's unannotated claims, not verification (`_bower/framework-reference.md` → *Forward-written claims*).

   **Then discharge every other annotation naming `` `<this module>/<this feature>` `` now, not at the end of the module:**

   ```
   grep -rinA2 'decided, not built' docs/architecture.md docs/modules/*/*/plan.md
   ```

   Delete each — in any module's plan, and in `docs/architecture.md`, where the annotation is the only thing this command may change. Match the qualified name. If removing one would leave the surrounding prose *wrong* rather than merely unmarked, leave it and recommend `/b-design` in the Step 6 handoff.

   Either way the stored `Next move:` names work on *this* feature only — never the next feature in the build order, never `/b-integration` or `/b-review`. This pass will build those next features itself; a stored pointer to them is stale the moment it is written and nothing ever comes back to fix it. The project-scoped next move belongs in the Step 6 handoff.
8. If no manual criteria remain for this feature, mark it ✓ in `module-status.md` `## Build order`. Otherwise leave it 🚧 pending Step 4. **If building this feature landed part of a later entry's scope** — a dependency pulled the work forward — append one clause to that later entry: who absorbed what, then `Remaining:` and what is left. You will reach that entry yourself later in this same pass, so the note costs little here; it earns its keep afterwards, when a reader (or a `/b-feature` follow-up) wonders why that feature's plan claims more than it built. If nothing remains, write `Remaining: none` and leave the marker ⏸ until you reach it in the build order and verify it against its own criteria. Schema: `_bower/framework-reference.md`, "Pull-forward annotation." **Discharge that entry's annotations in the same pass**: with `Remaining: none`, every annotation it owns; otherwise only those covering what landed.

After all features are complete:

9. Run the module-level integration test. If it fails, mark the module 🟡 or 🔴 as appropriate in `module-status.md` and surface the failure — do not paper over it. On success, flip the `## Module integration` `Test:` marker in `module-status.md` to ✓ (or 🚧 if module-level manual checks remain).

## Step 4: Module Acceptance Reconciliation

Collect every manual acceptance check agreed at the gate — both per-feature manual checks and any manual aspect of the module integration test — into a single list. Present them to the user at one batch gate, collecting an explicit disposition per check:

"These manual checks were agreed at the gate. Confirm each, or tell me which failed: [list]."

For each check:

- **PASS** — flip the relevant feature from 🚧 to ✓ in `module-status.md`; remove the item from that feature's `status.md` `Pending verification:` line (delete the line if now empty). If that clears the last item and the feature is now ✓, compress `status.md` to its terminal form — marker, `## Verification` (fold in what this manual check confirmed, dated), `## Next move` → `(none — complete)`. Record a caveat on the evidence as `Qualification:`, never as `Pending verification:`; a ✓ feature carrying the latter reads as a false-completeness error.
- **FAIL** — treat as a bug; if fixable in scope, fix and re-verify. If not, leave the feature 🟡 or 🔴 with the failure noted in its `status.md`.
- **Deferred** — leave the feature 🚧 with `Pending verification:` intact. `/b-recap` will surface it later.

**Decision reconciliation.** Review the **Decision impact** noted at the gate. For each touched ADR: confirmed → no action; contradicted/drifted → invoke `/b-adr` with the ADR-ID being superseded; narrowed → invoke `/b-adr` for a narrowing ADR (the narrowed ADR keeps `status: accepted`); new cross-cutting decision → invoke `/b-adr` to record it.

**Carry the operator's choice to `/b-adr`.** Where the gate settled a lettered choice, pass the resolved option and — where they gave one — their reason in their own words. That is the only provenance the ADR can honestly carry, and the gate is now a whole module's work behind you. Do **not** pass your own recommendation rationale as theirs, and where no choice was offered, pass nothing.

Skip only if no Decision impact was identified at the gate. If the user rejects the drafted ADR at `/b-adr`'s gate, redraft with their adjustments rather than skipping; if they want to abandon ADR creation entirely, re-classify the impact (likely "confirmed") — do not silently skip. Complete any ADR work before continuing to Step 5.

## Step 5: Finalise

9. **`docs/ui.md`** — if the gate's UI impact was anything but `none`, reconcile now. Rewrite the regions this module owns under the affected `### <Screen>` sections and leave other modules' regions alone; add a `#### <Region> — <this module>` heading for each new region; create the file with only the sections this module requires if it does not exist (shape: `_bower/framework-reference.md` → *UI Changes* → *`## Screens` is headed regions*). Current-state doc, not history.
10. Update integration notes in `module-status.md` `## Module integration` `Notes:` if behaviour differs from Stage 4's assumptions. Confirm the `Test:` marker reflects the real outcome of Step 3.9.
11. Update `scope.md` only if the build moved the scope boundary, changed a non-goal, or requires a criterion to be added, deleted, reworded, or re-pointed at a different module. Do **not** mark criteria as met — they carry no status, and `/b-recap` derives achievement from module completion.
12. **Backstop the *decided, not built* discharge.** 3.7 and 3.8 did the work per feature; this checks the loop did it and catches the one defect only a whole-project view sees:

    ```
    grep -rinA2 'decided, not built' docs/architecture.md docs/modules/*/*/plan.md
    ```

    - An annotation naming a feature this build **landed** (✓, or 🚧 with its plan stamped `Confirmed`) is a missed discharge: delete it and say so in the Step 6 handoff. In `docs/architecture.md` delete only the annotation; if that would leave the prose *wrong*, leave it and recommend `/b-design` in the handoff.
    - Leave every other annotation: one owned by a feature this build did not land (⏸, or 🚧 without a stamp — mid-build), by another module's feature, or by any `` `<module>/Q-<slug>` `` — this command does not drain the queue; whoever does deletes it.
    - **An annotation with no owner** is a write-side defect: offer at an operator gate to record it in the owning module's `docs/modules/<module>/findings.md` — `Q-<slug>`, `route:/b-design` where the claim is in `architecture.md` and `route:/b-feature` otherwise, three-line brief naming file, line and claim — as `/b-feature` Step 6.12 does. Do not adopt or delete it.
13. Run `/b-index` so module-level status reflects reality. Do **not** hand-edit `docs/index.md` as an alternative — its status is derived from the markers you just wrote, and prose appended there has no writer that ever compacts it (see *Status is never curated* in `b-index.md`). If `/b-index` is not invokable, leave the index to the next regeneration.

## Step 6: Handoff

Emit a single handoff block. Always name a literal slash command:

```
Module <name>: <state summary>

Next move:
  - <one of:>
    Run /b-review <name>                       (optional — fresh-eyes review now the module is complete)
    Run /b-module <name>                       (next module in inter-module build order)
    Run /b-feature <name>                      (next ⏸ feature, if next module is exploratory)
    Run /b-integration <module>         (re-run after fixing PENDING USER items)
    Run /b-recap                               (orient before deciding)
    (none — all modules ✓; project completion is /b-recap's call, which derives success-criteria satisfaction)
```

Pick exactly one recommended next command. Mention at most one alternative on a second line. `/b-review` is optional — if the module completed cleanly and the project is small, the operator may reasonably skip it; name it so it's one keystroke away, but don't force it ahead of the next module's build. It is also resumable: a review opens a `Review: 🚧` state that re-running `/b-review <module>` continues, so it need not be finished in one sitting.

## Partial Failure

If a feature mid-way through the module fails acceptance and cannot be resolved without a plan change:

1. Leave the failing feature's `status.md` honest about what went wrong and what the next move is.
2. Leave `module-status.md` build-order markers reflecting reality (some ✓, one 🔴 or 🟡, remainder ⏸).
3. **Leave the failing feature's *decided, not built* banner in place** — the code did not land, which is what it says. Do not run Step 5.12's sweep; the features that did complete were discharged at 3.7 and 3.8.
4. Stop. Do not press on to subsequent features — they may depend on the broken one.
5. Surface the situation to the user and suggest `/b-feature` for targeted recovery, or a return to design if the issue is architectural.

`/b-recap` will present this state cleanly when anyone returns to the project.
