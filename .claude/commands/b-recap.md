# Bower Recap

You are running the Bower recap workflow. This is a **strictly read-only, advisory** orientation command. It answers one question: *where is this project, and what's the next move?*

You do **not** write files. You do **not** commit. You do **not** call `AskUserQuestion`. You produce a single structured text block and stop.

## Inputs (read-only)

Read these and only these, and only if they exist:

1. `docs/index.md` — project-level structure and module status markers. Also note a leading `🌱 Adoption in progress` banner if present: the project is in the **adoption phase**, which changes how `🚧` features and the next action are read (see below).
2. `docs/scope.md` — current scope and success-criteria state (met/unmet)
3. `docs/modules/**/module-status.md` — `## Build order` and `## Module integration` state for each module
4. `docs/modules/**/<feature>/status.md` — only for features currently at 🚧, 🟡, 🔴, or 🔧 (skip ✓ and ⏸). **A `🚧` feature with no `status.md` is an adopted-but-unverified feature, not an in-progress one** (adoption marks features as-built `🚧` and deliberately writes no `status.md`). Do not treat the missing file as an error or an omission — there is simply no session state to summarise; report it under *Adopted (unverified)*, not *Currently in progress*.
5. `docs/modules/**/review-plan.md` — only check for existence; if present, a `/b-review` left reconciliation owed. Read its `## Reconciliations` checklist to count done/total. Do not read it for any other purpose — it is a transient work list, not project state.
6. `docs/adoption-ledger.md` — only if the adoption banner is present. Count its open items (one bullet each) and note a couple of examples; do not otherwise read it line-by-line.

If `docs/index.md` does not exist, the project has not been designed yet. Say so in one line and recommend `/b-design`. Stop.

## Synthesis

From those inputs, compose:

- **Project name and one-line scope summary** — from `scope.md`
- **Adoption phase** — if the `🌱` banner is present, state it and the open-ledger count (e.g. "🌱 adoption phase — 6 open questions in adoption-ledger.md"). Omit this line entirely when there is no banner.
- **Progress overview** — per module, one line each, with status marker and brief state (e.g. "Module B: 🚧 2 of 4 features built"). During the adoption phase, a module's `🚧` reflects as-built-but-unverified features, so phrase it that way (e.g. "Module B: 🚧 4 features as-built, unverified") rather than implying active work.
- **Currently in progress** — any feature at 🚧 **that has a `status.md`**, with a one-line state from it. In the adoption phase, features at `🚧` with no `status.md` are *not* in progress — they belong under *Adopted (unverified)*.
- **Adopted (unverified)** — adoption-phase only: features at `🚧` with no `status.md` (as-built from existing code, not yet verified to the `✓` bar). List per module, or a one-line count if many. Omit this section when not in the adoption phase.
- **Degraded or blocked** — any feature at 🟡, 🔴, or 🔧 with the reason
- **Recommended next action** — derived from build order *and* module-integration state. Always emitted as a literal slash command (or the explicit `(none — ...)` form), never as prose:
  - **Adoption phase takes precedence:** if the `🌱` banner is present, the next move is to drain the ledger, not to build — adopted features already exist in code. Emit the ledger as the next action: `Drain docs/adoption-ledger.md (N open) — per item: /b-adr (resolve), /b-feature or /b-design (remediate), or delete the line (dismiss); remove the banner when empty.` Do not recommend `/b-feature <name>` merely because features sit at `🚧` — that `🚧` is as-built, not in-progress.
  - If a module has features in 🚧 **with a `status.md`** (genuine in-progress work), continue via `/b-feature <name>`.
  - Else, if a module has all features ✓ but its `## Module integration` `Test:` marker is ⏸ or 🚧, recommend `/b-integration <module>` — this is the residual case the rule was designed for.
  - Else, the first ⏸ feature in the first not-yet-complete module's build order. Recommend `/b-module <module>` if remaining features are few and unambiguous, else `/b-feature <feature>`.
  - If everything is ✓ (features and module integration) and success criteria in `scope.md` are met, emit `(none — project complete)`.
- **Module integration state** — list any module where features are ✓ but the integration marker is ⏸/🚧/🟡/🔴, with the marker shown
- **Open review plans** — any module with a `review-plan.md`, shown as reconciliations done/total, with `Run /b-review <module>` to continue. An open plan means a prior review left reconciliation owed
- **Awaiting manual verification** — any feature whose `status.md` contains a `Pending verification:` line, with the checks listed
- **Open questions / blockers** — anything explicitly flagged in `status.md` files

## Output shape

Produce a single block resembling:

```
Project: <name>
Scope: <1-line summary>
Adoption: 🌱 adoption phase — <N> open questions in adoption-ledger.md   (omit line if no banner)

Progress:
  - Module A: ✓ complete
  - Module B: 🚧 2 of 4 features built (working: <feature>)
  - Module C: ⏸ not started

Currently in progress:
  - <module>/<feature> — <one-line state>

Adopted (unverified):                          (adoption phase only; omit otherwise)
  - <module>/<feature> — as-built, not yet verified

Degraded / blocked:
  - (none) | <module>/<feature> — <reason>

Module integration:
  - (none pending) | <module> — Test: <path or "not yet defined"> <marker>

Open review plans:
  - (none) | <module> — 2 of 5 reconciliations done — Run /b-review <module>

Awaiting manual verification:
  - (none) | <module>/<feature> — <pending check>

Recommended next action:
  - <literal slash command, e.g. /b-feature <name>, /b-module <name>, /b-integration <module>, or "(none — project complete)">

Open questions:
  - (none) | <item from status.md>
```

Keep it tight. This is a dashboard, not a report.

<critical_constraints>
## What NOT To Do

- Do not write, edit, or create any file — this command is strictly read-only
- Do not run `AskUserQuestion` — no interaction
- Do not run `git` commands
- Do not regenerate `docs/index.md` — that's `/b-index`
- Do not infer project state from source code — trust the docs; if they're stale, that's a separate concern for the user
- Do not propose architectural changes or new features
- Do not expand the output beyond the shape above
</critical_constraints>
