# Bower Framework — Contributor Instructions

**You are working on the Bower framework itself, not on a project built with Bower.** This repo is the source of the framework: the project-facing guidance, the skills (`/b-*` slash commands), the analyst subagent, and the supporting `_bower/` reference files. Projects consume this material by running the scaffold script; they do not edit it.

## What this means in practice

- **Do not invoke `/b-*` skills on this repo.** `/b-design`, `/b-feature`, `/b-module`, `/b-integration`, `/b-adr`, `/b-recap`, `/b-analysis`, `/b-index`, `/b-spec` are all designed for *Bower projects*. This repo has no `docs/modules/`, no `docs/architecture.md`, no `docs/scope.md` — running them here is meaningless. Edit framework files directly instead.
- **Every framework change gets a `_bower/changes.md` entry.** Prepend a new versioned section (most recent first) describing what changed, why, and any migration notes for projects already on a previous version, **and** add a row to the `## Version index` table at the top of the file (version, date, one-line summary, migration class: `none` / `mechanical` / `judgement`).
- **The version string lives in four places — bump all four in the same commit.** In order of authority: `_bower/VERSION` (canonical, read by the scaffold script, `/b-upgrade`, and `scripts/release.sh` — unprefixed, e.g. `0.25`), `_bower/framework.md`'s top heading, `README.md`'s top heading, and the new `_bower/changes.md` section heading. The last three are human-visible labels that nothing reads, which is exactly why they get forgotten — `README.md`'s especially, since it is otherwise untouched by most framework changes. Check all four before committing: `grep -rn 'v0\.[0-9]*' README.md _bower/framework.md | head -2` and `cat _bower/VERSION`.
- **The project-facing CLAUDE.md is a template, not the live one.** This file (the root `CLAUDE.md`) is contributor-only. The template that projects receive lives at `_bower/project-CLAUDE.md`; it `@`-includes `_bower/framework.md`. When you change framework guidance, edit `_bower/framework.md` — projects pick up the change by re-running the scaffold script over their `_bower/` directory.

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

## Framework reference (read these before changing framework behaviour)

- `_bower/rationale.md` — **Why Bower works the way it does.** Design principles, comparisons to alternatives, and the reasoning behind structural choices. Consult before changing framework behaviour so the change stays coherent with the design.
- `_bower/changes.md` — **Versioned log of framework changes**, v0.20 onward. Most recent first, behind a `## Version index` table. Prepend a new entry (and an index row) for every framework change in the same commit. This file is scaffolded into every project and read by `/b-upgrade`, so its size has a real cost — see the archiving convention below.
- `docs/changes-archive.md` — **Archived changelog entries, v0.8–v0.19**, verbatim. Not scaffolded into projects; `/b-upgrade` reads it from its clone when a project is upgrading from a pre-v0.20 version. Historical reference only — never add new entries here.
- `_bower/roadmap.md` — **Deferred improvements and their revisit triggers.** Check before proposing new framework work (it may already be deferred with a stated reason); update when deferring something new.
- `_bower/brief-schema.md` — **Schema the `bower-analyst` subagent emits** and `/b-design` Stage 0 consumes. Touch alongside any change to the analyst, the brief format, or Stage 0.
- `_bower/framework.md` — **The project-facing router** that gets `@`-included into a Bower project's CLAUDE.md (always loaded, keep it lean). Edit this when changing how Bower projects are *used*, as opposed to how the framework itself is *built*.
- `_bower/framework-reference.md` — **Detailed project-facing specs** (document schemas, full ADR spec, UI path examples, module review) loaded on demand by commands and agents. Detail belongs here or in the command that consumes it, not in the router.
- `_bower/VERSION` — **The canonical framework version.** Single line, the version string only (no `v` prefix). Read by the scaffold script and by `/b-upgrade` in projects. Bump this in the same commit as a `_bower/changes.md` entry; the heading in `_bower/framework.md` is a derived label that should match but is not read by tooling.

