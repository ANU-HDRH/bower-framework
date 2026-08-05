# Bower Framework — Contributor Instructions

**You are working on the Bower framework itself, not on a project built with Bower.** This repo is the source of the framework: the project-facing guidance, the skills (`/b-*` slash commands), the three subagents, and the supporting `_bower/` reference files. Projects consume this material by running the scaffold script; they do not edit it.

Since v0.33 the framework ships to **two runtimes** — Claude Code and OpenAI Codex — from one set of canonical sources under `skills-src/`. Four adapter trees are *generated* from those sources and checked in. See *Skills are generated* below before editing any skill or agent.

## What this means in practice

- **Do not invoke `/b-*` skills on this repo.** `/b-design`, `/b-feature`, `/b-module`, `/b-integration`, `/b-adr`, `/b-recap`, `/b-analysis`, `/b-index`, `/b-spec` are all designed for *Bower projects*. This repo has no `docs/modules/`, no `docs/architecture.md`, no `docs/scope.md` — running them here is meaningless. Edit framework files directly instead.
- **Never edit a generated adapter.** `.claude/commands/`, `.claude/agents/`, `.agents/skills/` and `.codex/agents/` are build output. Edit `skills-src/`, run `node scripts/build-adapters.cjs`, and commit sources and generated files together.
- **Every framework change gets a `_bower/changes.md` entry.** Prepend a new versioned section (most recent first) describing what changed, why, and any migration notes for projects already on a previous version, **and** add a row to the `## Version index` table at the top of the file (version, date, one-line summary, migration class: `none` / `mechanical` / `judgement`).
- **The version string lives in four places — bump all four in the same commit.** In order of authority: `_bower/VERSION` (canonical, read by the scaffold script, `/b-upgrade`, and `scripts/release.sh` — unprefixed, e.g. `0.25`), `_bower/framework.md`'s top heading, `README.md`'s top heading, and the new `_bower/changes.md` section heading. The last three are human-visible labels that nothing reads, which is exactly why they get forgotten — `README.md`'s especially, since it is otherwise untouched by most framework changes. Check all four before committing: `grep -rn 'v0\.[0-9]*' README.md _bower/framework.md | head -2` and `cat _bower/VERSION`.

  Two further copies are read by *tooling* and will fail the release rather than merely looking stale. `_bower/viewer/lib/extract.cjs`'s `SCHEMA_VERSION` must equal `_bower/VERSION` at every release, whether or not a schema changed — `scripts/release.sh` compares them. And the viewer test asserts its fixtures are on the version the viewer parses, so bumping `SCHEMA_VERSION` means bumping `tools/viewer-test/fixture{,-adoption,-obsolete}/_bower/VERSION` in the same commit.
- **The project-facing instruction files are templates, not the live ones.** This file (the root `CLAUDE.md`) is contributor-only. What projects receive are the four `_bower/project-*` templates, each seeded **only if absent** and never edited again: `project-AGENTS.md` (the thin router directive plus a code-standards heading), `project-CLAUDE.md` (a two-line shim — `@AGENTS.md` and `@_bower/framework.md`), `project-settings.json` (Claude Code Bash allowlist), and `project-codex-config.toml` (Codex sandbox default). When you change framework guidance, edit `_bower/framework.md` — projects pick up the change by re-running the scaffold script over their `_bower/` directory. `project-*` is the exclusion glob in both scaffold scripts' copy loop, so a new template is excluded by naming it, not by editing the scripts.

## Skills are generated — edit `skills-src/` only

`skills-src/` is canonical. Sixteen sources — thirteen commands, three agents — each a runtime-neutral body plus a small metadata header. `node scripts/build-adapters.cjs` emits thirty-two files across four trees:

