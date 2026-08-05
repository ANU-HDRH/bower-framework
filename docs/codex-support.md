# Codex support — problem assessment and solution shape

*Planning document, August 2026. Not framework behaviour; nothing here is committed until an implementation lands. Companion to the roadmap item "Compatibility with agents beyond Claude Code", whose framing — behavioural conformance, not filename translation — this document adopts.*

## 1. The problem

Bower's contracts are mostly runtime-neutral: gates before writes, document and status schemas, role boundaries, explicit next-action handoffs. Its *delivery* is Claude-specific: `CLAUDE.md` + `@`-includes, `.claude/commands/`, `.claude/agents/`, `.claude/settings.json`, and instruction text that names Claude Code tools (`AskUserQuestion`, "the Agent tool with `subagent_type`"). Supporting OpenAI Codex means preserving the contracts across a second delivery surface — and the hard constraint is that **one project must be able to carry both runtimes at once**, for cross-tool review and for migrating between tools without a flag day.

## 2. What Codex offers (surveyed August 2026)

Facts below are from the current official Codex manual (`developers.openai.com/codex/*`, now redirecting to `learn.chatgpt.com/docs/*`) and were checked against the installed `codex-cli 0.146.0` where CLI feature state is relevant. The file locations and schemas below are documented behaviour; the behavioural edges called out in §5 still need a disposable-repository spike.