## Repository layout

```
CLAUDE.md                  # This file — contributor-facing
README.md                  # Public README
_bower/
├── framework.md           # Project-facing router (the `@`-include target)
├── framework-reference.md # Detailed specs, loaded on demand by commands/agents
├── project-CLAUDE.md      # Template seeded into new projects' CLAUDE.md
├── project-settings.json  # Template seeded into new projects' .claude/settings.json
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
.claude/
├── agents/                # Subagents (e.g. bower-analyst)
└── commands/              # Slash-command skills (/b-design, /b-feature, …)
scripts/
├── scaffold.sh            # Copies _bower/ + .claude/ into a target project (bash)
├── scaffold.ps1           # PowerShell equivalent for Windows
└── release.sh             # Cuts a GitHub release; gates on the viewer acceptance test
tools/                     # Framework-repo tooling; NOT scaffolded into projects
└── viewer-test/
    ├── run.cjs            # Viewer acceptance test — zero deps, exits non-zero
    ├── fixture/           # One instance of every drift condition + a conformant module
    ├── fixture-adoption/  # A project mid-adoption (🌱 banner + ledger)
    └── fixture-obsolete/  # A check gone universal, to prove the tripwire fires
docs/                      # Material for the README / external readers (not a Bower project's docs/)
└── changes-archive.md     # Archived changelog entries v0.8–v0.19; not scaffolded
```

## Scaffolding a project from this repo

`scripts/scaffold.sh <target-dir>` (or `scripts\scaffold.ps1 <target-dir>` on Windows) copies `_bower/` and the `.claude/` agents and commands into the target. If the target has no `CLAUDE.md`, the script seeds one from `_bower/project-CLAUDE.md`. If it already has one, the script leaves it alone — the assumption is that the project's CLAUDE.md already `@`-includes `_bower/framework.md`, so re-copying `_bower/` refreshes the framework files without touching project content. The `_bower/` refresh also *prunes*: anything in the target's `_bower/` that this repo no longer ships is removed (and named in the script's summary), except the project-owned `VERSION` and `SOURCE`; directories are replaced wholesale rather than merged, so files retired inside `_bower/viewer/` go too. Note the script only moves files: it does not apply migration notes or bump the project's `_bower/VERSION` — the project-side upgrade path is `/b-upgrade`, which runs this script *and* walks each version's migration notes. Similarly, if the target has no `.claude/settings.json`, the script seeds one from `_bower/project-settings.json` with safe read-only Bash permission defaults; if it already has one, the script leaves it alone.

The script never touches the target's `docs/`, `.claude/settings.local.json`, or anything outside the framework footprint.

## Releasing a framework version

Framework versions are cut as GitHub releases so downstream watchers (Releases-only or All Activity) get notified when a new version lands. Releases are manual: after a version-bump commit hits `main`, run `scripts/release.sh`.

The script reads `_bower/VERSION`, extracts the matching `## vX.Y — DATE` section from `_bower/changes.md`, and creates a GitHub release tagged `vX.Y` with that section as the release notes. It aborts if the tag already exists (locally or on origin) or if the `changes.md` section is missing — both signal that something is out of sync. Use `scripts/release.sh --dry-run` to preview before cutting.

Tags use the `vX.Y` form (`v0.17`); `_bower/VERSION` itself stays unprefixed (`0.17`) because that's what tooling reads. The script tags `origin/main`'s current HEAD, so push the version-bump commit before running it — and don't push unrelated follow-up commits ahead of the release if you want the tag to land on the version commit specifically.

Backfilling earlier versions as releases is not required — anyone needing older versions can read `_bower/changes.md` or check out the commit that bumped `_bower/VERSION`. Backfilling would fire a notification per version, which is noise rather than signal.

This is repo-tooling, not framework behaviour: it does not change anything downstream Bower projects experience, and does not warrant a `_bower/changes.md` entry of its own.
