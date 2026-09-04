---
name: b-merge
description: Wrap a merge in either direction — pre-merge conflict-risk report, then post-merge resolution of docs/ by rule or gate, slug-collision repair, index regeneration and a coherence pass over both sides' doc changes.
---
<!-- GENERATED FILE — do not edit. Source: skills-src/commands/b-merge.md. Regenerate: node scripts/build-adapters.cjs -->

# Bower Merge

You are running the Bower merge workflow. It wraps a git merge between the current branch and one other, **in either direction** — main into a long-running branch, or a branch back into main — and does the part of a merge that git cannot: resolve `docs/` by Bower's rules, repair identifier collisions, regenerate the derived indexes, and read both sides' documentation changes for contradictions the merge introduced. Code conflicts are the operator's; this command names them and stops.

Solo projects never run this.

The request (the other branch): the request as given in the message that invoked this skill.

## Important Behavioural Rules

- **Every merge, both directions.** A synchronisation merge (main into a branch) moves the merge-base, so it is wrapped too. The request is the *other* side, whichever it is, and everything is computed from the two tips.
- **State is read from git; nothing is stored.** Whether this is a *pre* or a *post* invocation is decided by `MERGE_HEAD`, never by a file this command writes. There is no branch-start step and no per-commit hook.
- **The standard for `docs/`: a conflict is impossible by construction, resolves by one rule, or is gated.** Never "rare". Every conflicted `docs/` path is classified below and handled by its class; nothing is resolved by taking a side wholesale except derived index content, which is regenerated — the curated prose in those same files is not derived and is never side-taken.
- **Code conflicts are not this command's job.** List them, say so, stop. Resume once the operator has resolved and staged them.
- **Every write is shown before it lands.** Resolutions, renames and reference rewrites are presented at an operator gate (binding: `_bower/framework.md` → *Runtime bindings*); the operator can decline any of them and do it by hand.
- **This command never commits.** *Pre* writes nothing at all. *Post* leaves the merge staged and uncommitted so the operator inspects it and commits; `git merge --abort` is always available until then and undoes everything.
- **Literal-command handoff.** Every "next move" names the exact command or git line to type, never free prose.

## Step 0: Read the state

1. **Resolve the other side.** The request names the other branch or ref (`main`, `feature/x`, `origin/main`). Check it resolves (`git rev-parse --verify <other>`). If the request is empty or the ref does not exist, stop and ask — there is no default other side.
2. **Decide the mode** from the repository, in this order:
   - `git rev-parse -q --verify MERGE_HEAD` succeeds → **post** (Step 2). Confirm `MERGE_HEAD` equals `<other>`'s tip; if not, say so and stop — the merge in progress is with a different branch.
   - No `MERGE_HEAD`, and `HEAD` has two parents (`git rev-parse -q --verify HEAD^2`) one of which is `<other>`'s tip → **committed early**: the operator committed the merge, or merged without `--no-commit`. Run Step 2's coherence pass over `HEAD^1` and `HEAD^2` (Step 2.6), report collisions (Step 2.4) as ordinary edits to make, and skip conflict resolution — there is nothing left in a conflicted state.
   - No `MERGE_HEAD`, clean tree (`git status --porcelain` empty) → **pre** (Step 1).
   - No `MERGE_HEAD`, dirty tree → stop. Ask the operator to commit or stash first: a merge onto uncommitted work makes `git merge --abort` unable to restore it.
3. **Compute the two sides.** `base = git merge-base HEAD <other>`. **A** = paths changed in `base..HEAD` (`git diff --name-status <base> HEAD`); **B** = paths changed in `base..<other>` (`git diff --name-status <base> <other>`). In *post*, `HEAD` is still the pre-merge tip and `MERGE_HEAD` is `<other>`, so the same two commands apply. If `<other>` is already an ancestor of `HEAD`, there is nothing to merge — say so and hand off to `/b-recap`. If **A** is empty (`base` is `HEAD`), a fast-forward is safe and *post* would have nothing to do — emit `git merge --ff-only <other>` and then `/b-recap`.

## Classifying a `docs/` path

Every `docs/` path that both sides touched, and every conflicted `docs/` path, is one of four classes. The class decides the resolution; the operator is asked only for the last.

