# Bower Change

You are running the Bower change workflow — the everyday command for any work that fits within existing architecture. One gate before any code is written.

This command covers three intents:

- **Add** — a new feature within an existing module, a new component, a new capability that fits the current architecture.
- **Modify** — change the behaviour, contract, or implementation of something that already exists.
- **Remove** — delete a feature, component, or capability that's no longer wanted.

The shape is the same across all three: read context → propose → gate → implement → reconcile → update docs. The differences show up in *which* files you read in Step 1 and *which* docs you update in Step 5; those branches are called out where they apply.

If the change requires architectural revision (new module, new technology, scope expansion) recommend `/b-design` instead — see the constraint at the bottom of this file.

The user's description of what they want to change: $ARGUMENTS

## Important Behavioural Rules

- **Consult before building.** Use AskUserQuestion to present your proposal and get confirmation before writing any code. The user is an engineer — they expect to review the plan.
- **Read first.** Read the existing architecture, relevant module docs, and any affected plan.md/status.md files before proposing changes.
- **Scope tightly.** Only propose changes needed for this specific request. Don't redesign what works.
- **Acceptance is explicit.** Propose how the change will be verified (tests, manual checks, or both) and get agreement on that too.
- **Literal-command handoff.** Every "next move" you emit (in `status.md`, in any handoff line) names the exact slash command to type next, never free prose. "Run `/b-integration foundation`" — yes. "Write the integration test next" — no.

## Step 1: Understand Context

1. Read `docs/index.md` to understand project structure
2. Read `docs/architecture.md` for system context
3. Read `docs/scope.md` to understand current scope, non-goals, and success-criteria state
4. Read the plan.md and status.md of any components likely affected
5. Read the `module-status.md` of the affected module (if it exists) — check the `## Build order` section and the `## Module integration` `Notes:`
6. Read relevant source code to understand current implementation

**For modify or remove intents, also read sibling features in the same module.** Other features' `plan.md` files often describe interactions with the thing you're changing — those references go stale if you don't catch them. Skim each sibling `plan.md` for outbound references to the feature/component being modified or removed; list any that need updating in the Step 2 Impact section.

**Build order check:** If the requested change is **adding a new feature** to a module, append it to the module's `## Build order` as part of Step 5 — the build order is a living document, not a Stage-4 contract. If the requested change is on a feature that is part of a module with a `## Build order` and earlier features in that order are not yet complete (not ✓), surface this to the user as part of the proposal in Step 2. Do not hard-block — warn and let the user proceed anyway. Working out of order is sometimes the right call; the warning exists so it's a conscious choice.

## Step 2: Propose Changes

Prepare a proposal covering:

