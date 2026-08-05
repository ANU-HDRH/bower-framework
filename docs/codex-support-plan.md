# Codex support — execution plan and milestone state

*Working document for the codex-support branch. Companion to `docs/codex-support.md` (problem assessment, solution shape, and §6 spike findings — read that first in a fresh session). Delete or archive when v0.33 ships.*

**How to resume in a fresh session:** read this file and `docs/codex-support.md`, then execute the next unchecked milestone below. Each milestone is gated — confirm with the operator before starting one, and stop at its end.

Everything lands as **one framework version, v0.33**, cut at M6. No version bump or changelog entry before M6.

## Decisions already made (do not re-litigate)

- **Full §5 sequence on this branch; single v0.33 landing; spike was phase 0** (done).
- **Single-mode generator**: `skills-src/` becomes canonical in M2; the generator has no interim `.claude/`-canonical mode.
- **D1 (spike): the neutral chat-gate wording ships as written** — no Codex-specific reinforcement layer. Restatement-after-non-answer is an explicit conformance criterion (weakest model missed it once).
- **D2 (spike, operator-confirmed): thin AGENTS.md** — project content + a strong one-line "read `_bower/framework.md` before any Bower work" directive. No scaffold-managed inline block, no marker machinery, no 32 KiB budget check. **Knock-on: the CLAUDE.md shim is two lines** — `@AGENTS.md` + `@_bower/framework.md` — so Claude Code keeps guaranteed router loading via include while Codex uses the spike-validated pointer.
- **D3 (spike): tier statement** — invocation, implicit routing, `/b-*` handoff spelling, delegation (TOML natively applied), and read-only roles are supported; **agent-managed refresh of `.agents/`/`.codex/` is a named unsupported primitive** (hard sandbox denial, no approval prompt — spike S6). Codex ships at **experimental** pending conformance runs.
- **Skill naming rule (spike T-c):** the skill *directory* name is the invocation name; SKILL.md `name:` must equal it (generator lint).
- **No collision (spike T-a):** Claude Code does not scan `.agents/skills/`, so the twin layout is safe.
- **`Context: inline` is caller-only** (spike S3 found a delegated agent misapplying it after reading the calling skill's text) — all wording scopes the marker to the calling workflow, never the delegated role.

## Milestones

### ✅ M0 — Behavioural spike (DONE)

Ran 2026-08-05 against codex-cli 0.146.0. Evidence: `~/scratch/codex-spike/spike-log.md` + `transcripts/`. Findings appended to `docs/codex-support.md` §6. All scripted checks passed; S6 (protected-path approval) FAILED as designed-for and inverted the upgrade flow (see D3).

### ✅ M1 — Neutralisation pass (DONE, pending operator smoke test)

All 13 commands + 3 agents + `_bower/framework.md` + `framework-reference.md` + `rationale.md` + both schemas edited; working tree on this branch holds the result (uncommitted).

- `framework.md` gained `## Runtime bindings` (after Working Conventions): operator gates, batch gates, delegation + caller-only inline fallback, the request, handoff spelling, sessions, permission ≠ acceptance.
- Gates: `via AskUserQuestion` → `at an operator gate` (batch sites labelled `batch gate`: b-feature Step 5 PENDING-USER, b-integration PENDING-USER, b-module manual-checks, b-review triage-deselect walk). Decision content preserved verbatim everywhere.
- Delegation: 5 sites neutralised; b-design/b-analysis/b-review **gained** the inline fallback they lacked, with `Context: inline`; b-adopt's `general-purpose`/`Explore` naming removed.
- Arguments: 11 binding lines reformatted to `The request (<label>): $ARGUMENTS`; all other `$ARGUMENTS` mentions (b-design, b-feature, b-review, framework-reference L264) now say "the request".
- b-upgrade already carries the M3 flow: Step 5a writability probe → 5b operator-run scaffold handoff (escalation optional, denial honest) → 5c run; Step 7 new-session line; new critical constraints.
- Schemas: `brief-schema.md` and `review-schema.md` define the optional caller-written `Context: inline` header; implementer report template carries a caller-only comment.
- Agents: negative constraints reworded ("You cannot ask the operator anything — you have no interaction channel"); analyst Phase 1 reads "the project instruction file (AGENTS.md, or CLAUDE.md where the project still uses it)".

Verification run (all green): zero `AskUserQuestion|Agent tool|subagent_type` in `.claude/` and `framework-reference.md`; exactly 11 `$ARGUMENTS` hits, all in binding-line form; `framework.md` Runtime bindings is the only binding-naming site (plus one deliberate explanatory mention in `rationale.md`'s Consultation Gates section); viewer untouched (no `docs/` schema change).

**Remaining before M1 is closed:** operator smoke test on Claude Code — run `/b-feature` and `/b-review` on a fixture or real project (lyrebird) and confirm gates still fire through AskUserQuestion. The 43-site gate audit table (decision/choices-preserved/stop-explicit per original site) is deferred to PR review at M6; the greps above are the working check.

### ✅ M2 — skills-src/ restructure + generator (DONE, uncommitted)

Landed as specified below, with two deliberate refinements:

- **`arguments:` holds only the parenthetical label** (e.g. `the target module`), not the whole binding line. The generator owns the `The request (<label>): …` wrapper, which keeps all 11 binding lines uniform by construction and gives `argument-hint:` its value for free.
- **Write mode prunes orphans as well as reporting them** (`--check` only reports). Only banner-carrying files are ever removed, so a hand-written skill sitting alongside the generated ones is safe — asserted in the test.

State: 16 sources under `skills-src/`, 32 generated files across the four trees, `scripts/build-adapters.cjs`, `tools/adapter-test/` (fixture + 76-assertion runner). `--check` green on the repo and on the fixture; viewer test still green; the regenerated `.claude/` diff against the pre-M2 snapshot is banner + frontmatter only (binding lines round-trip byte-identical). Generated TOML verified against a real parser (`tomllib`) as well as the in-tree round-trip.

<details><summary>Original M2 spec</summary>


1. `git mv .claude/commands/*.md skills-src/commands/`; `git mv .claude/agents/*.md skills-src/agents/`.
2. Header conversion per file: commands gain YAML frontmatter `name` (= filename stem), `description` (one line — start from `framework.md` §Bower Commands descriptions; no `: ` colon-space inside, single line), optional `arguments: <label>`; the `The request (<label>): $ARGUMENTS` line becomes the marker `<!-- bower:arguments -->` (presence ⇔ `arguments:` field, lint-enforced both ways; b-recap and b-index have neither). Agents: `tools:` → `role: read-only | write-capable` (implementer is the only write-capable).
3. **`scripts/build-adapters.cjs`** (new, zero-dep CJS, exports core functions; style of `_bower/viewer/lib/extract.cjs`). CLI: no args = regenerate in place; `--check` = regenerate in memory, byte-compare, lint, exit 1 on drift; `--root <dir>` for fixtures. Four transformations, deterministic (LF-only, sorted inputs, fixed field order, single trailing newline, generated-banner comment naming source + regenerate command):
   - → `.claude/commands/<n>.md`: frontmatter `description:` (+ `argument-hint:` when `arguments:` present); marker → `<label>: $ARGUMENTS`.
   - → `.agents/skills/<n>/SKILL.md`: frontmatter `name:` + `description:` only (never Claude extensions); marker → `<label>: the request as given in the message that invoked this skill.`
   - → `.claude/agents/<n>.md`: `tools:` from role (read-only → `Read, Glob, Grep, Bash`; write-capable adds `Write, Edit`); body verbatim.
   - → `.codex/agents/<n>.toml`: `name`, `description` (basic string, escape `\` then `"`), `sandbox_mode` from role (`read-only`/`workspace-write` — a default, not a boundary), `developer_instructions = """…"""` (CRLF→LF, `\`→`\\`, break `"""` runs; spike T-b confirmed 9.7 KiB bodies parse and apply). Working example of the emission: the spike's hand-generation script (see `~/scratch/codex-spike/.codex/agents/bower-analyst.toml` and the node one-liner in session history — or just re-derive; it is ~20 lines).
   - Lints (fail build): `name` ≠ stem; missing/multi-line/colon-space `description`; `arguments`/marker mismatch; literal `$ARGUMENTS` or `AskUserQuestion` in any body (deny-list constant); orphan detection in `--check` (banner-carrying output with no source).
4. **`tools/adapter-test/run.cjs`** (new, modelled on `tools/viewer-test/run.cjs`): golden comparison over a `fixture-src/` mini-root (2 commands with/without `arguments:`, 2 agents one per role); TOML round-trip `unescape(escape(b)) === b` on adversarial bodies (`"""` runs, trailing backslash, CRLF, unicode) plus every real source; each lint fires; `--check` passes fresh / fails one-byte tamper / fails orphan.
5. Regenerate all four variants and **commit sources + generated together**. Review artifact: diff of regenerated `.claude/` vs pre-M2 must show only banner + frontmatter + binding-line deltas.

</details>

### ⬜ M3 — Scaffold + templates + seeds

Templates (in `_bower/`, excluded from the copy loop like the existing two):
- `_bower/project-AGENTS.md` (new): thin — a heading, the one-line directive "**Before any Bower work — any `/b-*` skill, any change to `docs/` — read `_bower/framework.md` in full.** It is the router for how this project is designed, documented, and changed.", then `## Project-Specific Code Standards`. (Wording validated in spike S10; see `~/scratch/codex-spike/AGENTS.thin.md`.)
- `_bower/project-CLAUDE.md`: becomes the two-line shim `@AGENTS.md` + `@_bower/framework.md`.
- `_bower/project-codex-config.toml` (new): seeded only-if-absent to `.codex/config.toml`; comment header ("project-owned; Codex reads this only after you trust the repo; convenience, not enforcement — Bower's gates are semantic") + `sandbox_mode = "workspace-write"` (the one key spike-verified to apply).

`scripts/scaffold.sh` + `scaffold.ps1` (lockstep):
- **Preflight writability check FIRST** (spike S6): before mutating anything, verify every managed target dir is writable (`.agents/skills/`, `.codex/agents/`, `.claude/`, `_bower/`, e.g. touch/rm a probe file); any failure → print which and the "run this outside the sandbox" message, exit 1 with **zero writes made**. This is what makes a Codex-in-sandbox invocation fail clean instead of split-footprint.
- **`.agents/skills/` — namespace-scoped replace:** rm-rf+recopy each shipped `b-*` dir; prune target `b-*` dirs with no source counterpart (named in summary); **never touch non-`b-*` entries** (standard skills location — projects may keep their own; `b-*`/`bower-*` are declared framework-owned namespaces; note in changelog).
- **`.codex/agents/` — same rule for `bower-*.toml`.**
- **`.codex/config.toml`** seed-if-absent; **`AGENTS.md`** seed-if-absent from `project-AGENTS.md` (thin — no managed block, no rewrite logic); CLAUDE.md seed-if-absent (now the shim). Grown CLAUDE.md and/or grown AGENTS.md are **never edited** — the pointer-line addition is `/b-upgrade`'s judgement migration step.
- Summary lines for the new items; final hint gains "if this ran under Codex, start a new session before further Bower work".

**`tools/scaffold-test/run.sh`** (new, bash temp-dir matrix): fresh seed; second-run zero-diff idempotence; grown CLAUDE.md/AGENTS.md untouched; user skill at `.agents/skills/my-skill/` survives while planted `b-old/` is pruned and named; read-only `.agents/` → exit 1 with zero writes (preflight); `pwsh` parity re-run when available, warn-skip otherwise.

(b-upgrade's 5a/5b/5c flow already landed in M1.)

### ⬜ M4 — Release gate

`scripts/release.sh`, after the viewer-test block, same node-missing-warn shape: `node scripts/build-adapters.cjs --check` (failure message names the regenerate command), then `node tools/adapter-test/run.cjs`, then `bash tools/scaffold-test/run.sh` — each if present. Verify: `--dry-run` passes clean; tamper one generated byte → fails.

### ⬜ M5 — Conformance scenarios

`docs/conformance/` (not scaffolded): `README.md` (how to run; tier rules below; demotion rule — any version changing gate/delegation text re-runs C3+C8 before repeating a tier claim), `c1-design.md` … `c8-batch-gate.md` (each: Setup / Steps incl. adversarial operator inputs / Pass criteria / Tolerated degradations), `runs.md` append-only ledger (runtime × runtime-version × framework-version × scenario → PASS / PASS-WITH-DEGRADATION / FAIL + evidence pointer).

C1 design (empty repo; analyst delegated-or-marked; Stage 0 stops pre-write) · C2 adopt (toy brownfield; groups gated; 🌱 + ledger) · C3 feature **+ gate-refuses-on-silence** (unrelated reply / permission-only / silence → zero writes, choices restated — restatement is a criterion) · C4 interruption/resumption (kill mid-implementation; recap + resume from plan.md + git status) · C5 upgrade (v0.32-pinned project; deny path → zero adapter writes + exact command + honest non-completion; approve/operator-run path → full footprint; new-session handoff) · C6 Codex custom-agent selection (spawn verified in `codex exec --json` `collab_tool_call` events; inline fallback + marker = PASS-WITH-DEGRADATION) · C7 Codex read-only roles per parent mode (porcelain empty) · C8 Codex batch-gate triage (≥6 seeded drifts; groups ≤4; tally; partial re-ask; zero writes before confirmed restatement).

Tiers: **experimental** = clean scaffold install + C3 core once (Codex ships here at v0.33). **supported** = full green C1–C8 with every degradation named; any C3 silence FAIL blocks graduation. Claude Code runs C1–C5 as the regression baseline. Spike transcripts (`~/scratch/codex-spike/transcripts/`) are admissible evidence for the C6/C7 rows — don't re-spend on what S3/S5 already proved. **Note: C-runs cost real tokens on the operator's OpenRouter key at xhigh — batch them deliberately.**

### ⬜ M6 — v0.33 docs + release

- `_bower/changes.md`: terse v0.33 entry + Version index row (migration class **judgement**) + `### Migration`, self-contained, covering: (1) new dirs/files appear mechanically (`.agents/skills/b-*`, `.codex/agents/bower-*`, `.codex/config.toml` seed, `AGENTS.md` seed) — no action to stay Claude-only; (2) **judgement step**: ensure `AGENTS.md` exists with the router directive and project content (move grown CLAUDE.md body content there; CLAUDE.md becomes the two-line shim `@AGENTS.md` + `@_bower/framework.md`); operator eyeballs the result; (3) instruction bodies now runtime-neutral via Runtime bindings — delivered by the scaffold, no action; (4) Codex notes: trust prompt is a hard gate on first open ("nothing Bower ships is reachable until you accept"); after an upgrade under Codex, start a new session; `.agents/`/`.codex/` are sandbox-protected — upgrades hand you the scaffold command to run yourself; (5) `.codex/config.toml` is convenience defaults, seeded only-if-absent.
- `_bower/rationale.md`: new section "One Contract, Two Runtimes" — conformance-not-translation; the gate contract (workflow owns the decision / adapter owns the interaction / permission ≠ acceptance); conversational batch gate; thin-pointer AGENTS.md citing the S10 3/3 verdict and the two-line shim asymmetry; named degradations and tiers.
- `_bower/roadmap.md`: replace the beyond-Claude item with the residual (plugin distribution; further runtimes; Codex experimental→supported, trigger = green `docs/conformance/runs.md` rows); touch the context-optimisation cross-reference.
- Version bump ×4 (`_bower/VERSION`, `framework.md` heading, `README.md` heading, changes.md heading) **+ viewer `SCHEMA_VERSION` → '0.33'** (release.sh requires equality even with no schema change). README gains a dual-runtime paragraph with "Codex: experimental".
- Contributor `CLAUDE.md`: repository-layout tree (skills-src/, .agents/, .codex/, new templates, tools/adapter-test, tools/scaffold-test, docs/conformance/); replace "edit `.claude/commands/` directly" posture with "edit `skills-src/` only; run `node scripts/build-adapters.cjs`; commit sources + generated together"; template paragraph updated.
- PR review artifact: the 43-site gate audit table (per original AskUserQuestion site: decision, choices preserved y/n, stop explicit already/added, single/batch) — walk the M1 diff.
- `scripts/release.sh --dry-run`, merge, release.

## Standing constraints

- Generated variants are checked in; scaffold stays a dumb copier; transformations mechanical only, never prose rewriting.
- No runtime detection inside instruction bodies beyond the Runtime bindings section.
- No document-schema changes → viewer untouched (verify against its README's Schema contract table if in doubt).
- `skills-src/` and `tools/` are never scaffolded.
- Commit only when the operator asks; each milestone ends with a stop and a gate.