| Generated tree | From | Transformation |
|---|---|---|
| `.claude/commands/<n>.md` | `skills-src/commands/` | YAML `description:` (+ `argument-hint:` when the source has `arguments:`); the `<!-- bower:arguments -->` marker becomes the `$ARGUMENTS` binding line |
| `.agents/skills/<n>/SKILL.md` | `skills-src/commands/` | Standard Agent Skills frontmatter (`name`, `description`) only — never a Claude extension; the marker becomes the invoking-message wording |
| `.claude/agents/<n>.md` | `skills-src/agents/` | `tools:` derived from `role:`; body verbatim |
| `.codex/agents/<n>.toml` | `skills-src/agents/` | `sandbox_mode` from `role:`; body as an escaped `developer_instructions = """…"""` |

Rules that follow from this:

- **Never hand-edit a generated file.** Every one carries a banner naming its source. `node scripts/build-adapters.cjs --check` regenerates in memory and byte-compares; it is a release gate, so a hand edit fails the release rather than shipping.
- **Bodies stay runtime-neutral.** No tool names, no `AskUserQuestion`, no literal `$ARGUMENTS` — the generator's deny-list lint fails the build on all three. A workflow names the *idiom* (operator gate, batch gate, delegate, the request, handoff spelling); the mechanics live in exactly one place, `_bower/framework.md` → *Runtime bindings*. Do not restate a binding inside a skill, and do not branch on runtime inside a body.
- **The skill directory name is the invocation name.** `skills-src/commands/b-feature.md` → `.agents/skills/b-feature/`, invoked as `$b-feature`. The frontmatter `name:` must equal the stem; it creates no alias, and the lint enforces the equality.
- **Run `node tools/adapter-test/run.cjs`** after touching the generator. It golden-compares a fixture mini-root, round-trips adversarial TOML bodies, and asserts each lint fires.
- **`b-*` and `bower-*` are framework-owned namespaces** in a project's `.agents/skills/` and `.codex/agents/`. The scaffold replaces and prunes within them and never touches anything else — projects may keep their own skills alongside.

## Changelog entries are terse — the migration notes are not

The prose part of a `_bower/changes.md` entry is a record, not an essay. Per sub-change: one short paragraph saying what changed and why, then a bulleted list of the files touched with a clause each. That is the whole budget. This file is scaffolded into every project and read by `/b-upgrade`, so length has a real cost, and long entries are the reason the log had to be cut once already.

Do not write into a changelog entry:

- **Process narrative** — how the problem was found, what was surveyed, what the sweep turned up, what was considered and rejected, why a commit was or wasn't rewritten. Nobody reads a changelog for this.
- **Extended rationale** — design reasoning belongs in `_bower/rationale.md`, which is where a reader looking for *why* will go. Put it there and give the entry a one-clause pointer to it. If the reasoning does not warrant a `rationale.md` paragraph, it does not warrant space in the changelog either.
- **Comparisons to earlier versions**, restatements of rules already written in `framework-reference.md`, or a recap of what the entry is about to say.

The `### Migration` subheading is the exception and is exempt from all of the above: `/b-upgrade` executes those notes in a downstream project, so verbosity there is functional. Be as explicit and long as correctness requires — see the next section.

If asked to trim an entry, cut the prose and leave the migration notes and the file list intact.

## Migration-notes authoring discipline

Every framework change gets migration notes in its `_bower/changes.md` entry. These notes are read by the `/b-upgrade` skill running in a downstream project — a model audience walking through one version at a time. Authoring discipline matters because a vague or context-dependent note will produce inconsistent upgrades across projects, and the failure may not surface until much later.

Write notes under a `### Migration` subheading inside the version's section. Rules:

