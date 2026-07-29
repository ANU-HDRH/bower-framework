# Bower Index Generator

Regenerate `docs/index.md` and (if `docs/adr/` exists) `docs/adr/index.md` by scanning the current state of project documentation.

## Regeneration contract

`docs/index.md` and `docs/adr/index.md` are **derived-state files with preserved structure**. Both jobs matter, and they are not the same job:

- **Derived state is authoritative.** Status markers, ADR table rows, and counts are recomputed from the current `status.md` / `module-status.md` / ADR frontmatter and overwrite whatever the file currently shows. This is the whole point of the command — never carry a stale marker forward.
- **Curated structure is preserved.** If a file already exists, update its derived values *in place* and leave everything else untouched: section ordering, hand-written narrative (status dashboards, documentation maps, parallelism/rationale prose), a richer schema reference, legend tables. **Do not flatten an existing file to the templates below** — projects routinely grow a richer index than the seed template, and that curation is not yours to discard.
- **The templates below are first-generation seeds, not a ceiling.** Use them verbatim only when the file does **not yet exist**. When the file exists, the template tells you which derived values to refresh and where they live structurally; the project's own layout wins.

Deciding derived vs. curated: a section is *derived* only if its content is mechanically reproducible from status markers or ADR frontmatter — the module table's status column, the ADR tables, the accepted/superseded counts. Everything else is curated; preserve it verbatim. If you cannot tell, preserve it.

## Process

1. Read `docs/architecture.md` (if it exists) for the system overview **and**, from its `## Software architecture` section, each module's one-line purpose — that section is where module purpose lives, and it is the source for the module descriptions in the output below
2. Read `docs/constitution.md` to confirm it exists
3. Read `docs/ui.md` if it exists. Its presence enables the `UI` link in the index; if the file has a leading summary sentence or paragraph, use it for the link description (otherwise use the canonical "Experience surface (navigation, screens, interaction patterns)"). Parallel to how `architecture.md` is scanned for the system overview.
4. Scan `docs/design/` for design documents
5. Scan `docs/adr/` for ADR files (any file matching `NNNN-*.md`); parse frontmatter from each
6. Scan `docs/modules/` for all modules, features, and their status files
7. For each feature, read its `status.md` to determine the current status marker
8. For each module, read its `module-status.md` for both the `## Build order` markers and the `## Module integration` `Test:` marker

## Output: `docs/index.md`

If `docs/index.md` already exists, follow the **Regeneration contract** above: refresh the derived status markers in place and preserve the project's structure. The structure below is the seed used only on first generation:

```markdown
# Project Index

## Core System
- [Architecture](/docs/architecture.md) — System overview and key decisions
- [UI](/docs/ui.md) — Experience surface (navigation, screens, interaction patterns)
- [Constitution](/docs/constitution.md) — Development conventions and standards

## Design Context
- [Problem Space](/docs/design/problem-space.md) — What we're solving and why
- [Decision Log](/docs/adr/index.md) — Architectural Decision Records (N accepted, M superseded)

## Feature Modules

### <Module Name> [<status>]
<Brief description from the module's architecture.md `## Software architecture` entry>
- [<Feature>](/docs/modules/<module>/<feature>/) [<status>]
- ...
- [Module Status](/docs/modules/<module>/module-status.md)
```

Every link target is **repo-root-based** — a leading `/`, per the doc-link convention in `_bower/framework.md` Working Conventions. Write `/docs/architecture.md`, never `architecture.md` or `../../architecture.md`, even though these links sit inside `docs/` and a relative target would resolve. On regeneration, if the existing `docs/index.md` carries relative targets, rewrite them to the repo-root form as part of the derived-value refresh — link targets are derived, not curated structure.

The UI line is included only if `docs/ui.md` exists. The Decision Log line is included only if `docs/adr/` exists and contains at least one ADR. Counts come from frontmatter `status` fields. Omit the Design Context section entirely if neither `docs/design/` nor `docs/adr/` exists.

## Output: `docs/adr/index.md`

If `docs/adr/` does not exist, skip. If `docs/adr/index.md` already exists, follow the **Regeneration contract** above: refresh the derived tables and the accepted/superseded counts in place, and preserve the project's schema reference, section ordering, and any prose — including the project's existing table *layout* (a pre-v0.20 index may still split active decisions into module-scoped and cross-cutting tables; refresh those in place rather than restructuring, but add a Scope column if absent so classification is visible). The structure below is the seed used only on first generation:

```markdown
# Architectural Decision Records

This is the project's decision log. Each ADR records a cross-cutting commitment — a choice that constrains more than one feature. Bodies are immutable once accepted; reversals are written as new ADRs that supersede the old.

**Code is truth, ADR is hypothesis.** An accepted ADR records what the project *decided*, not necessarily what the code currently *does*. If an ADR contradicts current code, the ADR is the stale one — supersede it, do not silently trust it.

