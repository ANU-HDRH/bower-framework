# Bower Upgrade

You are running the Bower framework upgrade workflow in a **project** (not in the framework repo itself). This command:

1. Clones the Bower framework repo into a temp directory.
2. Runs its `scripts/scaffold.sh` (or `scaffold.ps1`) against this project to refresh `_bower/` and `.claude/`.
3. Walks each intermediate version's migration notes in order, applying them step-by-step and bumping `_bower/VERSION` after each.

Artifacts jump to the latest framework version in one scaffold pass; only `VERSION` moves step-by-step as migrations apply. This is intentional — see `_bower/changes.md` for the per-version migration notes that drive each step.

The user's optional argument: $ARGUMENTS

## Important Behavioural Rules

- **Refuse to run on a dirty working tree.** If `git status --porcelain` returns anything, abort and tell the user to commit or stash first. The whole upgrade is recoverable via `git reset --hard` only if there's a clean baseline to return to.
- **Walk versions sequentially.** Apply migration N's notes, finish it (bump VERSION, optionally commit), then start migration N+1. Never read multiple versions' notes into a single plan — each step's plan is derived from exactly one version's section in `_bower/changes.md`.
- **Migration notes can be empty or "none".** Many versions have no migration work. Acknowledge and proceed.
- **Self-assess at the end.** This data isn't structured, so we don't have a deterministic validator. After all steps, write a candid paragraph on how confident you are that each migration landed correctly — what was clean, what required judgement, what the user should eyeball. The user decides whether to `git reset --hard` based on your assessment.
- **You are running in the project, not the framework repo.** Do not edit the cloned framework. Edit project files only.

## Step 1: Preconditions

1. Run `git status --porcelain`. If the output is non-empty, stop. Tell the user the upgrade requires a clean working tree (so `git reset --hard` remains a valid escape) and recommend `git stash` or a commit. Do not proceed.
2. Read `_bower/VERSION` from the project. If the file is missing, the project predates the VERSION convention — use AskUserQuestion to ask the user what version their project is currently on (offer the versions from the heading lists you gather in Step 3 — those cover both the current-era changelog and the archive). Stop and wait for their answer before proceeding.
3. Read `_bower/SOURCE` from the project for the framework repo URL. If missing, use AskUserQuestion to ask the user for the framework repo URL (default suggestion: `https://github.com/ANU-HDRH/bower-framework.git`).

## Step 2: Clone the framework

Clone shallow into a unique temp directory:

```
git clone --depth 1 <SOURCE_URL> /tmp/bower-upgrade-$$
```