- **Self-contained.** Do not write "see also v0.10's note" or "as in the previous version." `/b-upgrade` reads one version's section at a time; a cross-reference is a dangling pointer.
- **Written for a model audience.** Be explicit about which files to read, what to look for, and what to write. "Update `architecture.md`" is too vague. "For each module under `docs/modules/`, read its `module-status.md` and any `plan.md` to understand its purpose; add a `## Software architecture` section to `docs/architecture.md` with one entry per module covering purpose, data-concern boundary, and inter-module dependencies" is the shape.
- **Name "no migration needed" explicitly.** If a version has no project-side migration work, write `### Migration` with a single line: `None — no project-side changes required.` Silence is ambiguous; "none" is decisive.
- **Distinguish mechanical from judgement-required work.** If a step is a direct file edit, say so. If it requires the model to read project content and synthesise (e.g. backfilling a section with content inferred from existing files), say *that* — the operator's self-assessment in `/b-upgrade` depends on knowing where discretion was exercised.
- **List file references inline.** Migration notes that say "read the schema in `_bower/brief-schema.md`" are fine — that file is now in the project after scaffold. Migration notes that reference files only in the framework repo (not scaffolded) need to inline the content.
- **Discuss with the user when uncertain.** If a change has subtle migration implications you're not sure about, ask the user before settling on the notes. A bad migration note compounds across every project that runs `/b-upgrade` after this version.

The historical entries (v0.8 through v0.12, now in `docs/changes-archive.md`) use `**Migration notes**` bold paragraphs rather than `### Migration` subheadings; the skill is forgiving about that. Going forward, use the subheading form.

## Archiving old changelog entries

`_bower/changes.md` is scaffolded into every project and read by `/b-upgrade`, so it cannot grow without bound. v0.8–v0.19 were archived to `docs/changes-archive.md` in v0.25; the head file carries v0.20 onward.

When to archive again: when `_bower/changes.md` passes roughly 500 lines *and* there is a version that marks a genuine architectural break — a release after which the earlier entries describe surfaces that no longer exist. Both conditions matter; size alone is not a reason to cut, because a mid-era cut splits entries that still explain the current design. Discuss the cut point with the user rather than picking one unilaterally.

How to archive:

- **Move entries verbatim.** Cut and paste; do not reword, summarise, or compact. An archived migration note's value is being the exact instruction a past upgrade followed — a project on an old version upgrading today needs the note as written. Compaction risks silently changing what an upgrade does.
- **Archive into `docs/`, never `_bower/`.** The scaffold copies all of `_bower/`, so an archive there would defeat the purpose. `docs/` is not scaffolded, and `/b-upgrade` clones this repo anyway, so archived notes stay reachable at `<clone>/docs/changes-archive.md`.
- **Keep both index tables accurate.** Each file has a `## Version index` covering only its own entries. Move the corresponding rows along with the bodies.
- **Update the boundary version in `.claude/commands/b-upgrade.md`.** Step 3.5 and Step 6a name the version at which entries move to the archive (currently v0.19/v0.20). A stale boundary sends the skill looking in the wrong file.
- **Do not reuse `changes-archive.md`'s name for a second cut** without deciding whether older archives merge into it or get their own file. Merging into the one file is simpler and preferred; if you do that, `/b-upgrade` needs no new path, only the boundary version updated.

## Changing a document schema? Check the viewer.

`_bower/viewer/` is a local web view of a project's `docs/` tree. It **parses Bower's document schemas**, which makes it the one part of the framework that a schema change can break — and it breaks *silently*, emitting plausible-looking wrong findings rather than crashing. This is not hypothetical: v0.26 moved the feature roster out of `architecture.md`, nothing updated the viewer, and its drift report became 81% noise (48 spurious warnings) on a real project before anyone noticed.

So: **whenever you change what a Bower document looks like** — a section name, a marker's meaning, a frontmatter field, a table's shape, where a fact lives — do three things in the same commit:

1. **Read `_bower/viewer/README.md`'s "Schema contract" table.** It lists every convention the extractor depends on against the `framework-reference.md` section that defines it. Grep it for the section you are editing. If your change touches a row, it touches the viewer.
2. **Update `_bower/viewer/lib/extract.cjs`** and bump its `SCHEMA_VERSION` to the version you are cutting. A check that tested the old shape is not merely stale — it will fire on every conformant project.
3. **Run `node tools/viewer-test/run.cjs`.** Fixtures in `tools/viewer-test/` hold one instance of every drift condition plus a conformant module that must yield *zero* findings; the expected set of finding kinds is exact, so a check firing where it shouldn't fails the run. Adjust the fixtures only when a schema genuinely changed — never to make a red test green.

