# Bower Framework — Contributor Instructions

**You are working on the Bower framework itself, not a project built with it.** This repo is the source: project-facing guidance, the `/b-*` skills, three subagents, and `_bower/`. Projects consume it by running the scaffold; they never edit it.

Since v0.33 the framework ships to **Claude Code and OpenAI Codex** from one canonical source tree, `skills-src/`. Four adapter trees are *generated* and checked in.

This file is the contributor instructions for **both runtimes** — Codex reads it directly, Claude Code reaches it through `CLAUDE.md`, which is a one-line `@AGENTS.md` shim. That mirrors what the scaffold gives projects, and it exists because the alternative was discovered the hard way: contributor rules in a Claude-only `CLAUDE.md` are invisible to Codex, which then has nothing telling it the first rule below.

## Rules that bite

- **Never invoke `/b-*` on this repo.** They target Bower *projects*; there is no `docs/modules/`, `architecture.md` or `scope.md` here. Edit framework files directly.
- **Never hand-edit a generated adapter** (`.claude/commands/`, `.claude/agents/`, `.agents/skills/`, `.codex/agents/`). Edit `skills-src/`, run `node scripts/build-adapters.cjs`, commit both. `--check` is a release gate, so a hand edit fails the release.
- **Every framework change gets a `_bower/changes.md` entry** — prepend a versioned section (newest first) *and* add a row to the `## Version index` table (version, date, one-line summary, migration class: `none` / `mechanical` / `judgement`).
- **The version string lives in four places — bump all four in one commit.** `_bower/VERSION` (canonical, unprefixed, read by tooling), then the top headings of `_bower/framework.md`, `README.md`, and the new `changes.md` section. The last three are labels nothing reads, which is why they get forgotten — README's especially. Check: `grep -rn 'v0\.[0-9]*' README.md _bower/framework.md | head -2` against `cat _bower/VERSION`.
- **Two further copies fail the release rather than just looking stale.** `_bower/viewer/lib/extract.cjs`'s `SCHEMA_VERSION` must equal `_bower/VERSION` at every release, schema change or not — `scripts/release.sh` compares them. Bumping it means bumping `tools/viewer-test/fixture{,-adoption,-obsolete}/_bower/VERSION` too.
- **The project-facing instruction files here are templates.** Projects receive four `_bower/project-*` files, each seeded **only if absent** and never edited again: `project-AGENTS.md` (router directive + code-standards heading), `project-CLAUDE.md` (two-line shim), `project-settings.json`, `project-codex-config.toml`. Change project guidance in `_bower/framework.md`. `project-*` is the scaffold's exclusion glob, so a new template is excluded by naming it.

## Skills are generated — edit `skills-src/` only

Sixteen sources (13 commands, 3 agents), each a runtime-neutral body plus a metadata header. `node scripts/build-adapters.cjs` emits 32 files:

| Generated | From | Transformation |
|---|---|---|
| `.claude/commands/<n>.md` | `skills-src/commands/` | YAML `description:` (+ `argument-hint:` if the source has `arguments:`); `<!-- bower:arguments -->` becomes the `$ARGUMENTS` binding line |
| `.agents/skills/<n>/SKILL.md` | `skills-src/commands/` | Standard Agent Skills frontmatter (`name`, `description`) only — never a Claude extension; the marker becomes invoking-message wording |
| `.claude/agents/<n>.md` | `skills-src/agents/` | `tools:` from `role:`; body verbatim |
| `.codex/agents/<n>.toml` | `skills-src/agents/` | `sandbox_mode` from `role:`; body as escaped `developer_instructions = """…"""` |

- **Bodies stay runtime-neutral.** No tool names, no `AskUserQuestion`, no literal `$ARGUMENTS` — the generator's deny-list lint fails the build on all three. A workflow names the *idiom* (operator gate, batch gate, delegate, the request, handoff spelling); mechanics live in exactly one place, `_bower/framework.md` → *Runtime bindings*. Never restate a binding in a skill; never branch on runtime in a body.
- **The skill directory name is the invocation name.** `skills-src/commands/b-feature.md` → `.agents/skills/b-feature/`, invoked `$b-feature`. Frontmatter `name:` must equal the stem; the lint enforces it.
- **Run `node tools/adapter-test/run.cjs`** after touching the generator.
- **`b-*` and `bower-*` are framework-owned namespaces** in a project's `.agents/skills/` and `.codex/agents/`. The scaffold replaces and prunes within them only.

## Changelog entries are terse; migration notes are not

`_bower/changes.md` is scaffolded into every project and read by `/b-upgrade`, so length has a real cost. Per sub-change: one short paragraph on what changed and why, then a bulleted file list with a clause each. That is the whole budget.

Never put in an entry: **process narrative** (how it was found, what was surveyed, what was rejected), **extended rationale** (that goes in `_bower/rationale.md`, with a one-clause pointer from the entry), comparisons to earlier versions, or restatements of `framework-reference.md`. If asked to trim an entry, cut prose and leave the migration notes and file list intact.

**`### Migration` is exempt from all of the above** — `/b-upgrade` executes those notes in a downstream project, so verbosity there is functional:

