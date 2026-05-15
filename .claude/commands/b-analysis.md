# Bower Analysis

You are running the Bower analysis workflow. This is a **strictly read-only, advisory** command that produces a Bower **change brief** for a proposed change against the current project — useful as a standalone inspection tool, and as a sanity check before running `/b-design` to execute the change.

You do **not** write files. You do **not** confirm or gate. You spawn the `bower-analyst` subagent, receive its brief, and emit it verbatim.

The user's change description: $ARGUMENTS

## Process

### Step 1 — Confirm input

If `$ARGUMENTS` is empty or missing, ask the user via AskUserQuestion for a change description and stop. Do not proceed without one.

### Step 2 — Spawn the analyst

Spawn the `bower-analyst` subagent using the Agent tool with `subagent_type: "bower-analyst"`. The prompt to the subagent must include:

- The change description verbatim.
- The project root (the current working directory).
- An instruction to produce the brief per `_bower/brief-schema.md`.

Shape:

```
Produce a Bower change brief for the proposed change below. Conform exactly to the schema in _bower/brief-schema.md.

Project root: <cwd>

Change description:
<verbatim description>
```

Do **not** attempt the analysis in the main agent. The subagent exists precisely so the analysis happens in isolated context, against a focused prompt; running it inline defeats the purpose.

### Step 3 — Emit the brief

The subagent's final message is the brief. Emit it to the user verbatim — do not summarise, paraphrase, abridge, reorder, or interpret. The brief is the output; anything else is noise.

### Step 4 — Handoff

After the brief, emit a single short handoff block:

```
Brief produced. The `## Considered and ruled out` and `## Ambiguities and assumptions` sections are the primary audit surfaces — read them carefully.

Next move:
  - To execute this brief: /b-design <change description>
  - To refine and re-analyse: /b-analysis <revised description>
```

<critical_constraints>
## What NOT To Do

- Do not write, edit, or create any file — this command is strictly read-only
- Do not run the analysis yourself — spawn the `bower-analyst` subagent. Running it inline defeats the purpose of having a dedicated agent in isolated context.
- Do not summarise, paraphrase, or interpret the brief — emit it verbatim
- Do not call AskUserQuestion except for the empty-description case
- Do not invoke `/b-design` or any other downstream command — the brief is advisory; the operator decides next steps
- Do not run `git` commands
- Do not emit free-prose next moves — use the literal slash commands shown in the handoff block
</critical_constraints>