- **Skills — the big convergence.** Codex natively supports the [open Agent Skills standard](https://learn.chatgpt.com/docs/build-skills) (`SKILL.md` + YAML frontmatter, the same standard Claude Code implements). Repository skills live in **`.agents/skills/<name>/SKILL.md`**; Codex scans that directory at every level from the CWD up to the repository root. Codex requires the standard `name` and `description` fields. Invocation is explicit by mentioning the skill with `$` (or selecting it through `/skills`) or implicit by description match. A shared body is safe, but a shared *frontmatter block* must stay within the intersection both runtimes document: Codex does not document Claude's `allowed-tools` extension as an enforced restriction, and its `agents/openai.yaml` tool declarations describe dependencies rather than restricting the runtime tool set.
- **Custom prompts are deprecated.** `~/.codex/prompts/` is user-level only, has no project scope, and the docs say "use skills for reusable prompts". Skills are the only viable command surface for a scaffolder.
- **Subagents exist, with project-scoped custom agents in TOML.** Current Codex releases enable multi-agent support by default. A project can define `.codex/agents/<name>.toml` with required `name`, `description`, and `developer_instructions`, plus supported session settings such as `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, and `skills.config`. Applicable `AGENTS.md` or skill instructions can request delegation, so "delegate to the `bower-analyst` custom agent" is a supported trigger shape; there is no user-authored Task-tool call schema to embed in the workflow. Important boundary: subagents inherit the parent permission mode, and Codex reapplies live parent overrides when spawning even if the custom agent file has different defaults. `sandbox_mode = "read-only"` is therefore a useful role default, not an unconditional capability boundary; pair it with explicit no-write instructions and test it under the supported parent modes.
- **AGENTS.md, layered, no includes.** Codex selects one global instruction file (`~/.codex/AGENTS.override.md`, otherwise `~/.codex/AGENTS.md`), then one instruction file per directory from the project root down to the CWD (`AGENTS.override.md` before `AGENTS.md`), with nearer files taking precedence. The concatenated project chain is capped at 32 KiB by default. **There is no `@`-include mechanism**, and Codex does not discover `CLAUDE.md` as project guidance by default (an operator can configure it as a fallback name or run Codex's one-time import flow, neither of which expands Claude `@`-includes). Claude Code, conversely, still does not read `AGENTS.md` natively — but its `@`-include can pull one in.
- **`.codex/config.toml`** is project-scoped config (including sandbox and approval defaults), and Codex loads project `.codex/` configuration layers only after the operator trusts the repo — a repo cannot pre-authorise itself. CLI/session overrides and managed policy can also supersede project defaults. Approval policy governs whether tool execution pauses for permission; it is not a substitute for Bower's semantic content gates.
- **The adapter directories are protected during normal writes.** In Codex's default `workspace-write` sandbox, existing repo-root `.agents/` and `.codex/` directories are recursively read-only protected paths. A user-run scaffold can create or refresh them normally, but a Codex-run `/b-upgrade` must obtain explicit approval to run the scaffold outside that sandbox boundary. This is a visible upgrade step, not a reason to relocate the adapters.
- **Instruction refresh is session-bound.** Codex builds the `AGENTS.md` instruction chain once per run. Skills can be detected after changes, but config and instruction changes should not be assumed to rewrite the context of the task already in flight. Scaffold and upgrade completion must therefore tell the operator to start a new Codex session before relying on the refreshed Bower runtime.
- **Plugins are a distribution option, not a better project adapter.** Codex plugins can package installable skills (and optional MCP tools), but they require separate installation and a new session and are not available in every Codex surface, including the IDE extension. The official guidance calls direct `.agents/skills/` folders the appropriate shape for repo-scoped workflows, so a plugin may be useful later for discovery but does not replace the checked-in dual-runtime footprint.

## 3. Where Bower is actually coupled to Claude Code

An inventory of the couplings, from a pass over the repo:

| Primitive | Claude delivery today | Codex equivalent | Adaptation cost |
|---|---|---|---|
| Command bodies (the 13 `/b-*` workflows) | `.claude/commands/*.md`, plain markdown + `$ARGUMENTS` | `.agents/skills/<name>/SKILL.md` (standard skills) | **Low for packaging** — the core workflow prose carries across; frontmatter and arguments need adapters, while the tool-name edits are accounted for in the gate/delegation rows below |
| Interactive gates | `AskUserQuestion` named ~40 times across commands/agents | No stable dedicated question tool a project workflow can assume; ask in chat, end the turn, and wait | **Medium** — needs a neutral gate idiom, not a tool name |
| Subagent delegation | Agent tool + `subagent_type`, defs in `.claude/agents/*.md` (YAML frontmatter: `name`, `description`, `tools`) | Prompt-driven delegation, defs in `.codex/agents/*.toml` (`developer_instructions`, session defaults) | **Medium** — same role content, different container; Claude's `tools:` allowlist has no direct Codex mapping, while `sandbox_mode` controls filesystem/network execution and can be superseded by live parent settings |
| Instruction discovery | `CLAUDE.md` `@`-includes `_bower/framework.md` | `AGENTS.md`, layered/concatenated only, 32 KiB project-instruction cap | **Medium** — the one place with no include mechanism |
| Permissions seed | `.claude/settings.json` Bash allowlist | `.codex/config.toml` sandbox/approval defaults, trust-gated and overridable | **Low** — convenience file either way, but not exact policy parity |
| Scaffold / upgrade ownership | scaffold copies `_bower/` + `.claude/{agents,commands}`, prunes | must also own `.agents/skills/`, `.codex/agents/`, `AGENTS.md` seed | **Medium** — copying is mechanical, but an upgrade initiated inside Codex needs explicit approval to refresh the protected `.agents/` and `.codex/` trees |

The load-bearing observation: because both tools now implement the *same skills standard*, the common workflow body the roadmap item asked to factor out already has a natural container. We do not need to invent a Bower-specific command language. Keep runtime-specific frontmatter and argument binding in generated adapters; the divergences reduce to (a) *where the files sit*, (b) *how subagent definitions and role restrictions are packaged*, and (c) *how the always-loaded router is discovered*.

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
                                     #   sandbox default from role metadata
```

Contributors edit `skills-src/` only. The generator's transformations are *mechanical* (wrap in frontmatter, escape TOML, substitute the argument idiom) — never prose rewriting, which would be fragile and unreviewable.

*Alternative considered:* treat `.claude/commands/` as canonical and generate only the Codex side. Rejected as the resting state — it privileges one runtime and invites Claude-only phrasing to creep back in — but it is the right **first implementation step**, since it defers the `skills-src/` restructure until the Codex adapter has proven itself.

### 4.2 Runtime-neutral instruction idioms

The bodies need a one-time editing pass replacing tool names with behavioural contracts:

- **Gate idiom:** "Present the proposal and options, then stop and wait for the operator's explicit choice; do not proceed on silence" — with per-runtime binding notes ("on Claude Code, use `AskUserQuestion`"; "on Codex, ask in the ordinary chat response and end the turn"). The contract (no writes before explicit confirmation) is what conformance tests check, not the tool. Codex command-execution approval prompts do not satisfy this content gate.
- **Delegation idiom:** "Delegate to the `bower-analyst` subagent and wait for its brief" — Claude binds this to the Agent tool; Codex's prompt-driven delegation acts on the same sentence. Plus an **explicit inline fallback**, already anticipated by the roadmap item: if the runtime cannot delegate, run the agent's instructions inline and say so in the output (fresh-context isolation is degraded, not silently faked — the report should carry a `context: inline` marker so `/b-review`'s "adversarial freshness" claim stays honest).
- **Argument idiom:** `$ARGUMENTS` (Claude commands) vs the invoking message (Codex skills). Neutral body text: "the user's request as given when this skill was invoked"; the Claude adapter appends the `$ARGUMENTS` line mechanically.

The per-runtime binding notes live in one place — a short "Runtime bindings" section in `_bower/framework.md` — not repeated in every command.

#### Gate contract: the workflow owns the decision, the adapter owns the interaction

The runtime-neutral source must define the *semantic gate*, not merely say "ask the user". Each gate specifies:

1. **What is being decided** — for example, approval of an implementation proposal, disposition of a review finding, or confirmation of a manual acceptance check.
2. **What the operator must see before deciding** — the proposal, relevant evidence, consequences, and any uncertainty the command has surfaced.
3. **The available choices and their effects** — normally proceed, revise (with free-form adjustments), defer, or cancel, narrowed where the workflow permits fewer outcomes.
4. **The resume condition** — end the turn and do not perform the gated writes until the operator gives an explicit applicable answer. Silence, an unrelated reply, or approval of a restricted tool call is not acceptance of the proposal.

Those decision semantics stay in the canonical command because they differ by workflow. The generated adapter supplies only the interaction binding:

- **Claude Code:** present the specified content and choices through `AskUserQuestion`, then wait for its result.
- **Codex:** present the same content and choices in the ordinary chat response, end the turn, and interpret the operator's next message against the specified choices. If the reply does not map to one of the presented choices, restate the choices and stop again — the chat binding must re-ask exactly where `AskUserQuestion` would structurally force a re-ask, or the two adapters diverge at the precise point the contract exists to hold them together.

**Batch gates are the stress case for the chat binding.** Most gates are one decision; `/b-review`'s triage is a disposition *per finding*, potentially many in one gate. `AskUserQuestion` handles that with structured options; a chat binding must not compensate by dumping every finding in one block and seeking an omnibus reply — that shape scrolls off the screen, invites open-ended commentary instead of decisions, and produces partial answers. The Codex binding for a batch gate is conversational: present findings one at a time (or in small coherent groups), collect an explicit disposition for each before moving on, and keep a running tally so the operator can see progress through the batch. The audit pass should design this binding against `/b-review` triage first, since it is where "interpret the next message against the choices" is least trivial.

Use **confirmation**, **choice**, or **operator decision** for the semantic gate; reserve **permission** for runtime requests to execute a restricted action. A workflow can encounter both independently: accepting a Bower proposal does not grant a sandbox escalation, and approving a command does not accept the Bower proposal. Most current commands already define their gate-specific choices; the neutralisation pass is an audit that preserves those choices, removes the `AskUserQuestion` coupling, and adds an explicit stop/resume condition wherever it is only implied.

### 4.3 Instruction discovery: AGENTS.md as the seed, CLAUDE.md as a shim

This is the only surface with no clean shared mechanism, because Codex has no include. Proposed:

- New projects are seeded with **`AGENTS.md`** as the project instruction file: the project-specific content (what `project-CLAUDE.md`'s body is today) plus a **scaffold-managed delimited block** (`<!-- bower:framework:begin/end -->`) into which the scaffold inlines `_bower/framework.md` verbatim (13 KiB today; budget-check against the 32 KiB cap at build time, since the cap covers the concatenated project instruction chain from project root to CWD).
- **`CLAUDE.md` becomes a one-line shim:** `@AGENTS.md`. Claude Code gets identical content through its include mechanism.
- The inlined block is a *generated copy*, but an owned one: scaffold rewrites it on every run, `/b-upgrade` runs scaffold, and the framework version string inside it makes staleness detectable. This is the same "derived state with an owner" posture as `docs/index.md`.

*Alternative considered:* a thin AGENTS.md that says "read `_bower/framework.md` before any Bower work". Cheaper and drift-free, but it converts *guaranteed* context loading into model compliance, and the router is exactly the file Bower cannot afford to have skipped. Worth testing during validation; the delimited inline block is the safer default.

Existing Claude-only projects migrate via a `/b-upgrade` note (move CLAUDE.md body content into AGENTS.md, leave the shim) — mechanical, but a judgement-flagged step since projects have grown their own CLAUDE.md content.

### 4.4 Scaffold, upgrade, and the dual-runtime default

- Scaffold emits **both footprints by default** (`.claude/` + `.agents/skills/` + `.codex/` + AGENTS.md seed). The Codex footprint is a few tens of KiB; carrying it in a Claude-only project is cheaper than a flag matrix, and the stated constraint is that dual-runtime is the normal case. A skip flag can come later if anyone objects to the clutter.
- Pruning extends to the new directories with the same wholesale-replace rule.
- `.codex/config.toml` is seeded only-if-absent, like `settings.json`, with conservative sandbox/approval defaults. Treat it as operator-trusted, overridable convenience rather than enforcement: it cannot supply Bower's content gates or guarantee that a child keeps a role-specific sandbox under every live parent override.
- `/b-upgrade` itself must *run* on both runtimes — it is a skill like any other. On Codex it must present the scaffold plan, then request the narrow approval needed to update the protected `.agents/` and `.codex/` directories **before invoking the scaffold at all** — never attempt the scaffold in-sandbox and recover, because an in-sandbox run succeeds on `_bower/` and `.claude/` and then fails at the protected trees, leaving a split footprint whose two runtime adapters sit on different framework versions. If approval is denied, stop with the exact user-run scaffold command rather than reporting a partial upgrade as complete. Complete the current migration under the invoking instructions, then explicitly hand off to a new Codex session for subsequent Bower work; never claim that the running session reloaded the newly written `AGENTS.md` or config. The migration-notes contract is otherwise unchanged.

### 4.5 Conformance, tiers, and what "supported" means

Per the roadmap item: validation is the same disposable-repository scenarios run against each adapter — `design`, `adopt`, `feature` (including the gate refusing to proceed on silence), interruption/resumption, `upgrade`. Codex-specific checks also exercise custom-agent selection and verify that analyst/reviewer work leaves the tree unchanged under each supported parent permission mode. Codex enters as **experimental** on the roadmap's stated minimum evidence (successful installation + one gated write workflow) and graduates when the scenario set passes. Where Codex cannot provide a primitive (e.g. if prompt-driven delegation proves unreliable), the adapter *names* the degradation (support tiers) rather than quietly weakening the contract.

## 5. Open questions to settle before implementation

1. **Verify the remaining behaviour against the installed Codex CLI.** The official manual now establishes `.agents/skills/` discovery, the custom-agent TOML schema, and instruction-triggered delegation. The spike should instead test the behavioural edges Bower depends on: explicit invocation with free-form arguments; implicit routing among thirteen similarly named skills; reliable selection of the named `.codex/agents/` role; project trust effects on config and custom-agent discovery; read-only agent behaviour under the parent permission modes Bower will claim to support; the approve/deny/resume paths when `/b-upgrade` refreshes protected adapter directories; the conversational batch-gate walk-through against a multi-finding `/b-review` triage; and the new-session handoff after instruction/config changes. A half-day spike in a disposable repo, before any generator is written.
2. **Does Claude Code stay on `.claude/commands/` or move to `.claude/skills/`?** Both work; commands are the current contract and moving is a project-side migration with no Codex-side benefit. Default: stay on commands.
3. **Gate reliability on Codex.** Claude's `AskUserQuestion` structurally blocks; a prose "stop and wait" only behaviourally blocks. If the spike shows Codex proceeding through gates, this becomes the top conformance risk and needs Codex-specific instruction or interaction reinforcement. Do not count `approval_policy` as the fix: a tool-execution approval is not an explicit choice among the proposed Bower options.
4. **Inline-vs-thin AGENTS.md** (§4.3) — decide after testing whether Codex reliably follows a "read this file first" pointer.
5. **Sequencing.** Suggested: spike (Q1) → generator + Codex adapters with `.claude/` as temporary canonical → AGENTS.md/CLAUDE.md shim change → `skills-src/` restructure → conformance scenarios → changelog + migration notes. Each step is independently shippable except the last two.

## 6. Spike findings (August 2026) — what the disposable-repo run settled

The §5 Q1 spike ran 2026-08-05 against codex-cli 0.146.0 (gpt-5.6-sol/xhigh via `codex exec`, gpt-5.6-luna/medium in the TUI — deliberately including the weakest supported model). Full verdicts and transcripts: the spike repo's `spike-log.md` and `transcripts/`. Everything below supersedes the corresponding assumption earlier in this document.

**Confirmed as designed (no change to the plan):**

- **Gates hold (Q3 resolved).** The neutral chat-gate wording survived worst-case pressure: non-interactive `codex exec` runs ended *at* the gate with zero writes, including a prompt that said "I trust you, just get it done, no need to check with me". Interactive probes (unrelated reply, permission-approval-only, task switch) produced no gated writes. One gap: after an unrelated question the weakest model answered without restating the gate choices — the canonical wording makes the re-ask imperative, and restatement is an explicit conformance criterion rather than an assumption.
- **The conversational batch gate works as drafted.** Groups ≤4, per-item dispositions, partial answers re-asked only for the remainder, running tally, final restatement before any write, and a correctly-formed routed handoff line.
- **Delegation is real and TOML definitions bind natively.** `codex exec --json` shows `collab_tool_call` events (`spawn_agent`, then `wait`) creating a genuine second thread; a sentinel probe proved the `.codex/agents/*.toml` `developer_instructions` are applied to the spawned agent. Multi-line `"""` bodies (9.7 KiB) parse cleanly.
- **Read-only roles hold under every parent mode** (read-only, workspace-write, danger-full-access), including against an explicit "fix any bugs you notice" temptation — the analyst folded fixes into the brief as proposals.
- **Routing: 5/5 implicit-intent prompts selected the right skill among thirteen `b-*` names; literal `Run /b-feature …` handoff lines route verbatim;** finding references (`according to F<n> in <path>`) survive and load the brief as a primary input.
- **Claude Code does not scan `.agents/skills/`** — no name collision between the generated SKILL.md twins and `.claude/commands/`.
- **Skill naming: the directory name is the invocation name;** the frontmatter `name:` field creates no alias. Generator lint: `name:` must equal the skill directory name.

**Findings that change the design:**

- **§4.3 resolves to the thin AGENTS.md** (the "alternative considered"): three fresh sessions on the weakest model followed a one-line "read `_bower/framework.md` before any Bower work" pointer and oriented correctly — the pre-agreed 3/3 bar. AGENTS.md is therefore project content plus that directive; no scaffold-managed inline block, no marker machinery, no 32 KiB budget concern. Knock-on: the `CLAUDE.md` shim is **two lines** — `@AGENTS.md` *and* `@_bower/framework.md` — so Claude Code keeps guaranteed router loading via its include while Codex uses the validated pointer.
- **§4.4's approval flow does not exist in practice: protected-path writes fail hard.** In workspace-write, a script touching `.agents/`/`.codex/` dies with "Read-only file system" — no approve/deny prompt fires, and the session reports that repository configuration cannot relax the policy. The partial run reproduced the split-footprint hazard exactly as §4.4 predicted (an unprotected file was written before the protected write failed). Consequences: **(a)** the scaffold gains a preflight writability check on every managed target and aborts cleanly before mutating anything; **(b)** `/b-upgrade` on Codex defaults to presenting the plan and handing the operator the exact user-run scaffold command, attempting in-session escalation only where the runtime offers it; agent-managed refresh of the adapter directories is a **named unsupported primitive** in the tier statement.
- **Trust is a hard session gate, not a degraded mode** — declining the trust prompt exits Codex; there is no untrusted state in which discovery can be observed. Migration-note wording: "Codex asks you to trust the repo when you first open it; nothing Bower ships (skills, custom agents, project config) is reachable until you accept."
- **§2's "instruction refresh is session-bound" could not be confirmed** — the mid-session probe named AGENTS.md, so the model plausibly read it as data. The conservative new-session guidance stays, with the claim softened to "do not rely on a running session having reloaded instruction files."
- **A repo-reading subagent can misapply caller-only instructions:** the spawned analyst read the calling skill's inline-fallback text in the repo and falsely stamped `Context: inline` on a genuinely delegated brief. The neutralisation pass must phrase the marker instruction unambiguously as the *caller's* action on the fallback path only.

**Tier outcome (D3):** invocation, routing, handoff spelling, delegation, and read-only roles are all supportable; the one named unsupported primitive is agent-managed adapter refresh. Codex enters v0.33 as **experimental** pending the conformance scenario runs.

## 7. What this deliberately does not do

- No attempt at parity for Claude-specific niceties (`context: fork`, per-skill `allowed-tools`, settings allowlists) — those degrade to Codex's coarser sandbox defaults plus explicit role instructions, named and tested as such.
- No runtime detection inside instruction bodies ("if you are Codex…") beyond the single Runtime bindings section — branching prose is how the two variants drift.
- No changes to any document schema, so the viewer is untouched (`extract.cjs` parses `docs/`, which is runtime-agnostic by construction).