(Use `mktemp -d` or a timestamped path if `$$` isn't available — the path just needs to be unique and writable.) Remember the path; you'll need to clean it up at the end.

If the clone fails (network, auth, bad URL), surface the error to the user and stop.

## Step 3: Determine the upgrade plan

1. Read `<clone>/_bower/VERSION` — this is the new version.
2. List the version headings — **do not read `changes.md` whole.** It is the source of truth for migration notes, but you only need the heading list at this point, and you will read individual sections one at a time in Step 6:

   ```
   grep -n '^## v[0-9]' <clone>/_bower/changes.md
   ```

   This gives each version and its starting line number. Keep the line numbers — Step 6a uses them to read exactly one version's section.
3. Compare:
   - If `new == old`: tell the user "Already at v<old>" and stop. Clean up the temp dir.
   - If `new < old` (project is newer than framework remote — possible if the user is on a fork or a dev branch): stop with a confused message; do not proceed.
   - If `new > old`: continue.
4. From the heading list, take the ordered `vX.Y` versions strictly above `old` and up to and including `new`. This is the list of migration steps. E.g. project at v0.10, framework at v0.13 → steps = [0.11, 0.12, 0.13].
5. **If any step version is absent from the heading list, it is archived.** Versions at or below v0.19 live in `<clone>/docs/changes-archive.md`, which is not scaffolded into projects. Run `grep -n '^## v[0-9]' <clone>/docs/changes-archive.md` to get its heading list too, and note for each step which of the two files carries it. If a step version appears in neither file, stop and tell the user — the version is unaccounted for and guessing at its migration is worse than not upgrading.

## Step 4: Decide commit cadence (only if multi-step)

If the step list contains more than one version, use AskUserQuestion to ask:

> The upgrade spans N version steps (v0.X → v0.Y → ...). Commit between each step, or do all steps and commit at the end?

Options:
- **Commit between each step** — Each version's changes land as a discrete commit (`bower: migrate vX.Y → vX.Z`). Easier to bisect, easier to partially `git reset` if one step misbehaves.
- **Commit at the end** — One commit covers the whole upgrade. Simpler history.

If the list is a single step, skip this question — the user can commit when they're satisfied.

## Step 5: Run the scaffold script

Run the scaffold from the clone against the project's working directory:

```
bash <clone>/scripts/scaffold.sh <project-root>
```

(On Windows, run `scaffold.ps1` instead.)

This refreshes `_bower/` (except `VERSION` and `SOURCE`, which the scaffold preserves) and `.claude/agents`/`.claude/commands`. The project's `_bower/VERSION` is still at the *old* value at this point — that's intentional. You own VERSION writes from here on.

**Note:** The scaffold just rewrote `.claude/commands/b-upgrade.md` (this skill). The new version takes effect on the next `/b-upgrade` invocation; this run continues with the instructions already in your context.

## Step 6: Walk migration steps

For each version in the step list, in order, oldest first:

### 6a. Extract migration notes for this version

Read **only this version's section** — not the whole changelog. Use the heading line numbers from Step 3: the section runs from this version's `## v<X.Y>` line to the line before the next `## v<X.Y>` heading. For the oldest entry in a file, it runs to the `## Earlier versions` pointer if the file has one, otherwise to end of file. Read that range with the Read tool's `offset` and `limit`:

- **Current-era versions (v0.20 and above)** are in the project's now-updated `_bower/changes.md`.
- **Archived versions (v0.19 and below)** are in `<clone>/docs/changes-archive.md`, which the scaffold does not copy into projects. Read them from the clone. The project's `_bower/changes.md` carries a version index covering them, but not their bodies.

Either way the result is the version's full entry — what changed, why, and the migration notes. Reading one section at a time is deliberate: it keeps the migration you're applying the only one in context, and it means the changelog's total size never bounds an upgrade.

Identify the migration content within that entry. Contributors write it under a `### Migration` subheading or a `**Migration notes**` bold paragraph (older entries). If the section is absent, "none", or describes no project-side work, treat the step as a no-op — just bump VERSION (and optionally commit) and continue.

### 6b. Plan

Read any project files the migration notes reference (e.g. `docs/architecture.md`, `docs/modules/*/module-status.md`). Produce a concrete plan:

- Exact files you'll edit or create.
- For each file, the specific change in plain language (not a diff — the user is reading this to decide, not to review syntax).
- Any judgement calls you're making (the notes were written for a model audience but still leave room for interpretation — name those calls).

### 6c. Gate

Present the plan via AskUserQuestion. Frame as: "Here's the plan for migration v<X.Y>. Confirm to apply, or tell me what to adjust."

Options:
- **Apply this plan** — proceed to execution.
- **Adjust** — user gives free-text feedback; revise and re-gate.
- **Skip this step** — apply no changes for this version but still bump VERSION (use sparingly; the user is overriding the migration notes).
- **Abort upgrade** — stop now. Tell the user the temp clone path so they can clean it up, and remind them `git reset --hard` reverses any committed steps.

### 6d. Execute

Apply the edits. Edit project files directly. Do not edit the cloned framework.

### 6e. Bump VERSION

Overwrite `_bower/VERSION` with this version's number (just the number, no `v` prefix, with a trailing newline to match the framework's format).

### 6f. Optional commit

If the user chose "commit between each step" in Step 4, commit now:

```
git add -A
git commit -m "bower: migrate v<old> → v<new>"
```

(Use the actual old/new strings.) If the user chose "commit at the end" or this is a single-step upgrade, do not commit yet.

## Step 7: Final summary and self-assessment

After all steps complete:

1. **Clean up** the temp clone directory (`rm -rf <clone>`).
2. **Emit a self-assessment.** Be candid. For each step:
   - What you applied.
   - What was mechanical vs. what required judgement.
   - Anything the user should sanity-check by eye (a file you weren't sure about, a backfill where the source data was thin, a decision the notes left to your discretion).
3. **Emit the handoff block** with the literal commands for what to do next:

```
Bower upgrade complete: v<old> → v<new>

Self-assessment:
  <candid paragraph per step or overall>

Next move:
  - If everything looks right: commit (if you chose end-of-run commits) and continue your work.
  - If something looks wrong: `git reset --hard <baseline-ref>` to undo, then investigate.
```

<critical_constraints>
## What NOT To Do

- Do not run if `git status --porcelain` is non-empty
- Do not read more than one version's migration notes into a single plan — walk them strictly in order
- Do not edit files in the cloned framework repo — it is read-only reference; edit the project only
- Do not auto-commit if the user chose "commit at the end" or didn't see Step 4's question
- Do not silently skip a step whose migration notes are non-trivial — if you can't interpret them, ask via AskUserQuestion rather than guessing
- Do not bump VERSION before applying the step's migrations — the bump signals the migration landed
- Do not leave the temp clone directory behind
- Do not claim a clean migration if any part required substantial judgement — the self-assessment is for the user to decide whether to `git reset`, and an over-confident assessment defeats the safety mechanism
- Do not emit free-prose next moves — use literal shell/slash commands in the handoff
</critical_constraints>