| Class | Paths | Resolution |
|---|---|---|
| **Derived** | The derived parts of `docs/index.md` and `docs/adr/index.md` — module and ADR tables, status markers, accepted/superseded counts, link targets (everything `/b-index` recomputes) | A conflict block that lies wholly inside derived content: take either side, run `/b-index` before commit. Never merge the text. A block touching **curated** content — documentation maps, schema prose, legend tables, anything `/b-index` preserves — is not derived and is resolved as *headed unit* or *genuinely shared* like any other. |
| **ID namespace** | New files under `docs/adr/`, new `docs/modules/<module>/` directories, new `Q-<slug>` items in `findings.md` | Both land; nothing to resolve. Same *name* on both sides is a **slug collision** (Step 2.4). |
| **Headed unit** | `docs/ui.md` `####` regions; `docs/architecture.md` `### <module>` entries under `## Software architecture` — one owner and its own heading each | **Additive shape** — both hunks are whole units (each begins at a heading of that level and ends before the next) → keep both, the current branch's first. Any other shape → gated. |
| **Genuinely shared** | Everything else — `scope.md`, `constitution.md`, `architecture.md` narrative and `## Data flow` sections, the same feature's `plan.md` / `status.md`, the same `module-status.md`, the same `####` region, the same `findings.md` item | **Operator gate.** Both hunks shown in full, ownership named as a hint about who to ask, never as a rule for which side wins. |

Ownership hints come from the path (`docs/modules/<module>/…`), from a region heading's `— <module>` suffix, or from `architecture.md`'s `### <module>` heading. `docs/ui.md` sections other than `## Screens`, and every co-authored or human-owned central doc, have no single owner — say so rather than inventing one.

## Step 1: Pre — report and hand over the merge line

No writes. Compute from **A** and **B**:

