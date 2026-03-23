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
3. Read the plan.md and status.md of any components likely affected
4. Read relevant source code to understand current implementation

## Step 2: Propose Changes

Prepare a proposal covering:

- **What changes:** Which components/modules are affected and how
- **Technical approach:** What you'll actually do (new files, modified files, patterns used)
- **Impact:** What else this touches — integration points, tests, documentation
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
3. Update documentation:
   - Update affected `plan.md` files if the design changed
   - Update affected `status.md` files
   - Update `module-status.md` if integration behaviour changed
   - Update `docs/index.md` if module status changed (or run `/bower-index`)
4. Run tests to verify acceptance criteria are met

If during implementation you discover the approach needs to change significantly, stop and consult the user again via AskUserQuestion before continuing.

## What NOT To Do

- Do not start coding before the gate
- Do not expand scope beyond what was confirmed
- Do not skip documentation updates
- Do not propose architectural changes — if the change requires them, recommend the user runs `/bower-design` instead
- Do not treat acceptance criteria as optional — they're the contract