`scripts/release.sh` runs that test and checks `SCHEMA_VERSION` against `_bower/VERSION`, so a release cannot be cut with the viewer misreading its own framework version. Before releasing a schema change, also point the viewer at a real project (`node _bower/viewer/serve.cjs --root ../some-project`) and read the drift page — the fixtures prove each check is correct, but only real data proves the parser survives a hundred-plus distinct plan section names and megabytes of doc body.

The viewer is **human-facing only** by deliberate choice: no `/b-*` command consumes its output. Do not wire it into one without discussing it — that would make its output a contract. The deferral and its revisit trigger are in `_bower/roadmap.md`.

## Changing gate or delegation wording? Re-run the conformance scenarios.

`docs/conformance/` holds eight scenarios, written pass criteria, and an append-only ledger (`runs.md`) recording every run as PASS / PASS-WITH-DEGRADATION / FAIL. It is what earns the tier claims in the README — Claude Code *supported*, Codex *experimental* — and it is not scaffolded into projects. The scenarios are behavioural: no static check can tell you whether a gate actually stopped.

**The demotion rule: any version that changes gate or delegation text must re-run C3 and C8 before repeating a tier claim.** Those two are the scenarios where the wording *is* the mechanism — C3 is the gate contract under adversarial non-answers (silence, an unrelated reply, a permission approval), C8 is the conversational batch walk. Shipping the old tier claim after editing either idiom asserts evidence you do not have. "Gate or delegation text" means `_bower/framework.md` → *Runtime bindings*, any skill's gate wording, any agent definition's interaction constraints, or the generator's handling of them. A prose tidy elsewhere in a skill does not trigger it.

This is the same posture as the viewer's schema contract above, applied to behaviour rather than parsing: a contributor rule for intent, written criteria for discovery, the ledger for detection. What it lacks is the release gate — a tier claim is prose, so nothing mechanical can catch a stale one. That is why the rule is written here.

Runs cost real tokens against the operator's key (~13k–60k per exec check), and half the scenarios need an operator at a terminal. Batch them: build one fixture with `tools/conformance/make-fixture.sh`, run everything that fits it, score together. Never run the suite as a smoke test — `tools/adapter-test/` and `tools/scaffold-test/` are for that.

## Framework reference (read these before changing framework behaviour)

- `_bower/rationale.md` — **Why Bower works the way it does.** Design principles, comparisons to alternatives, and the reasoning behind structural choices. Consult before changing framework behaviour so the change stays coherent with the design.
- `_bower/changes.md` — **Versioned log of framework changes**, v0.20 onward. Most recent first, behind a `## Version index` table. Prepend a new entry (and an index row) for every framework change in the same commit. This file is scaffolded into every project and read by `/b-upgrade`, so its size has a real cost — see the archiving convention below.
- `docs/changes-archive.md` — **Archived changelog entries, v0.8–v0.19**, verbatim. Not scaffolded into projects; `/b-upgrade` reads it from its clone when a project is upgrading from a pre-v0.20 version. Historical reference only — never add new entries here.
- `_bower/roadmap.md` — **Deferred improvements and their revisit triggers.** Check before proposing new framework work (it may already be deferred with a stated reason); update when deferring something new.
- `_bower/brief-schema.md` — **Schema the `bower-analyst` subagent emits** and `/b-design` Stage 0 consumes. Touch alongside any change to the analyst, the brief format, or Stage 0.
- `_bower/framework.md` — **The project-facing router**, reached every session by both runtimes: `@`-included by a project's `CLAUDE.md`, pointed at by a directive in its `AGENTS.md` (always loaded, keep it lean). Edit this when changing how Bower projects are *used*, as opposed to how the framework itself is *built*. Its `## Runtime bindings` section is the **only** place a tool name or runtime mechanic may appear.
- `docs/conformance/` — **Scenario specs, tier rules, and the run ledger.** Not scaffolded. Read `README.md` there before claiming anything about a runtime's behaviour; see the demotion rule above.
- `docs/codex-support.md` — **The v0.33 problem assessment**, including §6's spike findings. Historical planning record: it explains why the dual-runtime delivery has the shape it has, and is superseded by `rationale.md` → *One Contract, Two Runtimes* wherever the two disagree.
- `_bower/framework-reference.md` — **Detailed project-facing specs** (document schemas, full ADR spec, UI path examples, module review) loaded on demand by commands and agents. Detail belongs here or in the command that consumes it, not in the router.
- `_bower/VERSION` — **The canonical framework version.** Single line, the version string only (no `v` prefix). Read by the scaffold script and by `/b-upgrade` in projects. Bump this in the same commit as a `_bower/changes.md` entry; the heading in `_bower/framework.md` is a derived label that should match but is not read by tooling.