## Schema

Frontmatter fields:

| Field | Required | Notes |
|---|---|---|
| `id` | yes | `ADR-NNNN`, four-digit zero-padded, immutable |
| `title` | yes | Sentence case, matches the kebab portion of the filename |
| `status` | yes | `accepted` \| `superseded` \| `deprecated` |
| `date` | yes | `YYYY-MM-DD` |
| `scope` | new ADRs | `universal` \| `module` \| `integration` \| `operational` — decides which changes load the ADR; absent on pre-v0.20 ADRs (*unclassified*) |
| `modules` | when `scope: module` | List of Bower module names; omit when no specific module is implicated |
| `topics` | no | Kebab-case subject keywords for topical matching (e.g. `streaming`) |
| `supersedes` | no | List of ADR IDs this entry replaces |
| `superseded-by` | no | List of ADR IDs that replaced this entry |

Body sections (in order): `## Context`, `## Decision`, `## Consequences`, `## Alternatives considered`.

Filter by `status: accepted` for "what's true now." Older statuses are historical. Only `scope: universal` ADRs apply to every change; commands select the rest by module, topic, or title relevance.

## Active decisions

| ID | Title | Scope | Modules | Topics | Date |
|---|---|---|---|---|---|
| [ADR-NNNN](/docs/adr/NNNN-kebab-title.md) | <title> | <scope or *unclassified*> | <modules or —> | <topics or —> | <date> |

(Listed by ascending ID. Includes all `status: accepted` ADRs. An ADR with no `scope` field is shown as *unclassified* — a pre-v0.20 entry awaiting classification; commands treat it as loadable on module or topical match only, never as universal.)

## Superseded and deprecated

| ID | Title | Status | Superseded by | Date |
|---|---|---|---|---|

(Listed by ascending ID. Includes `status: superseded` and `deprecated`. Omit the section heading if empty.)
```

The schema section is **boilerplate** — on first generation, write it verbatim. It is the canonical schema reference for the project. On regeneration, treat it as curated: if the project has elaborated it (e.g. expanded the field notes, added lifecycle or access-pattern prose), leave that intact rather than overwriting it with this seed. The tables underneath are derived from frontmatter and are always recomputed.

## Rules

- **Preserve, don't flatten.** When an index file already exists, update derived values in place per the Regeneration contract; never replace a richer existing file with the seed template. The templates in this skill are minimums, not the required shape.
- Order modules in `docs/index.md` by dependency sequence (build order), not alphabetically
- Derive status markers from status.md files: ✓ 🚧 ⏸ 🟡 🔴 🔧
- If a feature listed in a module's `## Build order` has **no** `status.md` (an adopted feature awaiting its first Bower touch — see the adoption banner), take its marker from the build-order line as-is. Do **not** treat a missing `status.md` as an error and do **not** synthesize `✓` from the feature merely existing in code — adoption marks as-built features `🚧`, and only verified work promotes them to `✓`.
- Module-level status is the "worst" status across both its feature markers *and* its `## Module integration` `Test:` marker (🔴 > 🟡 > 🚧 > ⏸ > 🔧 > ✓). A module with all features ✓ but module integration ⏸ surfaces as 🚧 — the constitution's verified-for-✓ rule made observable.
- Only include sections that exist (skip Design Context if no `design/` and no `adr/` directory)
- Include a brief description for each module, taken from that module's entry in `docs/architecture.md` `## Software architecture` — its one-line purpose, condensed if needed. Module purpose has exactly one home and that is it. Do **not** source the description from `module-status.md`: that file is operational (integration marker, build order, integration notes) and defines no description field, so taking one from there means either paraphrasing the integration `Notes:` — which states what the boundary test asserts, not what the module is for — or inducing projects to grow a duplicate purpose line that nothing maintains. If a module has no `## Software architecture` entry, omit its description rather than inventing one, and note the gap in the run summary.
- If no modules exist yet, write the Core System and Design Context sections only
- For ADR tables: render `scope` literally; an accepted ADR with no `scope` field is *unclassified* (pre-v0.20) — never promote it to universal. Order ADRs by ID ascending. Do **not** invent rows — read frontmatter literally.
- If any accepted ADRs are unclassified, add one line under the active-decisions table: `N unclassified pre-v0.20 ADRs — classify by adding scope/topics frontmatter (see the v0.20 migration notes in _bower/changes.md).`
- If an ADR is malformed (missing required field, unknown status), include it in a final `## Malformed` section with the file path and the issue, so it can be fixed manually. This is the only way schema violations surface.
- Ignore any `docs/modules/*/review-plan.md` — it is a transient `/b-review` work list, not project state, and never appears in the index.
- Preserve a `🌱 Adoption in progress` banner at the top of `docs/index.md` verbatim if present — it is the adoption-phase flag (curated structure), not derived state. It is removed only by hand when `docs/adoption-ledger.md` is emptied, never by regeneration.
