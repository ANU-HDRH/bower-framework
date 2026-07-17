# Bower Framework — Contributor Instructions

**You are working on the Bower framework itself, not on a project built with Bower.** This repo is the source of the framework: the project-facing guidance, the skills (`/b-*` slash commands), the analyst subagent, and the supporting `_bower/` reference files. Projects consume this material by running the scaffold script; they do not edit it.

## What this means in practice

- **Do not invoke `/b-*` skills on this repo.** `/b-design`, `/b-feature`, `/b-module`, `/b-integration`, `/b-adr`, `/b-recap`, `/b-analysis`, `/b-index`, `/b-spec` are all designed for *Bower projects*. This repo has no `docs/modules/`, no `docs/architecture.md`, no `docs/scope.md` — running them here is meaningless. Edit framework files directly instead.
- **Every framework change gets a `_bower/changes.md` entry.** Prepend a new versioned section (most recent first) describing what changed, why, and any migration notes for projects already on a previous version. Bump the version in **both** `_bower/VERSION` (the canonical source, read by tooling) **and** `_bower/framework.md`'s top heading (a human-visible label) at the same time.
- **The project-facing CLAUDE.md is a template, not the live one.** This file (the root `CLAUDE.md`) is contributor-only. The template that projects receive lives at `_bower/project-CLAUDE.md`; it `@`-includes `_bower/framework.md`. When you change framework guidance, edit `_bower/framework.md` — projects pick up the change by re-running the scaffold script over their `_bower/` directory.

## Migration-notes authoring discipline

Every framework change gets migration notes in its `_bower/changes.md` entry. These notes are read by the `/b-upgrade` skill running in a downstream project — a model audience walking through one version at a time. Authoring discipline matters because a vague or context-dependent note will produce inconsistent upgrades across projects, and the failure may not surface until much later.

Write notes under a `### Migration` subheading inside the version's section. Rules:

- **Self-contained.** Do not write "see also v0.10's note" or "as in the previous version." `/b-upgrade` reads one version's section at a time; a cross-reference is a dangling pointer.
- **Written for a model audience.** Be explicit about which files to read, what to look for, and what to write. "Update `architecture.md`" is too vague. "For each module under `docs/modules/`, read its `module-status.md` and any `plan.md` to understand its purpose; add a `## Software architecture` section to `docs/architecture.md` with one entry per module covering purpose, data-concern boundary, constituent features, and inter-module dependencies" is the shape.
- **Name "no migration needed" explicitly.** If a version has no project-side migration work, write `### Migration` with a single line: `None — no project-side changes required.` Silence is ambiguous; "none" is decisive.
- **Distinguish mechanical from judgement-required work.** If a step is a direct file edit, say so. If it requires the model to read project content and synthesise (e.g. backfilling a section with content inferred from existing files), say *that* — the operator's self-assessment in `/b-upgrade` depends on knowing where discretion was exercised.
- **List file references inline.** Migration notes that say "read the schema in `_bower/brief-schema.md`" are fine — that file is now in the project after scaffold. Migration notes that reference files only in the framework repo (not scaffolded) need to inline the content.
- **Discuss with the user when uncertain.** If a change has subtle migration implications you're not sure about, ask the user before settling on the notes. A bad migration note compounds across every project that runs `/b-upgrade` after this version.

The historical entries (v0.8 through v0.12) use `**Migration notes**` bold paragraphs rather than `### Migration` subheadings; the skill is forgiving about that. Going forward, use the subheading form.

## Framework reference (read these before changing framework behaviour)

- `_bower/rationale.md` — **Why Bower works the way it does.** Design principles, comparisons to alternatives, and the reasoning behind structural choices. Consult before changing framework behaviour so the change stays coherent with the design.
- `_bower/changes.md` — **Versioned log of framework changes.** Most recent first. Append a new entry for every framework change in the same commit.
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
├── changes.md             # Version log (above)
├── roadmap.md             # Deferred work (above)
├── brief-schema.md        # Change-brief schema (above)
├── review-schema.md       # Review-report schema
└── VERSION                # Canonical framework version (single line)
.claude/
├── agents/                # Subagents (e.g. bower-analyst)
└── commands/              # Slash-command skills (/b-design, /b-feature, …)
scripts/
├── scaffold.sh            # Copies _bower/ + .claude/ into a target project (bash)
├── scaffold.ps1           # PowerShell equivalent for Windows
└── release.sh             # Cuts a GitHub release from the current _bower/VERSION section
docs/                      # Material for the README / external readers (not a Bower project's docs/)
```

## Scaffolding a project from this repo

`scripts/scaffold.sh <target-dir>` (or `scripts\scaffold.ps1 <target-dir>` on Windows) copies `_bower/` and the `.claude/` agents and commands into the target. If the target has no `CLAUDE.md`, the script seeds one from `_bower/project-CLAUDE.md`. If it already has one, the script leaves it alone — the assumption is that the project's CLAUDE.md already `@`-includes `_bower/framework.md`, so re-copying `_bower/` refreshes the framework files without touching project content. Note the script only copies files: it does not apply migration notes or bump the project's `_bower/VERSION` — the project-side upgrade path is `/b-upgrade`, which runs this script *and* walks each version's migration notes. Similarly, if the target has no `.claude/settings.json`, the script seeds one from `_bower/project-settings.json` with safe read-only Bash permission defaults; if it already has one, the script leaves it alone.

The script never touches the target's `docs/`, `.claude/settings.local.json`, or anything outside the framework footprint.

## Releasing a framework version

Framework versions are cut as GitHub releases so downstream watchers (Releases-only or All Activity) get notified when a new version lands. Releases are manual: after a version-bump commit hits `main`, run `scripts/release.sh`.

The script reads `_bower/VERSION`, extracts the matching `## vX.Y — DATE` section from `_bower/changes.md`, and creates a GitHub release tagged `vX.Y` with that section as the release notes. It aborts if the tag already exists (locally or on origin) or if the `changes.md` section is missing — both signal that something is out of sync. Use `scripts/release.sh --dry-run` to preview before cutting.

Tags use the `vX.Y` form (`v0.17`); `_bower/VERSION` itself stays unprefixed (`0.17`) because that's what tooling reads. The script tags `origin/main`'s current HEAD, so push the version-bump commit before running it — and don't push unrelated follow-up commits ahead of the release if you want the tag to land on the version commit specifically.

Backfilling earlier versions as releases is not required — anyone needing older versions can read `_bower/changes.md` or check out the commit that bumped `_bower/VERSION`. Backfilling would fire a notification per version, which is noise rather than signal.

This is repo-tooling, not framework behaviour: it does not change anything downstream Bower projects experience, and does not warrant a `_bower/changes.md` entry of its own.