## Repository layout

```
CLAUDE.md                  # This file — contributor-facing
README.md                  # Public README
skills-src/                # CANONICAL, hand-edited; NOT scaffolded
├── commands/              # 13 command bodies + metadata header
└── agents/                # 3 agent bodies + role metadata
_bower/
├── framework.md           # Project-facing router (`@`-included; pointed at from AGENTS.md)
├── framework-reference.md # Detailed specs, loaded on demand by commands/agents
├── project-AGENTS.md      # Template seeded into new projects' AGENTS.md
├── project-CLAUDE.md      # Template seeded into new projects' CLAUDE.md (two-line shim)
├── project-settings.json  # Template seeded into new projects' .claude/settings.json
├── project-codex-config.toml # Template seeded into new projects' .codex/config.toml
├── rationale.md           # Design principles (above)
├── changes.md             # Version log, v0.20 onward (above)
├── roadmap.md             # Deferred work (above)
├── brief-schema.md        # Change-brief schema (above)
├── review-schema.md       # Review-report schema
├── VERSION                # Canonical framework version (single line)
└── viewer/                # Local read-only web view of a project's docs/ (scaffolded)
    ├── README.md          # Includes the Schema contract table — read before schema changes
    ├── lib/extract.cjs    # docs/ → graph.json; carries SCHEMA_VERSION
    ├── lib/md.cjs         # Markdown structure parsing
    ├── serve.cjs          # Static server + SSE live reload
    └── web/               # The client (index.html, style.css, app.js, vendored marked)
.claude/                   # GENERATED — Claude Code adapter
├── agents/                # Subagents (e.g. bower-analyst.md)
└── commands/              # Slash-command skills (/b-design, /b-feature, …)
.agents/skills/<n>/SKILL.md  # GENERATED — Codex/standard skills adapter
.codex/agents/<n>.toml       # GENERATED — Codex custom-agent adapter
scripts/
├── build-adapters.cjs     # skills-src/ → the four adapter trees; `--check` is a release gate
├── scaffold.sh            # Copies _bower/ + all four adapter trees into a project (bash)
├── scaffold.ps1           # PowerShell equivalent for Windows
└── release.sh             # Cuts a GitHub release; gates on all four acceptance tests
tools/                     # Framework-repo tooling; NOT scaffolded into projects
├── viewer-test/
│   ├── run.cjs            # Viewer acceptance test — zero deps, exits non-zero
│   ├── fixture/           # One instance of every drift condition + a conformant module
│   ├── fixture-adoption/  # A project mid-adoption (🌱 banner + ledger)
│   └── fixture-obsolete/  # A check gone universal, to prove the tripwire fires
├── adapter-test/          # Generator acceptance test + fixture-src/ mini-root
├── scaffold-test/         # Scaffold acceptance test (bash temp-dir matrix)
└── conformance/           # make-fixture.sh (5 fixture kinds) + run-codex.sh exec harness
docs/                      # Material for the README / external readers (not a Bower project's docs/)
├── changes-archive.md     # Archived changelog entries v0.8–v0.19; not scaffolded
├── gate-audit-v0.33.md    # Per-site audit of the v0.33 neutralisation pass
└── conformance/           # Scenario specs C1–C8, tier rules, runs.md ledger; not scaffolded
```

