# Codex support — problem assessment and solution shape

*Planning document, August 2026. Not framework behaviour; nothing here is committed until an implementation lands. Companion to the roadmap item "Compatibility with agents beyond Claude Code", whose framing — behavioural conformance, not filename translation — this document adopts.*

## 1. The problem

Bower's contracts are mostly runtime-neutral: gates before writes, document and status schemas, role boundaries, explicit next-action handoffs. Its *delivery* is Claude-specific: `CLAUDE.md` + `@`-includes, `.claude/commands/`, `.claude/agents/`, `.claude/settings.json`, and instruction text that names Claude Code tools (`AskUserQuestion`, "the Agent tool with `subagent_type`"). Supporting OpenAI Codex means preserving the contracts across a second delivery surface — and the hard constraint is that **one project must be able to carry both runtimes at once**, for cross-tool review and for migrating between tools without a flag day.

## 2. What Codex offers (surveyed August 2026)

Facts below are from the official Codex docs (`developers.openai.com/codex/*`, now redirecting to `learn.chatgpt.com/docs/*`); items marked ⚠ rest on secondary sources and must be verified against the installed CLI before implementation.

- **Skills — the big convergence.** Codex natively supports the Agent Skills standard (`SKILL.md` + YAML frontmatter, the same standard Claude Code implements). Project skills live in **`.agents/skills/<name>/SKILL.md`** (vs Claude's `.claude/skills/`). Codex reads the standard fields (`name`, `description`); it ignores Claude-specific extensions, so a dual-audience SKILL.md is safe. Invocation is `$skill-name` explicit or description-matched implicit. ⚠ `allowed-tools` support is unconfirmed — assume Codex does not restrict tools via skill frontmatter.
- **Custom prompts are deprecated.** `~/.codex/prompts/` is user-level only, has no project scope, and the docs say "use skills for reusable prompts". Skills are the only viable command surface for a scaffolder.
- **Subagents exist, project-scoped, in TOML.** `.codex/agents/<name>.toml` with `name`, `description`, `developer_instructions`, plus per-agent `model`, `sandbox_mode` (`"read-only"` gives us the analyst/reviewer role boundary), `mcp_servers`. Delegation is prompt-driven ("spawn the bower-analyst subagent" in instructions works); there is no user-facing Task-tool schema. ⚠ Reports that recent CLI versions encrypt parent→subagent instructions for some models — audit-visibility concern only, doesn't block the design.
- **AGENTS.md, concatenated, no includes.** Codex merges `~/.codex/AGENTS.md` + every `AGENTS.md` from git root down to CWD, capped at 32 KiB combined by default. **There is no `@`-include mechanism**, and Codex does not read `CLAUDE.md`. Claude Code, conversely, still does not read `AGENTS.md` natively — but its `@`-include can pull one in.
- **`.codex/config.toml`** is project-scoped config (sandbox mode, approval policy) but is **ignored until the operator explicitly trusts the repo** — a repo cannot pre-authorise itself. Fine for us: Bower's seeded permissions are safe-read-only conveniences, not requirements. ⚠ The granular approval-policy schema is version-dependent.

## 3. Where Bower is actually coupled to Claude Code

An inventory of the couplings, from a pass over the repo:

| Primitive | Claude delivery today | Codex equivalent | Adaptation cost |
|---|---|---|---|
| Command bodies (the 13 `/b-*` workflows) | `.claude/commands/*.md`, plain markdown + `$ARGUMENTS` | `.agents/skills/<name>/SKILL.md` (standard skills) | **Low** — bodies are already runtime-neutral prose; needs frontmatter added and `$ARGUMENTS` rephrased |
| Interactive gates | `AskUserQuestion` named ~40 times across commands/agents | No equivalent tool; ask in chat and stop | **Medium** — needs a neutral gate idiom, not a tool name |
| Subagent delegation | Agent tool + `subagent_type`, defs in `.claude/agents/*.md` (YAML frontmatter: `name`, `description`, `tools`) | Prompt-driven delegation, defs in `.codex/agents/*.toml` (`developer_instructions`, `sandbox_mode`) | **Medium** — same content, different container; `tools:` maps to `sandbox_mode` |
| Instruction discovery | `CLAUDE.md` `@`-includes `_bower/framework.md` | `AGENTS.md`, concatenation only, 32 KiB cap | **Medium** — the one place with no include mechanism |
| Permissions seed | `.claude/settings.json` Bash allowlist | `.codex/config.toml`, trust-gated | **Low** — convenience file either way |
| Scaffold / upgrade ownership | scaffold copies `_bower/` + `.claude/{agents,commands}`, prunes | must also own `.agents/skills/`, `.codex/agents/`, `AGENTS.md` seed | **Low** — mechanical extension |

The load-bearing observation: because both tools now implement the *same skills standard*, the commonality the roadmap item asked to factor out already has a container. We do not need to invent a Bower-neutral format — SKILL.md **is** the neutral format. The divergences reduce to (a) *where the files sit*, (b) *how subagent definitions are packaged*, and (c) *how the always-loaded router is discovered*.

## 4. Shape of the solution

### 4.1 Canonical sources + generated adapters, checked in

One canonical copy of each command body and each agent definition lives in the framework repo; a small build script (`scripts/build-adapters.cjs`, zero-dep like the viewer tooling) generates the per-runtime variants, and **the generated variants are checked in**, not produced at scaffold time. Scaffold stays a dumb file copier; diffs to generated files are reviewable; `scripts/release.sh` gains a "regeneration is clean" gate alongside the viewer test, so a release cannot ship desynchronised adapters.

Proposed layout (framework repo; `skills-src/` is *not* scaffolded):

```
skills-src/                      # canonical, hand-edited
├── commands/b-feature.md        # body + a tiny metadata header (name, description)
└── agents/bower-analyst.md      # body + metadata (role, write-capability)
.claude/commands/b-feature.md    # generated: body, $ARGUMENTS binding
.claude/agents/bower-analyst.md  # generated: YAML frontmatter + body
.agents/skills/b-feature/SKILL.md    # generated: standard frontmatter + same body
.codex/agents/bower-analyst.toml     # generated: developer_instructions = body,
                                     #   sandbox_mode from write-capability
```

Contributors edit `skills-src/` only. The generator's transformations are *mechanical* (wrap in frontmatter, escape TOML, substitute the argument idiom) — never prose rewriting, which would be fragile and unreviewable.

*Alternative considered:* treat `.claude/commands/` as canonical and generate only the Codex side. Rejected as the resting state — it privileges one runtime and invites Claude-only phrasing to creep back in — but it is the right **first implementation step**, since it defers the `skills-src/` restructure until the Codex adapter has proven itself.

### 4.2 Runtime-neutral instruction idioms

The bodies need a one-time editing pass replacing tool names with behavioural contracts:

- **Gate idiom:** "Present the proposal and options, then stop and wait for the operator's explicit choice; do not proceed on silence" — with a per-runtime binding note ("on Claude Code, use `AskUserQuestion`"). The contract (no writes before explicit confirmation) is what conformance tests check, not the tool.
- **Delegation idiom:** "Delegate to the `bower-analyst` subagent and wait for its brief" — Claude binds this to the Agent tool; Codex's prompt-driven delegation acts on the same sentence. Plus an **explicit inline fallback**, already anticipated by the roadmap item: if the runtime cannot delegate, run the agent's instructions inline and say so in the output (fresh-context isolation is degraded, not silently faked — the report should carry a `context: inline` marker so `/b-review`'s "adversarial freshness" claim stays honest).
- **Argument idiom:** `$ARGUMENTS` (Claude commands) vs the invoking message (Codex skills). Neutral body text: "the user's request as given when this skill was invoked"; the Claude adapter appends the `$ARGUMENTS` line mechanically.

The per-runtime binding notes live in one place — a short "Runtime bindings" section in `_bower/framework.md` — not repeated in every command.

### 4.3 Instruction discovery: AGENTS.md as the seed, CLAUDE.md as a shim

This is the only surface with no clean shared mechanism, because Codex has no include. Proposed:

- New projects are seeded with **`AGENTS.md`** as the project instruction file: the project-specific content (what `project-CLAUDE.md`'s body is today) plus a **scaffold-managed delimited block** (`<!-- bower:framework:begin/end -->`) into which the scaffold inlines `_bower/framework.md` verbatim (13 KiB today; budget-check against the 32 KiB cap at build time, since the cap covers *all* concatenated AGENTS.md files).
- **`CLAUDE.md` becomes a one-line shim:** `@AGENTS.md`. Claude Code gets identical content through its include mechanism.
- The inlined block is a *generated copy*, but an owned one: scaffold rewrites it on every run, `/b-upgrade` runs scaffold, and the framework version string inside it makes staleness detectable. This is the same "derived state with an owner" posture as `docs/index.md`.

*Alternative considered:* a thin AGENTS.md that says "read `_bower/framework.md` before any Bower work". Cheaper and drift-free, but it converts *guaranteed* context loading into model compliance, and the router is exactly the file Bower cannot afford to have skipped. Worth testing during validation; the delimited inline block is the safer default.

Existing Claude-only projects migrate via a `/b-upgrade` note (move CLAUDE.md body content into AGENTS.md, leave the shim) — mechanical, but a judgement-flagged step since projects have grown their own CLAUDE.md content.

### 4.4 Scaffold, upgrade, and the dual-runtime default

- Scaffold emits **both footprints by default** (`.claude/` + `.agents/skills/` + `.codex/` + AGENTS.md seed). The Codex footprint is a few tens of KiB; carrying it in a Claude-only project is cheaper than a flag matrix, and the stated constraint is that dual-runtime is the normal case. A skip flag can come later if anyone objects to the clutter.
- Pruning extends to the new directories with the same wholesale-replace rule.
- `.codex/config.toml` is seeded only-if-absent, like `settings.json`, mirroring the same safe read-only posture (`sandbox_mode` is per-invocation/trust-gated anyway; the seed is convenience).
- `/b-upgrade` itself must *run* on both runtimes — it is a skill like any other. Its migration-notes contract is unchanged.

### 4.5 Conformance, tiers, and what "supported" means

Per the roadmap item: validation is the same disposable-repository scenarios run against each adapter — `design`, `adopt`, `feature` (including the gate refusing to proceed on silence), interruption/resumption, `upgrade`. Codex enters as **experimental** on the roadmap's stated minimum evidence (successful installation + one gated write workflow) and graduates when the scenario set passes. Where Codex cannot provide a primitive (e.g. if prompt-driven delegation proves unreliable), the adapter *names* the degradation (support tiers) rather than quietly weakening the contract.

## 5. Open questions to settle before implementation

1. **Verify against the installed Codex CLI** (all ⚠ items): skills discovery from `.agents/skills/`, implicit vs `$name` invocation ergonomics, whether skills receive argument text usably, the subagent TOML schema as shipped, and whether prompt-driven delegation reliably spawns a `.codex/agents/` definition. A half-day spike in a disposable repo, before any generator is written.
2. **Does Claude Code stay on `.claude/commands/` or move to `.claude/skills/`?** Both work; commands are the current contract and moving is a project-side migration with no Codex-side benefit. Default: stay on commands.
3. **Gate reliability on Codex.** Claude's `AskUserQuestion` structurally blocks; a prose "stop and wait" only behaviourally blocks. If the spike shows Codex proceeding through gates, this becomes the top conformance risk and may need Codex-specific reinforcement (e.g. approval-policy settings).
4. **Inline-vs-thin AGENTS.md** (§4.3) — decide after testing whether Codex reliably follows a "read this file first" pointer.
5. **Sequencing.** Suggested: spike (Q1) → generator + Codex adapters with `.claude/` as temporary canonical → AGENTS.md/CLAUDE.md shim change → `skills-src/` restructure → conformance scenarios → changelog + migration notes. Each step is independently shippable except the last two.

## 6. What this deliberately does not do

- No attempt at parity for Claude-specific niceties (`context: fork`, per-skill `allowed-tools`, settings allowlists) — those degrade to Codex's coarser sandbox model, named as such.
- No runtime detection inside instruction bodies ("if you are Codex…") beyond the single Runtime bindings section — branching prose is how the two variants drift.
- No changes to any document schema, so the viewer is untouched (`extract.cjs` parses `docs/`, which is runtime-agnostic by construction).
