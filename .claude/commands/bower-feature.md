# Bower Lightweight Change

You are running the Bower lightweight change workflow. This is for features, fixes, and enhancements to a project with existing architecture. One gate before any code is written.

The user's description of what they want to change: $ARGUMENTS

## Important Behavioural Rules

- **Consult before building.** Use AskUserQuestion to present your proposal and get confirmation before writing any code. The user is an engineer — they expect to review the plan.
- **Read first.** Read the existing architecture, relevant module docs, and any affected plan.md/status.md files before proposing changes.
- **Scope tightly.** Only propose changes needed for this specific request. Don't redesign what works.
- **Acceptance is explicit.** Propose how the change will be verified (tests, manual checks, or both) and get agreement on that too.

## Step 1: Understand Context

1. Read `docs/index.md` to understand project structure
2. Read `docs/architecture.md` for system context
3. Read `docs/scope.md` to understand current scope, non-goals, and success-criteria state
4. Read the plan.md and status.md of any components likely affected
5. Read the `module-status.md` of the affected module (if it exists) — check the `## Build order` section
6. Read relevant source code to understand current implementation

**Build order check:** If the requested feature is part of a module with a `## Build order` and earlier features in that order are not yet complete (not ✓), surface this to the user as part of the proposal in Step 2. Do not hard-block — warn and let the user proceed anyway. Working out of order is sometimes the right call; the warning exists so it's a conscious choice.

## Step 2: Propose Changes

Prepare a proposal covering:

- **What changes:** Which components/modules are affected and how
- **Technical approach:** What you'll actually do (new files, modified files, patterns used)
- **Impact:** What else this touches — integration points, tests, documentation
- **Scope impact:** Does this change scope, non-goals, or close a success criterion in `scope.md`?
- **Acceptance criteria:** How we'll know this works. Be specific:
  - Tests to write or update (with brief description of what each verifies)
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

1. Update `plan.md` if the design shifted.
2. Rewrite `status.md` from scratch as a **resumption snapshot** — what's the current state, what's the next move if someone picked this up tomorrow. ≤150 words. Do not append to the previous contents. If any criteria are still PENDING USER, include a `Pending verification:` line listing them.
3. If the feature is multi-session, update `## Implementation trajectory` in `plan.md`: compress the just-completed phase into a one-paragraph précis (why-focused, not steps); leave future phases detailed.
4. Update `scope.md` if the change shifted scope, changed non-goals, or closed a success criterion.
5. Update `module-status.md`: update the `## Build order` marker for this feature. Use ✓ only if all criteria are PASS; use 🚧 if manual checks remain PENDING USER; use 🟡 or 🔴 if something is broken. Update integration notes if integration behaviour changed.
6. Run `/bower-index` or update `docs/index.md` if module status markers changed.

If during implementation you discover the approach needs to change significantly, stop and consult the user again via AskUserQuestion before continuing.

<critical_constraints>
## What NOT To Do

- Do not start coding before the gate
- Do not expand scope beyond what was confirmed
- Do not skip documentation updates
- Do not propose architectural changes — if the change requires them, recommend the user runs `/bower-design` instead
- Do not treat acceptance criteria as optional — they're the contract
- Do not mark a feature ✓ if any agreed criterion is MISSING or PENDING USER
- Do not skip the manual-check prompt when manual criteria were agreed at the gate
</critical_constraints>