- **Self-contained.** No "see v0.10's note" — `/b-upgrade` reads one version at a time, so a cross-reference dangles.
- **Written for a model.** Name the files to read, what to look for, what to write. "Update `architecture.md`" is too vague; "for each module under `docs/modules/`, read its `module-status.md` … add a `## Software architecture` section with one entry per module covering purpose, boundary and dependencies" is the shape.
- **Say "none" explicitly** when there is no project-side work: `None — no project-side changes required.` Silence is ambiguous.
- **Distinguish mechanical from judgement** work, because `/b-upgrade`'s self-assessment depends on knowing where discretion was used.
- **Inline anything not scaffolded.** Referencing `_bower/brief-schema.md` is fine; referencing a framework-repo-only file is not.
- **Ask the user when uncertain** — a bad note compounds across every project that upgrades after it.

Historical entries (v0.8–v0.12, in `docs/changes-archive.md`) use `**Migration notes**` paragraphs; the skill tolerates it. Use the subheading form going forward.

**Archiving.** `_bower/changes.md` cannot grow without bound; v0.8–v0.19 went to `docs/changes-archive.md` in v0.25. Cut again only when it passes ~500 lines **and** a version marks a genuine architectural break — size alone splits entries that still explain the current design. Agree the cut point with the user. Then: **move entries verbatim** (an archived note's value is being the exact instruction a past upgrade followed); archive into `docs/`, never `_bower/`, which the scaffold copies wholesale; move the matching `## Version index` rows; and **update the boundary version in `skills-src/commands/b-upgrade.md`** (Step 3.5 and Step 6a, currently v0.19/v0.20) or the skill looks in the wrong file. Prefer merging a second cut into the existing archive to inventing a second path.

## Changing a document schema? Check the viewer.

`_bower/viewer/` parses Bower's schemas, so a schema change can break it — **silently**, emitting plausible wrong findings rather than crashing. v0.26 moved the feature roster out of `architecture.md`, nothing updated the viewer, and its drift report became 48 spurious warnings on a real project.

Whenever you change what a Bower document looks like — a section name, a marker's meaning, a frontmatter field, a table's shape, where a fact lives — do three things in the same commit:

1. **Read `_bower/viewer/README.md`'s "Schema contract" table** and grep it for the section you are editing. If your change touches a row, it touches the viewer.
2. **Update `_bower/viewer/lib/extract.cjs`** and bump `SCHEMA_VERSION` to the version you are cutting. A check testing the old shape will fire on every conformant project.
3. **Run `node tools/viewer-test/run.cjs`.** The expected finding set is exact. Adjust fixtures only when a schema genuinely changed — never to make a red test green.

Before releasing a schema change, also point the viewer at a real project (`node _bower/viewer/serve.cjs --root ../some-project`) — fixtures prove each check, only real data proves the parser survives.

The viewer is **human-facing by deliberate choice**: no `/b-*` command consumes it. Do not wire one in without discussing it; that would make its output a contract. See `_bower/roadmap.md`.

## Changing gate or delegation wording? Re-run the conformance scenarios.

`docs/conformance/` holds eight behavioural scenarios, written pass criteria, and an append-only ledger (`runs.md`). It is where the README's tier claims are defined, evidenced, and caveated. Not scaffolded.

**The demotion rule: any version that changes gate or delegation text must re-run C3 and C8 before repeating a tier claim.** In those two the wording *is* the mechanism — C3 is the gate contract under adversarial non-answers, C8 the conversational batch walk. "Gate or delegation text" means `_bower/framework.md` → *Runtime bindings*, any skill's gate wording, any agent definition's interaction constraints, or the generator's handling of them. A prose tidy elsewhere does not trigger it.

The rule is **per-runtime** — C8 is Codex-only, so a Claude claim is discharged by C3 alone. And it has a floor: **a tier whose evidence set is incomplete must say so where the tier is claimed**, in `docs/conformance/README.md` and the public README both. Claude Code's `supported` is the live instance — it predates the suite and owes C1, C2, C4, C5. Do not tidy that caveat away while rows are owed; check `runs.md` first.

Nothing mechanical can catch a stale tier claim, since it is prose. That is why the rule is written here.

Runs cost real tokens (~13k–60k per exec check) and half need an operator at a terminal. Batch them: one fixture from `tools/conformance/make-fixture.sh`, every scenario that fits, scored together. Never run the suite as a smoke test — `tools/adapter-test/` and `tools/scaffold-test/` are for that.

## Filing issues on this repo

Issues post under the maintainer's account, so they carry conventions rather than improvisation.

- **Draft, show, then post.** "File an issue about X" authorises the issue, not a particular text.
- **Carry the evidence, not the complaint** — the symptom as observed, the code or instruction that causes it, why it is that way, and the fix options. The expensive thing to reconstruct later is what was observed.
- **Attribute agent analysis.** Existing form: *"Investigated by Claude Code (Opus 5) in a &lt;repo&gt; session; reviewed and posted by me."* A reader needs to know; the account does not tell them.
- **The issue tracks; `_bower/roadmap.md` holds the reasoning.** Summarise and point. An issue body is the copy that goes stale.
- **A downstream finding routes upstream as evidence**, never as a local fix to that project's vendored `_bower/`.

## Framework reference

Read before changing framework behaviour:

- `_bower/rationale.md` — why Bower works this way. Design principles and the reasoning behind structural choices.
- `_bower/changes.md` — versioned log, v0.20 onward, newest first behind a `## Version index`. Scaffolded, so size costs.
- `docs/changes-archive.md` — v0.8–v0.19 verbatim, not scaffolded; `/b-upgrade` reads it from its clone. Never add here.
- `_bower/roadmap.md` — deferred work and revisit triggers. Check before proposing new work; update when deferring.
- `_bower/framework.md` — the project-facing router, loaded every session by both runtimes. Keep lean. Its `## Runtime bindings` is the **only** place a tool name may appear.
- `_bower/framework-reference.md` — detailed project-facing specs, loaded on demand.
- `_bower/brief-schema.md`, `_bower/review-schema.md` — the analyst's and reviewer's output schemas.
- `_bower/VERSION` — canonical version, single line, no `v` prefix.
- `docs/conformance/` — scenario specs, tier rules, run ledger. Read its `README.md` before claiming anything about a runtime.
- `docs/codex-support.md` — the v0.33 spike findings, kept as cited evidence for pre-suite ledger rows. Historical; superseded by `rationale.md` → *One Contract, Two Runtimes* and by `runs.md`.
- `docs/gate-audit-v0.33.md` — per-site audit of the v0.33 neutralisation pass; currently cited as one ground of the Claude Code tier claim.

## Repository layout

```
skills-src/        CANONICAL, hand-edited, not scaffolded — commands/ (13) + agents/ (3)
_bower/            Scaffolded into projects. Router, reference, schemas, changelog,
                   roadmap, rationale, VERSION, project-* templates, viewer/
.claude/           GENERATED — commands/ + agents/
.agents/skills/    GENERATED — <n>/SKILL.md
.codex/agents/     GENERATED — <n>.toml
scripts/           build-adapters.cjs (--check is a release gate), scaffold.sh,
                   scaffold.ps1, release.sh
tools/             Not scaffolded. viewer-test/ (3 fixtures), adapter-test/,
                   scaffold-test/ (run.sh + PS1-PARITY.md), conformance/
docs/              Not a Bower project's docs/. External-reader material,
                   changes-archive.md, conformance/, and the v0.33 records above.
```

## Scaffolding a project from this repo

`scripts/scaffold.sh <target>` (or `.ps1`) copies `_bower/` and all four adapter trees. Both scripts are kept in lockstep; `tools/scaffold-test/run.sh` asserts it and re-runs the matrix under `pwsh` when one is on PATH.

- **Preflight first.** Every managed directory is probed for writability; on any failure the script names the paths and exits 1 with **zero writes**. Codex mounts an existing `.agents/`/`.codex/` read-only and fails the write outright rather than prompting, which would otherwise leave the two adapter footprints on different versions.
- **`_bower/` is refreshed and pruned** — anything no longer shipped is removed and named, except the project-owned `VERSION` and `SOURCE`. Directories are replaced wholesale.
- **The adapter trees are namespace-scoped** to `b-*` and `bower-*`; nothing outside them is touched, since a project may keep its own skills in `.agents/skills/`.
- **Instruction and config files are seeded only if absent**, then project-owned forever: `AGENTS.md`, `CLAUDE.md`, `.codex/config.toml`, `.claude/settings.json`, `_bower/VERSION`, `_bower/SOURCE`. A preserved file that does not reach the router ends the run with an `ACTION REQUIRED` block quoting the exact lines — it never writes them.
- **It moves files only.** No migration notes, no `VERSION` bump; that is `/b-upgrade`. Never touches the target's `docs/`, `.claude/settings.local.json`, or anything outside the framework footprint.

## Releasing a framework version

Releases are manual: after a version-bump commit hits `main`, run `scripts/release.sh` (`--dry-run` to preview). It reads `_bower/VERSION`, extracts the matching `## vX.Y — DATE` section from `_bower/changes.md` as the release notes, and tags `origin/main`'s HEAD — so push the version commit first, and don't push follow-ups ahead of it. It aborts if the tag exists or the changelog section is missing.

Five gates run before tagging: viewer test plus the `SCHEMA_VERSION` equality check, `build-adapters.cjs --check`, the adapter test, the scaffold test, and PowerShell parity. The three `node` ones skip with a warning if `node` is absent.

The parity gate exists because `scaffold.ps1` is maintained by hand and is only ever *executed* by the scaffold test's parity case, which needs `pwsh` on PATH. It demands either a real parity run in the release environment or a PASS row naming the version in `tools/scaffold-test/PS1-PARITY.md`, and aborts with neither. **Install PowerShell wherever you work on this repo** and it satisfies itself. Touching either scaffold script means running the parity case.

Tags are `vX.Y`; `_bower/VERSION` stays unprefixed. Don't backfill earlier versions — one notification per version is noise.

Release tooling changes do not warrant a `_bower/changes.md` entry: nothing downstream experiences them. The same goes for this file.
