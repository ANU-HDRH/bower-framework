# Bower ADR

You are scaffolding an Architectural Decision Record (ADR) — a single-file, append-only entry in the project's decision log at `docs/adr/`. ADRs capture cross-cutting commitments: choices that constrain more than one feature and would surprise a future reader if not written down.

This command produces exactly one deliverable: a new ADR file (and, if superseding, a frontmatter update to the ADR being replaced). It does not modify code, plans, or status documents — those are the job of the command that called this one (typically `/b-feature` reconcile or `/b-design` Stage 2).

The user's description of the decision: $ARGUMENTS

## Important Behavioural Rules

- **One decision per ADR.** If you find yourself drafting "and also we decided…", that's a second ADR.
- **Bodies are immutable once accepted.** This command writes a new ADR or amends frontmatter only. It never edits an existing ADR's body.
- **Consult before writing.** Use AskUserQuestion to confirm the draft before committing it to disk.
- **Use exact Bower module names.** The `modules` field references directories under `docs/modules/`. Omit the field entirely for cross-cutting decisions; do not invent sentinels like `[*]` or `[all]`.
- **Status is `accepted`.** Bower has no `proposed` workflow — decisions are confirmed at gates before being written to disk.

## Step 1: Understand Context

1. Read `docs/adr/index.md` if it exists — confirms the next available ID and lets you check for adjacent or related decisions.
2. If no `docs/adr/` directory exists yet, this is the first ADR; the next ID is `0001`.
3. If the user's description implies superseding an existing ADR (e.g. "we're switching from Redis to in-process caching, ADR-0011 is wrong"), read that ADR's full contents.
4. Read `docs/architecture.md` and any module's `module-status.md` referenced by the decision, only insofar as needed to fill in `modules` correctly and to write a defensible `## Context` section.

Do **not** load every ADR. The point of the index is that you don't have to.

## Step 2: Determine ID and Supersession

- **ID.** Scan `docs/adr/*.md` filenames for the highest existing `NNNN-` prefix; the new ID is that number + 1, zero-padded to four digits. If the directory is empty or missing, the new ID is `0001`. IDs are immutable and never reused — gaps from deleted entries are fine.
- **Supersession.** If the user's description names an existing ADR being replaced, this is a supersession. The new ADR will carry `supersedes: [ADR-NNNN]` and the old ADR's frontmatter will be updated with `superseded-by: [<new-id>]` and `status: superseded`. Both files will be written in this command's output. The old ADR's **body is not touched**.
- **Partial supersession.** If the user describes a decision that scopes an exception to an existing ADR rather than fully replacing it (e.g. "ADR-0011 says use Postgres for all stores; this module uses ClickHouse instead"), do **not** mark the old one superseded. Both ADRs remain `accepted`. Reference the original in the new ADR's `## Context` and `## Consequences` sections.

## Step 3: Draft the ADR

Compose the file:

```markdown
---
id: ADR-NNNN
title: <Title in sentence case, matching the filename minus the ID prefix>
status: accepted
date: YYYY-MM-DD
modules: [<module-name>, ...]
supersedes: [ADR-NNNN]
---

## Context

<What's the situation that forced a decision? What constraints, observations, or
prior decisions are in play? Two or three paragraphs max. Name the problem,
don't solve it yet.>

## Decision

<What did we decide. Active voice, present tense. "We will use X." One paragraph,
maybe two. This is the load-bearing sentence — if someone reads only this section,
they should know what's true.>

## Consequences

<What follows from this decision — both good and bad. What becomes easier, what
becomes harder, what we've now committed to maintaining. Be honest about the
costs; future-you needs to know what trade-off was accepted, not just the win.>

## Alternatives considered

<What else was on the table and why it lost. Even one sentence per alternative
is enough — "Considered Redis; rejected because [reason]." This is the section
everyone skips and everyone later wishes existed.>
```

Frontmatter rules:

- `modules:` — omit the field entirely for cross-cutting decisions (do not write `modules: []`).
- `supersedes:` and `superseded-by:` — omit when empty.
- `date:` — today's date in `YYYY-MM-DD`.
- `status:` — `accepted`.

Filename: `docs/adr/NNNN-kebab-case-title.md`. Lowercase, hyphens, no punctuation, no trailing period. The kebab title should match the frontmatter title.

Body length: aim for 200–600 words across all four sections combined. If you're past a page, you probably have two decisions; surface this to the user.

## Gate: Confirm or Adjust

Present the drafted ADR to the user via AskUserQuestion. Show:

- The proposed filename and ID
- The full frontmatter
- The full body

If this is a supersession, also show the frontmatter change to the older ADR (status, superseded-by, date).

Frame as: "Here's the ADR I'd write. Confirm to commit it to disk, or tell me what to adjust."

**Do not write any file until the user confirms.**

## Step 4: Write

After confirmation:

1. Create `docs/adr/` if it does not exist.
2. Write the new ADR to `docs/adr/NNNN-kebab-title.md`.
3. If superseding, update the older ADR's frontmatter:
   - Set `status: superseded`
   - Add or extend `superseded-by: [<new-id>]`
   - Leave the body completely untouched.
4. Run `/b-index` to regenerate `docs/adr/index.md` (and `docs/index.md` if it references the ADR section). If `/b-index` is not available in this session, write a minimal `docs/adr/index.md` yourself — see schema in `b-index.md`.

## Step 5: Handoff

Emit a single short handoff block. The next move depends on context:

- If invoked from `/b-feature` reconcile: `Run /b-feature <name>` to return to the parent change. (In practice the parent command resumes automatically; the handoff is a safety net for restarts.)
- If invoked from `/b-design` Stage 2: continue Stage 2 (the parent command handles it).
- If invoked directly: `(none — ADR recorded; resume your next task)`.

```
ADR-NNNN recorded: <title> [<status>]
<Filename>
<If supersession: ADR-MMMM marked superseded.>

Next move:
  - <literal slash command, or "(none — ADR recorded; resume your next task)">
```

<critical_constraints>
## What NOT To Do

- Do not modify the body of an existing ADR — bodies are immutable
- Do not write the ADR before the gate
- Do not skip the supersession frontmatter update on the older ADR
- Do not invent sentinels for cross-cutting decisions — omit the `modules:` field
- Do not bundle multiple decisions into one ADR — one decision per file
- Do not write code, modify plans, or update status files — this command is ADR-only
- Do not emit free-prose next moves — use a literal slash command or the `(none — ...)` form
</critical_constraints>