- **Intent:** Add, modify, or remove. (Just one — if multiple, run them as separate changes.)
- **What changes:** Which components/modules are affected and how
- **Technical approach:** What you'll actually do (new files, modified files, deleted files, patterns used)
- **Impact:** What else this touches:
  - **Source:** integration points and any callers / consumers of changed behaviour
  - **Tests:** which existing tests need updating or removing; which new tests are needed
  - **Docs:** **list each `plan.md` that needs updating by path** (the one for this feature, plus any sibling features whose plans reference behaviour you're changing or removing). Don't bury this under "documentation" — name the files.
  - **Module integration:** does this shift what the module's integration test must assert? If yes, the test itself likely needs updating — flag it here so the Step 5 `Next move:` can point to `/b-integration <module>`.
- **Scope impact:** Does this change scope, non-goals, or close a success criterion in `scope.md`?
- **Acceptance criteria:** How we'll know this works. Be specific:
  - Tests to write, update, or remove (with brief description of what each verifies)
  - Manual verification steps if applicable
  - Edge cases to consider
- **What you won't change:** Explicitly note anything adjacent that you're leaving alone

Mark your recommended approach if there are alternatives.

## Gate: Confirm or Adjust

Present the proposal to the user via AskUserQuestion. Frame it as:

"Here's what I propose to change and how I'll verify it works. Confirm to proceed, or tell me what to adjust."

Include the acceptance criteria in the question — these are part of the agreement, not an afterthought.

**Do not write any code until the user confirms.**

## Step 3: Implement

After confirmation:

1. Implement the changes as proposed
2. Write/update tests per the agreed acceptance criteria
3. Run tests; confirm they pass

## Step 4: Acceptance Reconciliation

Before marking the feature done, produce an explicit reconciliation of every acceptance criterion agreed at the gate. Each criterion maps to evidence:

```
- <criterion> — test: <path::name> — PASS
- <criterion> — test: <none written> — MISSING
- <criterion> — manual: "<check description>" — PENDING USER
```

Handling:

- **MISSING** is a blocker. Either write the test, or return to the user via AskUserQuestion to renegotiate the criterion. Do not proceed with MISSING items.
- **PENDING USER** — for each manual check, ask the user via AskUserQuestion to confirm it passes. Present all manual checks in a single question. If the user confirms, mark PASS. If the user reports failure, treat as a bug and fix before proceeding. If the user defers ("I'll check later"), leave as PENDING USER and mark the feature 🚧 rather than ✓ (see Step 5).

## Step 5: Update Documentation

The exact set of documents to touch depends on the intent. Common to all intents: `status.md` is rewritten from scratch, `module-status.md` build-order markers reflect reality, and `scope.md` is updated if the change shifted scope.

**For add intent:**

1. Create or update `plan.md` for the new feature (purpose, components, testing, trajectory section if multi-session).
2. Append the new feature to `module-status.md` `## Build order`. Place it where its dependencies dictate; if it has none, append to the end. Mark ✓ if all criteria PASS, 🚧 if PENDING USER.
3. Refresh `## Module integration` `Notes:` if the new feature widens what the integration test must assert. Do not flip the marker.

**For modify intent:**

1. Update this feature's `plan.md` to reflect the new behaviour. Delete claims that no longer hold; the doc represents *current state*, not history.
2. Update each sibling `plan.md` listed in the Step 2 Impact section — fix outbound references to the changed behaviour. If the proposal didn't list any but you now realise a sibling plan is stale, update it and note this in the resumption summary.
3. Refresh `## Module integration` `Notes:` if the test's assertions need to shift. If yes, the `Next move:` below points to `/b-integration` so the test itself gets updated.
4. If the feature is multi-session, update `## Implementation trajectory` in `plan.md`: compress the just-completed phase into a one-paragraph précis (why-focused, not steps); leave future phases detailed.

**For remove intent:**

1. Delete the feature's `plan.md` and `status.md` files; remove its directory under `docs/modules/<module>/<feature>/`.
2. Remove the feature from `module-status.md` `## Build order`.
3. Update each sibling `plan.md` listed in the Step 2 Impact section — strip references to the removed behaviour.
4. Refresh `## Module integration` `Notes:` if the test's assertions need to shrink.
5. Update `architecture.md` only if the removed thing was named there as a public surface. If you find yourself rewriting architecture, stop — this isn't a `/b-feature` change. Recommend `/b-design`.

**All intents:**

6. Rewrite this feature's `status.md` from scratch as a **resumption snapshot** — current state, next move. ≤150 words. Do not append to the previous contents. If any criteria are still PENDING USER, include a `Pending verification:` line listing them. (Skip this for remove — the file is gone; resumption guidance lives in the next-move handoff below.)

   The `Next move:` line is **a literal slash command, not prose**. Pick exactly one of:

   - `Run /b-feature <name>` — for the next ⏸ feature in the module's build order, or for follow-up work on this feature if PENDING USER items will need a new gate.
   - `Run /b-integration <module>` — if (a) this change shifted what the module's integration test must assert and the test now needs updating, **or** (b) this was the last non-✓ entry in the module's build order and the `## Module integration` marker is still ⏸ or 🚧.
   - `Run /b-module <name>` — if the next module is small and well-specified.
   - `Run /b-design` — if the change revealed an architectural shift that needs design treatment (rare; usually surfaced earlier).
   - `Run /b-recap` — if next steps depend on user judgement and you want them to orient.
   - `(none — change complete and no further action required)` — only when the project is genuinely done.

7. Update `scope.md` if the change shifted scope, changed non-goals, or closed a success criterion.
8. Update `module-status.md`: update the `## Build order` marker for this feature. Use ✓ only if all criteria are PASS; use 🚧 if manual checks remain PENDING USER; use 🟡 or 🔴 if something is broken. Do **not** flip the `## Module integration` marker here — that belongs to `/b-integration`.
9. Run `/b-index` or update `docs/index.md` if module status markers changed.

If during implementation you discover the approach needs to change significantly, stop and consult the user again via AskUserQuestion before continuing.

<critical_constraints>
## What NOT To Do

- Do not start coding before the gate
- Do not expand scope beyond what was confirmed
- Do not skip documentation updates
- Do not propose architectural changes — if the change requires them, recommend the user runs `/b-design` instead
- Do not treat acceptance criteria as optional — they're the contract
- Do not mark a feature ✓ if any agreed criterion is MISSING or PENDING USER
- Do not skip the manual-check prompt when manual criteria were agreed at the gate
- Do not emit free-prose next moves — `Next move:` is always a literal slash command (or the explicit `(none — ...)` form)
</critical_constraints>