1. **Distance.** `git rev-list --count HEAD..<other>` and `git rev-list --count <other>..HEAD` — how far each side is ahead of the base. Name both; a large number on the incoming side is the reason to sync more often, and worth saying once.
2. **Conflict-risk set — A∩B.** Every path both sides changed, classified per the table above. Code paths are listed as *code — resolved by you*. For each `docs/` path give the class and what *post* will do with it, so the operator knows before merging what will be automatic and what will be a question.
3. **Slug collisions.** Files added under `docs/adr/` on both sides, **excluding `docs/adr/index.md`** — it is derived, and two branches each writing a project's first ADR both create it (`git diff --diff-filter=A --name-only <base> <side> -- docs/adr/ ':!docs/adr/index.md'`), intersected by filename; the `id:` of every added ADR on each side, intersected; new `Q-<slug>` lines added to any `findings.md` on both sides (`git diff <base> <side> -- 'docs/modules/*/findings.md'`, lines beginning `+- [ ] Q-`), intersected by slug. Report each collision as *two decisions with one name, or one decision recorded twice — resolved at a gate after the merge*. Two identical files merge clean and are still a collision worth naming.
4. **Migration hint.** If a directory that holds numbered migrations (per `docs/constitution.md`'s migrations convention, if it has one) appears in A∩B or gained files on both sides, say so: the branch author renumbers above the other side's highest and regenerates the journal with the tool, per the constitution. This command does not renumber.
5. **Emit the merge line**, exactly:

   ```
   git merge --no-ff --no-commit <other>
   ```

   `--no-commit` so that *post* always has an inspectable, uncommitted merge state, clean or conflicted. Then: `Run /b-merge <other>` again once the merge command has run, whatever it reports. State that `git merge --abort` returns to exactly this point at any time before the commit.

Close with the report, the two lines, and stop. Do not run the merge yourself.

## Step 2: Post — resolve, repair, regenerate, read

Open with the recovery line, every time: *`git merge --abort` returns the branch to its pre-merge state; nothing is lost until `git commit`.*

### 2.1 Code conflicts stop the run

`git diff --name-only --diff-filter=U` lists unresolved paths. Every path outside `docs/` is code (or project config, which is the same to this command). If any exist, list them, say that resolving them is the operator's work, and stop with: resolve each, `git add` it, then `Run /b-merge <other>`. Do not touch `docs/` conflicts while code conflicts remain — the operator may abort.

### 2.2 Resolve `docs/` conflicts by class

For each conflicted path under `docs/`, in the order of the class table:

- **Derived.** Read every conflict block in the index file. If all of them lie inside derived content (a table row `/b-index` recomputes, a marker, a count, a link target), take the current branch's side (`git checkout --ours -- <path>`), stage it, and note it for regeneration in 2.5. This is the one place a side is taken wholesale, and it is safe only because `/b-index` rewrites every derived value. Do it without a gate; say what was done. If **any** block touches curated content, do not take a side: resolve the derived blocks by keeping either text (they will be recomputed) and the curated blocks by the *headed unit* or *genuinely shared* rule — two whole sections added at one point keep both; the same prose edited twice is gated. `/b-index` preserves curated structure from the file it finds, so a curated hunk dropped here is dropped for good.
- **ID namespace.** An add/add conflict on `docs/adr/<slug>.md` or a conflicted `findings.md` whose conflicting hunks are both *new* `Q-<slug>` items with different slugs: keep both (in `findings.md`, both items, current branch's first), stage. If the conflicting ADR files or items share a slug, that is a collision — leave it conflicted and handle it in 2.4.
- **Headed unit, additive shape.** Read the conflict block. If each side's hunk is one or more whole `####` regions (in `ui.md`) or whole `### <module>` entries (in `architecture.md`) — starts at a heading, ends before the next heading of that level, no partial unit — write both, current branch's first, remove the markers, stage. Say which units landed from which side.
- **Everything else — operator gate.** Present one gate per conflicted file, and where a file has several conflict blocks, walk them as a **batch gate** (binding: *Runtime bindings → Batch gates*). For each block show both hunks in full — never a summary — with the ownership hint. Offer: *keep this branch's* / *keep the other side's* / *this combined text* (propose one only when the two hunks are compatible and you can show the exact merged text) / *I will resolve it by hand*. Write nothing until the operator chooses; on *by hand*, leave the markers in place and note the path in the handoff. Stage each resolved file.

Never take `--ours` or `--theirs` on a non-derived `docs/` path, and never resolve a `docs/` conflict by deleting the lines you do not understand. Where a hunk's meaning needs the whole file, read the file — the diff is the scope, not a cage.

**Nothing below runs while a path is still conflicted.** After this step, re-run `git diff --name-only --diff-filter=U`. If any path remains — an *I will resolve it by hand* answer, a collision the operator wants to rename themselves, anything you could not classify — stop here with a handoff naming each path: resolve it, `git add` it, then `Run /b-merge <other>`. The next invocation finds `MERGE_HEAD` still present, sees no conflicted paths, and continues from 2.4. An index regenerated, or diffs read, over a tree that still carries conflict markers is wrong output that looks right.

### 2.3 Transient files

`review-plan.md` and `findings.md` conflicts are resolved above like any other, with one rule of their own: two ticks or dispositions on the **same** item are a genuinely shared conflict, gated as such. A tick on one side and a brief edit on the other is usually compatible — propose the combined text.

### 2.4 Slug collisions — repaired here, at a gate

Recompute the collision set from Step 1.3 (the merge state is where both sides are visible and nothing is committed). Also include any add/add conflict on `docs/adr/<slug>.md` left from 2.2. **An add/add collision is one pathname, not two files:** the working tree holds a conflict-marked composite, and the two real files live in the index stages — `git show :2:<path>` is this branch's, `git show :3:<path>` is the other side's. Read both from there, never from the working tree. When the resolution below renames a side, write that stage's content to the new path and the survivor's stage to the original path (`git checkout --ours -- <path>` or `--theirs`), then stage both — this is the one sanctioned use of `--ours`/`--theirs` outside the derived class, and it is safe only because the other side's text has already been written elsewhere. For each collision, read both files (or both items) in full and present **one operator gate** offering the two readings and a recommendation:

- **Different decisions, one name.** The operator picks the side to rename and a new slug (offer one — two or three kebab-case words that distinguish it; check `docs/adr/<new>.md` does not exist on either side). Then, for that side only: `git mv` the file, rewrite its frontmatter `id:` to `ADR-<new>`, and rewrite every `ADR-<old>` and `adr/<old>.md` reference in **that side's own changes since the base** — `git diff <base> <side>` over the whole tree, docs and code alike. That enumeration is complete: nothing older than the branch point can cite an ADR that did not yet exist. Show every file and line the rewrite will touch before touching any of it.
- **Same decision, recorded twice.** The operator picks the body that lands. The other file is dropped and its side's references re-pointed to the survivor's ID, by the same enumeration. If the survivor's body is missing something the dropped one carried, say so — but ADR bodies are immutable once accepted, so the fix is a superseding ADR later, not a splice here.
- **`Q-<slug>` collisions** have the same two readings, decided by reading both briefs. **Same drift, noticed twice** → keep one line and brief (the operator picks; recommend the fuller brief), drop the other, and fix the routed command text if it named the dropped slug. **Different drifts, one name** → keep both: give one a new slug (offer it; check the file for it) and rewrite that item's own routed command text to match. Never drop a queue item whose `Drift:` line describes something the survivor's does not. One thing **names** a queue item: a *decided, not built* annotation may carry `` `<module>/Q-<slug>` `` as its owner (`_bower/framework-reference.md` → *Forward-written claims*). After the merge both sides' annotations sit in the same files, so a working-tree grep cannot say which branch wrote one about which drift — **enumerate per side**, as the ADR rename does:

  ```
  git diff --name-only <base> <side> -- docs | grep -E 'architecture\.md$|/plan\.md$'
  ```

  Read the annotations in those files from `<side>`'s tree (`git show <side>:<path>`), owner from the marker and the two lines after it. Show every hit at the gate beside the rename, attributed to its side; re-point one naming the renamed slug to the new one, and one naming a dropped item to the survivor — each following the item its own side wrote. An annotation both diffs touch is ambiguous: show it and let the operator say which drift it meant.

Stage what changed. The operator may decline any of this and rename by hand. If so, the add/add path stays conflicted and the stop rule in 2.2 applies: end the run with a handoff naming the path and the two IDs, and do not continue to 2.5. Say plainly that **nothing downstream will catch an unresolved collision**, so the merge must not be committed until the operator has renamed one side and the path is staged.

### 2.5 Regenerate the indexes

Run `/b-index` and stage the result. If `/b-index` is not invokable in this session, say so and put `Run /b-index` first in the handoff.

### 2.6 Coherence pass — the union, not the intersection

A merge-introduced contradiction can span files no one both-touched, so this pass reads **both sides' `docs/` diffs** — `git diff <base> HEAD -- docs/` and `git diff <base> MERGE_HEAD -- docs/` (in the committed-early mode, `HEAD^1` and `HEAD^2` against their merge-base) — and asks of each hunk on one side whether any hunk on the other side contradicts it. Diffs, not whole files; read the whole file when a hunk needs it.

Look for, in particular: a boundary or module named in one side's `## Software architecture` change and assumed otherwise in the other's plan or ADR; a `scope.md` criterion added, deleted or re-pointed on one side and cited on the other; an ADR accepted on one side that the other's plan or code contradicts; a build-order marker moved on one side while the other side's `status.md` for the same feature says something else; a `Next move:` on one side pointing at work the other side finished or removed; a *decided, not built* annotation written on one side whose owner the other side moved to ✓, ticked, struck from a build order or renamed — after the merge it is stale or unowned (`_bower/framework-reference.md` → *Forward-written claims*). An annotation with no owner in either side's hunks is a candidate on its own.

Each contradiction is a **candidate finding**, reported with both hunks and both paths. Offer, at an operator gate, to record the accepted ones in the owning module's `docs/modules/<module>/findings.md` — one item per contradiction, `Q-<slug>` ID, the three-line `Location:` / `Drift:` / `Resolution:` brief written now while both hunks are in front of you, exactly as `/b-feature` Step 6.12 does and per `_bower/framework-reference.md` → *Findings queue*. Write nothing the operator did not accept. A contradiction whose resolution is architectural gets `route:/b-design`; the rest `route:/b-feature`.

**State the miss rate in the report.** This detects contradictions *between the two sides' changes*; a branch's docs can also contradict docs neither side changed, which is `/b-review`'s territory. Say so in one line so a clean pass is not read as a clean merge.

### 2.7 Handoff

The merge is staged and uncommitted. Emit a single handoff block:

```
Merge of <other> into <current>: <clean | N docs/ conflicts resolved (k by rule, m at gates) | stopped on code conflicts>
Slug collisions: <none | resolved: … | left for hand repair: …>
Indexes: <regenerated | Run /b-index first>
Coherence: <n candidates, q queued | none found> — contradictions with unchanged docs are not checked here

Next move:
  git commit                      (the merge message is prefilled; add a line if a gate changed anything)
  Run /b-recap                    (orient on the merged state)
```

If anything was left for hand resolution (2.2 *by hand*, 2.4 declined), put it above the commit line, named path by path — the operator should not commit past it unknowingly. In the committed-early mode the commit line is replaced by whatever the coherence pass and collision repair wrote: `git commit` those edits, then `/b-recap`.

## What this command does not do

Rebase; resolve code; renumber migrations (the constitution names the branch author for that); run per commit; commit the merge; decide which side of a shared paragraph is right. The last is the operator's, every time, with both texts in view.
