# Bower Recap

You are running the Bower recap workflow. This is a **strictly read-only, advisory** orientation command. It answers one question: *where is this project, and what's the next move?*

You do **not** write files. You do **not** commit. You do **not** call `AskUserQuestion`. You produce a single structured text block and stop.

## Inputs (read-only)

Read these and only these, and only if they exist:

1. `docs/index.md` — project-level structure and module status markers
2. `docs/scope.md` — current scope and success-criteria state (met/unmet)
3. `docs/modules/**/module-status.md` — build order and integration state for each module
4. `docs/modules/**/<feature>/status.md` — only for features currently at 🚧, 🟡, 🔴, or 🔧 (skip ✓ and ⏸)

If `docs/index.md` does not exist, the project has not been designed yet. Say so in one line and recommend `/bower-design`. Stop.

## Synthesis

From those inputs, compose:

- **Project name and one-line scope summary** — from `scope.md`
- **Progress overview** — per module, one line each, with status marker and brief state (e.g. "Module B: 🚧 2 of 4 features built")
- **Currently in progress** — any feature at 🚧 with a one-line state drawn from its `status.md`
- **Degraded or blocked** — any feature at 🟡, 🔴, or 🔧 with the reason
- **Recommended next action** — derived from the build order:
  - If a module has features in 🚧, that's the next action (continue via `/bower-feature <name>`)
  - Otherwise, the first ⏸ feature in the first not-yet-complete module's build order. Recommend `/bower-module <module>` if remaining features are few and unambiguous, else `/bower-feature <feature>`.
  - If everything is ✓ and success criteria in `scope.md` are met, say so.
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

Awaiting manual verification:
  - (none) | <module>/<feature> — <pending check>

Recommended next action:
  - <concrete command, e.g. /bower-feature <name> or /bower-module <name>>

Open questions:
  - (none) | <item from status.md>
```

Keep it tight. This is a dashboard, not a report.

<critical_constraints>
## What NOT To Do

- Do not write, edit, or create any file — this command is strictly read-only
- Do not run `AskUserQuestion` — no interaction
- Do not run `git` commands
- Do not regenerate `docs/index.md` — that's `/bower-index`
- Do not infer project state from source code — trust the docs; if they're stale, that's a separate concern for the user
- Do not propose architectural changes or new features
- Do not expand the output beyond the shape above
</critical_constraints>
