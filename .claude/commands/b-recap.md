# Bower Recap

You are running the Bower recap workflow. This is a **strictly read-only, advisory** orientation command. It answers one question: *where is this project, and what's the next move?*

You do **not** write files. You do **not** commit. You do **not** call `AskUserQuestion`. You produce a single structured text block and stop.

## Inputs (read-only)

Read these and only these, and only if they exist:

1. `docs/index.md` — project-level structure and module status markers
2. `docs/scope.md` — current scope and success-criteria state (met/unmet)
3. `docs/modules/**/module-status.md` — `## Build order` and `## Module integration` state for each module
4. `docs/modules/**/<feature>/status.md` — only for features currently at 🚧, 🟡, 🔴, or 🔧 (skip ✓ and ⏸)
5. `docs/modules/**/review-plan.md` — only check for existence; if present, a `/b-review` left reconciliation owed. Read its `## Reconciliations` checklist to count done/total. Do not read it for any other purpose — it is a transient work list, not project state.

If `docs/index.md` does not exist, the project has not been designed yet. Say so in one line and recommend `/b-design`. Stop.

## Synthesis

From those inputs, compose:

- **Project name and one-line scope summary** — from `scope.md`
- **Progress overview** — per module, one line each, with status marker and brief state (e.g. "Module B: 🚧 2 of 4 features built")
- **Currently in progress** — any feature at 🚧 with a one-line state drawn from its `status.md`
- **Degraded or blocked** — any feature at 🟡, 🔴, or 🔧 with the reason
- **Recommended next action** — derived from build order *and* module-integration state. Always emitted as a literal slash command (or the explicit `(none — ...)` form), never as prose:
  - If a module has features in 🚧, continue via `/b-feature <name>`.
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

Progress:
  - Module A: ✓ complete
  - Module B: 🚧 2 of 4 features built (working: <feature>)
  - Module C: ⏸ not started

Currently in progress:
  - <module>/<feature> — <one-line state>

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
