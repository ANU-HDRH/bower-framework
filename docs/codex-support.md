# Codex spike findings — August 2026

*The surviving section of the v0.33 planning document. Sections 1–5 and 7 — the problem
assessment, the survey of Codex's surfaces, the coupling audit, the solution shape, and the
non-goals — were working material and were removed once v0.33 shipped; `_bower/rationale.md`
→ *One Contract, Two Runtimes* is the durable record of why the dual-runtime delivery has
the shape it has.*

*This section is kept because it is **cited evidence**: `docs/conformance/runs.md`'s M0 spike
block points at it for the C6 row, and `docs/conformance/README.md` names it as an admissible
evidence pointer for rows predating the scenario suite. It is a historical record of what one
run settled on 2026-08-05 — not current framework behaviour, and superseded by the scenario
ledger wherever the two disagree. Do not update it; add rows to `runs.md` instead.*

---

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