## Scaffolding a project from this repo

`scripts/scaffold.sh <target-dir>` (or `scripts/scaffold.ps1 <target-dir>` on Windows) copies `_bower/` and all four adapter trees — `.claude/agents/`, `.claude/commands/`, `.agents/skills/`, `.codex/agents/` — into the target. Both scripts are kept in lockstep; `tools/scaffold-test/run.sh` asserts the behaviour and re-runs the whole matrix under `pwsh` when one is on PATH.

- **Preflight first.** Before mutating anything, the script probes every managed directory for writability and, on any failure, names the paths, prints the run-it-yourself command, and exits 1 with **zero writes made**. This exists because Codex mounts an existing `.agents/`/`.codex/` read-only and fails the write outright rather than prompting: without the preflight, a run writes `_bower/` and `.claude/`, dies at the protected tree, and leaves the two adapter footprints on different framework versions.
- **`_bower/` is refreshed and pruned.** Anything the repo no longer ships is removed and named in the summary, except the project-owned `VERSION` and `SOURCE`; directories are replaced wholesale, so files retired inside `_bower/viewer/` go too. The `project-*` templates are seeded out, never copied in.
- **The adapter trees are namespace-scoped.** `b-*` in `.agents/skills/`, `bower-*` in `.codex/agents/`: each shipped entry is replaced wholesale, each target entry in those namespaces with no source counterpart is pruned and named, and **nothing outside them is touched** — `.agents/skills/` is the standard skills location and a project may keep its own there.
- **Instruction and config files are seeded only if absent**, then owned by the project forever: `AGENTS.md`, `CLAUDE.md`, `.codex/config.toml`, `.claude/settings.json`, `_bower/VERSION`, `_bower/SOURCE`. A grown `AGENTS.md` or `CLAUDE.md` is never edited — adding the router directive to one is `/b-upgrade`'s judgement migration step, not the scaffold's.
- **It moves files only.** It does not apply migration notes or bump the project's `_bower/VERSION`; the project-side upgrade path is `/b-upgrade`, which runs this script *and* walks each version's migration notes. Its closing summary tells the operator to start a new session, because instruction files were rewritten.

The script never touches the target's `docs/`, `.claude/settings.local.json`, or anything outside the framework footprint.

## Releasing a framework version

Framework versions are cut as GitHub releases so downstream watchers (Releases-only or All Activity) get notified when a new version lands. Releases are manual: after a version-bump commit hits `main`, run `scripts/release.sh`.

The script reads `_bower/VERSION`, extracts the matching `## vX.Y — DATE` section from `_bower/changes.md`, and creates a GitHub release tagged `vX.Y` with that section as the release notes. It aborts if the tag already exists (locally or on origin) or if the `changes.md` section is missing — both signal that something is out of sync. Use `scripts/release.sh --dry-run` to preview before cutting.

Four acceptance gates run before the tag stage, in order: the viewer test (plus the `SCHEMA_VERSION` equality check), `build-adapters.cjs --check` for adapter drift, the adapter test, and the scaffold test. The three `node` ones warn and skip if `node` is absent; the scaffold test needs only bash and always runs. A release therefore cannot ship hand-edited adapters or a viewer misreading its own framework version.

Tags use the `vX.Y` form (`v0.17`); `_bower/VERSION` itself stays unprefixed (`0.17`) because that's what tooling reads. The script tags `origin/main`'s current HEAD, so push the version-bump commit before running it — and don't push unrelated follow-up commits ahead of the release if you want the tag to land on the version commit specifically.

Backfilling earlier versions as releases is not required — anyone needing older versions can read `_bower/changes.md` or check out the commit that bumped `_bower/VERSION`. Backfilling would fire a notification per version, which is noise rather than signal.

This is repo-tooling, not framework behaviour: it does not change anything downstream Bower projects experience, and does not warrant a `_bower/changes.md` entry of its own.
