# Bower Framework v0.19

A lightweight AI-assisted development pattern for research software engineering.

> **⚠️ Draft — feedback actively sought.** Bower is in active development, but it's already been used to build real tools. If you try it, please share what worked and what didn't: open an issue on this repo, or email **matthew.bettinson@anu.edu.au**.

## What is Bower?

Bower provides structure for planning, documenting, and implementing software projects where AI coding assistants are first-class participants. It emphasises:

- **Planning before building** — Design and document before implementing
- **Living documentation** — Documents represent current state, not history
- **Feature modules** — Logical grouping that persists as system boundaries
- **AI-readable context** — Structure optimised for AI agent discoverability

The pattern borrows planning discipline from [SpecKit](https://github.com/github/spec-kit) and living documentation from [OpenSpec](https://github.com/Fission-AI/OpenSpec), optimised for small research teams and the full prototype-to-infrastructure lifecycle.

## Getting Started

Bower runs on top of [Claude Code](https://claude.com/claude-code): it needs no server and no account beyond your existing Claude Code setup. If you've never used Claude Code before, install it first and make sure `claude` runs in a terminal — Bower is built on top of it.

Bower has two halves, and it helps to know the split up front:

- **Tooling** — the `/bower:*` slash commands and the `bower-analyst`/`bower-reviewer` agents. Read-only, identical for every project. This is what the **plugin** distributes and auto-updates.
- **Project state** — the `_bower/` reference files, the `@_bower/framework.md` include in your `CLAUDE.md`, `_bower/VERSION`, `_bower/SOURCE`, and the `docs/` tree the commands generate. This lives in *your* project's working tree. A plugin can't drop these into your repo, so a one-time `/bower:init` (or the scaffold script) seeds them.

### 1. Install the Bower plugin

**Recommended way — the marketplace plugin.** Bower ships as a plugin in the ANU HDRH [`claude-goodies`](https://github.com/ANU-HDRH/claude-goodies) marketplace. Add the marketplace once, then install:

```
/plugin marketplace add ANU-HDRH/claude-goodies
/plugin install bower@claude-goodies
```

> **Provisional while the plugin work is on a branch.** The marketplace currently sources Bower from this repo's `plugin-marketplace` branch (not `main`). Until that branch merges, the install above pulls the branch build. The commands to type don't change once it lands on `main` — only the underlying ref does. To update later: `/plugin marketplace update claude-goodies`.

Installing the plugin gives you the `/bower:*` commands and agents immediately, in every project. To set up a specific project, `cd` into it and run:

```
/bower:init
```

`/bower:init` seeds the project-state half: it copies `_bower/` into your project, creates `CLAUDE.md` from the template if you don't already have one, and writes `_bower/VERSION` and `_bower/SOURCE` if absent. It never overwrites an existing `CLAUDE.md`, `_bower/VERSION`, or `_bower/SOURCE`, so it's safe to re-run.

**Alternative way — clone and scaffold (no plugin).** If you can't use the marketplace (air-gapped, CI, or you'd rather vendor the files directly), clone this repo and run the scaffold script. It copies both halves into your project and seeds a `CLAUDE.md` if you don't already have one. Re-running it against an existing project also works as an upgrade, refreshing the framework files without touching your `CLAUDE.md`, `_bower/VERSION`, or `_bower/SOURCE`.

```bash
git clone https://github.com/ANU-HDRH/bower-framework /tmp/bower
/tmp/bower/scripts/scaffold.sh /path/to/your-project
# Windows PowerShell: \tmp\bower\scripts\scaffold.ps1 C:\path\to\your-project
rm -rf /tmp/bower
```

The scaffold script:

- Copies `_bower/` (excluding the `project-CLAUDE.md` template seed) into your project.
- Refreshes the commands and agents into your project's `.claude/commands/` and `.claude/agents/`, renaming them to the legacy `/b-*` form (see the note below).
- Creates `CLAUDE.md` from the template **only if** your project has no `CLAUDE.md`. Existing CLAUDE.md files are left alone — your project-specific additions are safe.
- Creates `_bower/VERSION` (the framework version this project is migrated to) and `_bower/SOURCE` (the git URL of the framework repo, read from the framework repo's `origin` remote) **only if absent**. Both are preserved on subsequent scaffolds — `VERSION` because `/bower:upgrade` owns it, `SOURCE` because forks and mirrors should stay pointed at the right upstream.

> **A note on command names.** The plugin invokes commands under its namespace — `/bower:design`, `/bower:feature`, and so on. The scaffold path predates the plugin and installs the same commands into `.claude/commands/` under their original names — `/b-design`, `/b-feature`, … — so **existing scaffolded projects keep working unchanged.** The two forms are the same commands; only the invocation prefix differs. This README uses the canonical `/bower:*` form throughout; read `/b-*` if you're on the scaffold path.

Either way, you should now have at the top of your project:

- `CLAUDE.md` — instructions Claude Code reads on every session. The Bower-supplied content is one line: `@_bower/framework.md`, which `@`-includes the framework guidance. Everything else in this file is yours.
- `_bower/framework.md` — the framework guidance (what `@_bower/framework.md` resolves to). Treat as read-only; refresh by upgrading (see *Upgrading*).
- `_bower/VERSION` — the framework version this project is migrated to. Owned by `/bower:upgrade`.
- `_bower/SOURCE` — the git URL of the framework repo, used by `/bower:upgrade` to clone the latest framework. Edit if you need to point at a fork or mirror (see *Upgrading*).
- `_bower/` — framework rationale, change-brief schema, roadmap, `changes.md`, and `framework.md` (you don't normally edit these).

If you used the **scaffold path** rather than the plugin, you'll also have the tooling vendored into your project — `.claude/commands/` (the `/b-*` slash commands) and `.claude/agents/` (the `bower-analyst` and `bower-reviewer` subagents). Plugin users get those from the plugin instead, so they don't appear in the project tree.

### 2. Tell Claude about your project's code standards

Open `CLAUDE.md` and scroll to the bottom. There's a section called **Project-Specific Code Standards** — add anything you'd tell a new collaborator about the codebase: language, formatter, test runner, conventions you care about. Two or three bullets is enough to start; you can grow it later.

You don't need to do anything to "load" this file. Claude Code reads it automatically every time you start a session in this directory. The `/bower:*` slash commands are available too — from the installed plugin, or (on the scaffold path) as soon as `.claude/commands/` is present.

### 3. Start a Claude Code session and run `/bower:design`

```bash
cd your-project
claude
```

Then, at the Claude prompt, type:

```
/bower:design I want to build <one-sentence description of what you want>
```

`/bower:design` is the entry point for new projects and for changes that shift architecture, decisions, scope, or module structure. For changes within existing architecture — features, fixes, modifications, removals — use `/bower:feature` directly instead; if you pick wrong, `/bower:feature` will point you back to `/bower:design`.

### What happens next

`/bower:design` runs a six-stage flow. Stage 0 spawns the read-only `bower-analyst` subagent, which reads your project state and produces a **change brief** — a structured plan of what each subsequent stage needs to do, with "nothing to do" as a first-class outcome. After you confirm the brief, Stages 1–5 execute against it: problem framing, decisions (emitted as ADRs), architecture, module and feature plans, scaffolding. On a greenfield project most stages will have full drafts; on a revision typically only a few have real work and the others emit a one-line "nothing to do" and proceed.

After the first design pass, day-to-day work usually means running `/bower:feature` (one feature) or `/bower:module` (a whole module's worth). If you come back to the project later and don't remember where you were, run `/bower:recap` — it reads the docs and tells you the current state without changing anything. To preview what `/bower:design` would do for a proposed change without committing to execute, run `/bower:analysis` — it produces the same brief, read-only.

## Upgrading

Once your project is on a given Bower version (recorded in `_bower/VERSION`), upgrading to a newer framework version is a single command in the project: `/bower:upgrade`. The skill:

1. Verifies your git working tree is clean — refuses to run otherwise, so `git reset --hard` is always a valid escape if anything goes wrong.
2. Clones the framework repo (URL read from `_bower/SOURCE`) into a temp directory.
3. Runs the scaffold against your project to refresh `_bower/` and `.claude/`.
4. Walks each intermediate version's migration notes from `_bower/changes.md` in order — one version at a time, with a gate before applying each. If you're jumping multiple versions, it asks once whether to commit between each step or commit at the end.
5. Bumps `_bower/VERSION` after each migration step and emits a candid self-assessment at the end so you can decide whether to trust the result or `git reset --hard`.

For projects predating the `VERSION` convention (anything before v0.13), the first `/bower:upgrade` will prompt you for the version you're currently on so it knows which migration steps to apply.

### Forks and mirrors

`_bower/SOURCE` holds the git URL of the framework repo `/bower:upgrade` clones from. The scaffold script seeds it from the framework repo's `origin` remote on first install, then preserves it on subsequent scaffolds — so:

- **If you cloned this repo and scaffolded from it directly,** `SOURCE` points at this upstream repo. Subsequent `/bower:upgrade` runs pull from here.
- **If you forked the framework** (to carry local modifications, to pin a specific revision, or to maintain a private variant), clone *your fork* and run its scaffold against your project. `SOURCE` will be set to your fork's URL, and `/bower:upgrade` in the project will pull from your fork from then on. You're free to add commits to your fork — `/bower:upgrade` honours whatever's at the tip of `main` in the cloned repo.
- **If you need to retarget an existing project** at a different framework remote (e.g. you forked after the project was already set up), just edit `_bower/SOURCE` to the new URL. No other state needs changing.

Note that `/bower:upgrade` clones shallow (`--depth 1`) from whatever `SOURCE` points at, so the framework repo's `main` branch is the upgrade surface. If you want pinned upgrades against tagged framework versions, that's not the current model — fork and control the tip of `main` in your fork instead.

## Repository Structure

This repo is **both** the framework source and the installable plugin. The plugin loads `commands/` and `agents/` from the repo root (the plugin manifest lives in `.claude-plugin/`); the scaffold path copies those same files into a project's `.claude/`, renaming them to the legacy `/b-*` form.

```
bower-framework/
├── CLAUDE.md                       # Contributor-facing — this is the framework repo, not a project
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest (name: bower); version mirrors _bower/VERSION
├── commands/                       # Plugin slash commands — invoked as /bower:<name>
│   ├── design.md                   # Six-stage design with Stage 0 change brief
│   ├── analysis.md                 # Read-only: print the change brief /bower:design would consume
│   ├── feature.md                  # Lightweight change: propose → confirm → build (one feature)
│   ├── ui.md                       # Gated path for structural-and-underspecified UI changes
│   ├── module.md                   # Build a whole module: one gate, one integration pass
│   ├── integration.md              # Build the module-boundary integration test
│   ├── review.md                   # Fresh-eyes review of a completed module; reconcile drift
│   ├── adr.md                      # Scaffold an Architectural Decision Record (or supersede one)
│   ├── recap.md                    # Read-only "where am I, what's next?" orientation
│   ├── index.md                    # Regenerate docs/index.md and docs/adr/index.md
│   ├── spec.md                     # Export a single specification document
│   ├── init.md                     # Seed project state (_bower/, CLAUDE.md, VERSION, SOURCE)
│   └── upgrade.md                  # Upgrade a project to the current framework version
├── agents/
│   ├── bower-analyst.md            # Read-only subagent that produces change briefs
│   └── bower-reviewer.md           # Read-only subagent that produces module review reports
├── _bower/
│   ├── framework.md                # Project-facing guidance (a project's CLAUDE.md @-includes this)
│   ├── project-CLAUDE.md           # Template CLAUDE.md seeded into a new project
│   ├── rationale.md                # Why Bower works this way
│   ├── brief-schema.md             # Schema for the change brief produced by bower-analyst
│   ├── review-schema.md            # Schema for the review report produced by bower-reviewer
│   ├── roadmap.md                  # Deferred framework improvements
│   ├── changes.md                  # Versioned log of framework changes
│   └── VERSION                     # Canonical framework version (single line)
├── scripts/
│   ├── scaffold.sh                 # Copies _bower/ + commands/agents into a target project (bash)
│   └── scaffold.ps1                # PowerShell equivalent for Windows
└── README.md
```

## Commands

| Command | Purpose |
|---------|---------|
| `/bower:design` | Six-stage design process for new projects and architectural revisions. Stage 0 spawns the `bower-analyst` subagent to produce a **change brief**; Stages 1–5 execute against the confirmed brief (problem framing → decisions/ADRs → architecture → module/feature plans → scaffolding). Stages with no delta emit "nothing to do" cleanly. Emits one ADR per `new`/`supersedes`/`partial-supersedes` Stage 2 operation. |
| `/bower:analysis` | Read-only, advisory. Spawns the `bower-analyst` subagent against a proposed change and prints its **change brief** — what each `/bower:design` stage would do if executed. Useful as inspection before committing to execute. |
| `/bower:feature` | The everyday change command. Covers **add**, **modify**, and **remove** intents within existing architecture. One gate before code, with relevant ADRs loaded as constraints. Reconcile step prompts for ADR creation/supersession when a cross-cutting decision was introduced or invalidated. Redirects to `/bower:design` for architectural changes, or `/bower:ui` for experience-surface work. |
| `/bower:ui` | Gated path for **structural and underspecified** UI changes (e.g. "add tab-based content navigation" with multiple viable shapes). Propose-with-alternatives → confirm → implement → reconcile `docs/ui.md`. Most UI work skips the skill — visual tweaks and tightly-specified structural changes happen out-of-band; see *UI / UX Work* below. |
| `/bower:module` | Build all features in a module in one pass. One gate up front, one integration pass at the end. Use when the module is small and well-specified. |
| `/bower:integration` | Build the module-boundary integration test for a module. Use when a module was built feature-by-feature and the integration test is the residual. |
| `/bower:review` | Fresh-eyes review of one completed module. Spawns the read-only `bower-reviewer` subagent to find drift a feature-at-a-time build can't see — test coverage, spec↔code drift, cross-feature consistency, status honesty, ADR drift, boundary integrity — then reconciles what it safely can behind one gate and routes the rest to `/bower:feature` or `/bower:design`. Accepted fixes track in a transient `review-plan.md` deleted on completion. Optional; offered at module completion. |
| `/bower:adr` | Scaffold an Architectural Decision Record, or supersede an existing one. Auto-increments ID, writes the new ADR (and frontmatter update for supersession) in one pass. Called from `/bower:feature` and `/bower:design`; can be invoked directly. |
| `/bower:recap` | Read-only, advisory "where am I, what's next?" synthesis across project docs. Never writes. |
| `/bower:index` | Regenerate `docs/index.md` and `docs/adr/index.md` from current state. |
| `/bower:spec` | Export a single specification document for sharing with others. |
| `/bower:init` | Seed project state into the current project — copies `_bower/`, creates `CLAUDE.md` from the template if absent, and writes `_bower/VERSION`/`_bower/SOURCE` if absent. For plugin users setting up a project; the scaffold script does the same for the clone path. Deterministic, safe to re-run (never overwrites existing state). |
| `/bower:upgrade` | Upgrade this project to the current Bower framework version. Requires a clean git working tree. Clones the framework repo (URL in `_bower/SOURCE`), refreshes `_bower/` and `.claude/`, then walks each intermediate version's migration notes from `_bower/changes.md` step-by-step, bumping `_bower/VERSION` after each. Emits a self-assessment so you can decide whether to `git reset --hard` if anything looks wrong. |

## How It Works

At a glance — states are where the project (or a module) sits; the labels on each arrow are the command that moves it there:

![Bower SDD state flow](docs/bower-state.svg)

`Complete` means a module is built and its boundary integration test passes; `/bower:review` is an optional polish pass at that point, which is why it loops back to the same state. The one arrow that runs *backwards* — `Building → Designed` on an architectural change — is the framework's hard redirect: structural change can't be made on the fly, it goes back through `/bower:design`.

The diagram is the spine, not the whole picture. Several commands apply at any point and aren't shown: `/bower:recap` (orient in a fresh session), `/bower:analysis` (preview what a `/bower:design` would do), `/bower:adr` (record a cross-cutting decision), `/bower:ui` (experience-surface changes), `/bower:index` (regenerate the indexes), `/bower:spec` (export a spec), and `/bower:upgrade` (move to a newer framework version).

`/bower:design` is the design command. Six stages: Stage 0 produces a change brief via the read-only `bower-analyst` subagent; Stages 1–5 execute against the confirmed brief (problem framing, decisions/ADRs, architecture, module/feature plans, scaffolding) with a content gate per non-nil stage. Stages of no delta emit "nothing to do" cleanly, so heavy ceremony only fires where there's actual work. Required for greenfield and for changes that shift architecture, decisions, scope, or module structure.

`/bower:feature` is the implementation command for changes within existing architecture. Proposes changes and acceptance criteria, confirms with you, then implements. If the request turns out to need architectural change, it redirects to `/bower:design`; if it's primarily about the experience surface, it redirects to `/bower:ui` or one of the ad-hoc UI paths.

`/bower:module` and `/bower:integration` are the other two arrows into `Complete` on the diagram. `/bower:module` applies the same gate to a whole module at once — build all its features in one pass when the module is small and well-specified — and `/bower:integration` writes the module-boundary test that actually flips a module to `Complete`. Feature-by-feature work reaches the same state by repeated `/bower:feature` followed by a final `/bower:integration`.

The agent recommends; you decide. Every gate uses explicit confirmation — no changes without your sign-off. `/bower:recap` re-orients you in a fresh session without touching anything; `/bower:analysis` previews what `/bower:design` would do for a proposed change without executing it.

## UI / UX Work

UI work has a different cadence from backend work, and Bower handles it differently. This applies whether the interface is a web frontend, a TUI, a native desktop app, or otherwise — `docs/ui.md` is surface-agnostic. Most UI iteration — visual tweaks, copy edits, small structural changes the operator can specify cleanly — happens out-of-band without invoking a skill: the agent makes the change, and (if structural) updates `docs/ui.md` as part of the reconcile. The propose-and-acceptance ceremony of `/bower:feature` is too heavy for "move the icon left" and the wrong shape for "what should this feel like?"

For structural UI changes where there are real branching choices — "should this be tabs, accordion, or a separate modal?" — there's `/bower:ui`. It runs a propose-with-alternatives gate, implements the chosen option, and reconciles `docs/ui.md`.

`docs/ui.md` is the experience-surface counterpart to `architecture.md`. It records what stays stable as the UI evolves: navigation map, screen inventory, layout grammar, interaction patterns, visual-language (or style-convention) pointers. Implementation detail lives in code; the doc captures invariants. The file is created lazily on the first structural UI change — projects without an interface never grow one.

Architectural UI changes (swapping the UI framework, adopting new state-management for the UI layer, introducing a new top-level navigation pattern) still route through `/bower:design`. The hard line is the same as elsewhere in the framework: speed where it doesn't cost protection, gates where it does.

## Project Documentation Structure

Bower creates and maintains the `docs/` tree below, with `docs/reference/` as an optional home for vendored external material that agents consult but don't rewrite:

```
docs/
├── index.md                    # Auto-generated navigation and status
├── scope.md                    # Current scope, non-goals, success criteria
├── constitution.md             # Process conventions
├── architecture.md             # System design (high-level structure; cross-references ADRs for decisions)
├── ui.md                       # Experience surface: navigation, screens, layout, interactions (created lazily)
├── design/                     # Day-1 problem framing
│   └── problem-space.md
├── adr/                        # Architectural Decision Records (one file per decision)
│   ├── index.md                # Schema reference + decision index
│   └── NNNN-kebab-title.md
├── reference/                  # Vendored external docs for lookup (optional, read-only)
└── modules/
    └── <module>/
        ├── <feature>/
        │   ├── plan.md         # How it works, components, testing
        │   └── status.md       # Resumption snapshot (~150 words)
        └── module-status.md    # Integration testing
```

Deferred framework improvements live in [`_bower/roadmap.md`](_bower/roadmap.md) — named items with revisit triggers, so they don't clutter active docs or get lost.

## Testing

Bower is deliberately unopinionated about testing specifics. The framework assumes tests exist and expects them to be consulted before a feature is marked complete, but it does not prescribe a test runner, directory layout, fixture style, or coverage bar. Those belong to your project, not to Bower.

**Where it lives.** Record your project's testing conventions in `docs/constitution.md`: where tests live, how to run them, what "verified" means for a feature to be marked ✓, and any fixture or data conventions. Bower agents read `constitution.md` as part of their normal workflow and will follow what you've written there.

**What Bower contributes.** The built-in guidance is minimal and applies across project types: end-to-end tests for pipelines and workflows, integration tests at module boundaries, unit tests for complex logic. Plan.md's testing section and each lightweight-change proposal's acceptance criteria reference *your* conventions; Bower provides the hooks, you provide the specifics.

A fuller how-to for setting up `constitution.md` may come later. For now, the shape is: write down what you'd tell a new collaborator about testing this project, and the agents will pick it up.

## About

A project of the [**HASS Digital Research Hub**](https://hdrh.anu.edu.au/) at the **Australian National University**.

## License

MIT
