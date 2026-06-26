---
description: Seed Bower project state (_bower/, CLAUDE.md, VERSION, SOURCE) into the current project.
---

# Bower Init

You are seeding **Bower project state** into the current project. The `bower` plugin already
provides the `/bower:*` commands and the `bower-analyst`/`bower-reviewer` agents — those come
from the plugin and auto-update. What a project still needs in its own working tree is the
*reference state*: the `_bower/` directory, a `CLAUDE.md` that `@`-includes `_bower/framework.md`,
and the `_bower/VERSION` / `_bower/SOURCE` markers. This command lays those down.

It is deterministic — a file-seeding operation, not a judgement call. Run the plugin-bundled
scaffold in plugin mode against the current directory:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/scaffold.sh" --plugin .
```

The `--plugin` flag tells the scaffold to seed **project state only** and skip copying any
commands or agents into `.claude/` — the plugin is the source of those, and a stray in-tree
copy would shadow it. Specifically, `--plugin` mode:

- Copies `_bower/` (its reference files) into the project, **excluding** the template seeds
  (`project-CLAUDE.md`, `project-settings.json`) and preserving any existing `_bower/VERSION`
  and `_bower/SOURCE`.
- Seeds `CLAUDE.md` from `_bower/project-CLAUDE.md` **only if absent** (it `@`-includes
  `_bower/framework.md`).
- Seeds `.claude/settings.json` from `_bower/project-settings.json` **only if absent**.
- Seeds `_bower/VERSION` and `_bower/SOURCE` **only if absent**.
- Does **not** create `.claude/commands` or `.claude/agents` — the plugin provides them.

## Steps

1. Confirm `${CLAUDE_PLUGIN_ROOT}` is set (it is, when this command runs from the installed
   plugin). If it is empty, the command was not invoked through the plugin — stop and tell the
   user to install the `bower` plugin first.
2. Run the scaffold command above.
3. Report what it created versus preserved (the script prints a per-file summary), and tell the
   user the next step: run `/bower:design` to begin (new project) or `/bower:upgrade` if this
   project was previously on an older framework version.
