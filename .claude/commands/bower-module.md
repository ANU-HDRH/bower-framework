# Bower Module Build

You are running the Bower module-build workflow. This builds all features in a single module in one pass, with one gate up front covering the entire module plan and one acceptance check at the end. Use this when the module is small and well-specified; use `/bower-feature` instead for exploratory work or modules that will likely need mid-flight design revision.

The user's target module: $ARGUMENTS

## Important Behavioural Rules

- **One gate, one acceptance.** You gate the whole module up front. You do not re-gate each feature individually. If an in-flight feature reveals the plan was wrong, stop and consult the user again via AskUserQuestion before continuing — same rule as `/bower-feature`.
- **Respect the build order.** Features are implemented in the order listed in `module-status.md` under `## Build order`.
- **Read first.** Architecture, scope, and the module's existing `module-status.md` are the foundation.
- **Acceptance is explicit.** Per-feature acceptance criteria plus a module-level integration test — both agreed at the gate.

## Step 0: Fit Check

Before anything else, confirm this module is actually a good fit for `/bower-module`:

- Module has a clear build order in `module-status.md`
- Features are well-specified from Stage 4 planning
- Module size is reasonable (typically ≤3–4 features; more is a smell but not a hard limit)
- No known architectural ambiguity that would force mid-flight redesign

If any of these fail, stop and recommend the user run `/bower-feature` instead, feature by feature. State the specific concern.

## Step 1: Understand Context

1. Read `docs/architecture.md` for system context
2. Read `docs/scope.md` — current scope and any unmet success criteria this module should close
3. Read the target module's `module-status.md` — integration notes and build order
4. Read `docs/constitution.md` for testing conventions
5. Read any `plan.md` / `status.md` that already exist in this module (e.g. from partial prior work)
6. Read source code for adjacent modules this one depends on

## Step 2: Draft Module Plan

Prepare a combined proposal covering **all features in the module's build order**. For each feature:

- **Purpose** — one line
- **Files affected** — new and modified
- **Technical approach** — brief
- **Acceptance criteria** — tests to write and what each verifies; manual checks if applicable
- **Dependencies** — on earlier features in this module or on other modules

Then, at the module level:

- **Integration test** — what test exercises the module boundary (per the integration notes in `module-status.md`)
- **Scope impact** — which `scope.md` success criteria this module closes, if any
- **What you won't touch** — explicitly note adjacent areas left alone

## Gate: Confirm or Adjust

Present the full proposal via AskUserQuestion. Frame as:

"Here's the full plan for module `<name>`: N features plus the module-boundary integration test. Confirm to proceed, or tell me what to adjust."

Include per-feature acceptance criteria and the integration test — these are the contract.

**Do not write any code until the user confirms.**

## Step 3: Implement

After confirmation, for each feature in build order:

1. Mark the feature 🚧 in `module-status.md` `## Build order`.
2. Create `docs/modules/<module>/<feature>/plan.md` — purpose, components, testing, trajectory (if multi-session, else skip the section).
3. Implement the feature per the agreed approach.
4. Write/update tests per the agreed acceptance criteria.
5. Run the tests; confirm they pass.
6. **Per-feature acceptance reconciliation (automated only).** Map each agreed criterion to its test:

   ```
   - <criterion> — test: <path::name> — PASS
   - <criterion> — test: <none written> — MISSING
   ```

   MISSING is a blocker — write the test or renegotiate via AskUserQuestion before continuing. Any manual criteria for this feature are deferred to Step 4 and surfaced in a single batch at the end of the module; create `status.md` with a `Pending verification:` line and mark the feature 🚧 (not ✓) for now.
7. Create `docs/modules/<module>/<feature>/status.md` as a resumption snapshot (≤150 words). If any manual criteria remain, include `Pending verification:`.
8. If no manual criteria remain for this feature, mark it ✓ in `module-status.md` `## Build order`. Otherwise leave it 🚧 pending Step 4.

After all features are complete:

9. Run the module-level integration test. If it fails, mark the module 🟡 or 🔴 as appropriate in `module-status.md` and surface the failure — do not paper over it.

## Step 4: Module Acceptance Reconciliation

Collect every manual acceptance check agreed at the gate — both per-feature manual checks and any manual aspect of the module integration test — into a single list. Present them to the user via one AskUserQuestion:

"These manual checks were agreed at the gate. Confirm each, or tell me which failed: [list]."

For each check:

- **PASS** — flip the relevant feature from 🚧 to ✓ in `module-status.md`; remove the item from that feature's `status.md` `Pending verification:` line (delete the line if now empty).
- **FAIL** — treat as a bug; if fixable in scope, fix and re-verify. If not, leave the feature 🟡 or 🔴 with the failure noted in its `status.md`.
- **Deferred** — leave the feature 🚧 with `Pending verification:` intact. `/bower-recap` will surface it later.

## Step 5: Finalise

10. Update integration notes in `module-status.md` if behaviour differs from Stage 4's assumptions.
11. Update `scope.md` if any success criterion is now met. Only count criteria whose manual checks have passed.
12. Run `/bower-index` or update `docs/index.md` so module-level status reflects reality.

## Partial Failure

If a feature mid-way through the module fails acceptance and cannot be resolved without a plan change:

1. Leave the failing feature's `status.md` honest about what went wrong and what the next move is.
2. Leave `module-status.md` build-order markers reflecting reality (some ✓, one 🔴 or 🟡, remainder ⏸).
3. Stop. Do not press on to subsequent features — they may depend on the broken one.
4. Surface the situation to the user and suggest `/bower-feature` for targeted recovery, or a return to design if the issue is architectural.

`/bower-recap` will present this state cleanly when anyone returns to the project.

<critical_constraints>
## What NOT To Do

- Do not start coding before the gate
- Do not re-gate each feature individually — the module gate is the contract
- Do not skip the integration test
- Do not expand scope beyond the module's build order
- Do not proceed past a feature whose tests are failing
- Do not propose architectural changes — if the module needs them, recommend the user run `/bower-design` instead
- Do not treat acceptance criteria as optional
- Do not mark a feature ✓ if any agreed criterion is MISSING or PENDING USER
- Do not skip the module-end manual-check prompt when manual criteria were agreed at the gate
</critical_constraints>
