# Bower Framework Changes

Versioned log of framework changes. Most recent first. Each entry: what changed, why, and any migration notes for projects already on a previous version.

This file is the changelog for the *framework itself* — not for projects built with it. Project-level history belongs in git.

---

## v0.8 — 2026-05-04

### Module-integration tests are first-class; literal-command handoffs everywhere; commands renamed to `/b-*`; design router collapsed; `/b-feature` made explicit about modify/remove intents

**What changed**

- **Command prefix renamed from `/bower-*` to `/b-*`.** Every slash command now uses a one-letter namespace: `/b-design`, `/b-feature`, `/b-module`, `/b-integration`, `/b-recap`, `/b-index`, `/b-spec`. Saves keystrokes per invocation while keeping a namespace to avoid collision with Claude Code built-ins or other plugins. No alias kept — documentation is the migration path.
- **`/b-design` and `/b-design-full` collapsed.** The old `/b-design` was a router that asked the user "is this Full Design or Lightweight Change?" and dispatched accordingly. In practice that decision is one the user has already made by the time they type a command, and `/b-feature` already redirects back to design when a request turns out to need architectural change. The router added a step without adding judgement. `/b-design` now *is* the five-stage design (the former `/b-design-full`); `/b-feature` covers everything else. Two design-side entry points become one.
- **`/b-feature` reframed as the universal change command.** Previously titled "Lightweight Change" with framing biased toward additive feature work, the command now explicitly covers three intents — **add**, **modify**, **remove** — with intent-specific guidance in Step 5 (Update Documentation). Step 1 gains a clause for modify/remove: read sibling features' `plan.md` files in the same module to find outbound references to the behaviour being changed, so cross-feature ripple isn't missed. Step 2 Impact requires *naming the specific `plan.md` files that need updating* rather than a generic "documentation" line. Step 5 add-intent explicitly appends the new feature to `## Build order` (the build order is a living document post-MVP, not a Stage-4 contract). Step 5 also routes the `Next move:` to `/b-integration <module>` when the change shifted what the integration test must assert. CLAUDE.md gains a "Post-MVP Work: When to Use Which" section codifying the bias toward `/b-feature` and the narrow trigger for `/b-design`.
- New command **`/b-integration <module>`** — gate-implement-reconcile flow scoped to a single deliverable: the module-boundary integration test. Mirrors `/b-feature`'s shape. Reads `module-status.md`'s integration prose plus each feature's `plan.md`, proposes a concrete file path and assertions, gates before writing, runs the test, and flips the module-integration marker on success.
- New schema in `module-status.md`: a `## Module integration` section with its own status marker, populated at design time and maintained as the integration test is built.

  ```markdown
  ## Module integration
  Test: <path or "not yet defined"> — ⏸ | 🚧 | ✓ | 🟡 | 🔴
  Notes: <one-line behavioural description carried forward from Stage 4>
  ```

- **Literal-command handoff rule** — every command that emits a "next move" (in `status.md`, in handoff blocks, in `/b-recap` output) must name the exact slash command to type next, not free prose. Variants like "write the integration test" are out; `Run /b-integration <module>` is in. Applies to `/b-feature`, `/b-module`, `/b-design`, `/b-recap`, and `/b-integration` itself.
- **Module-level marker is now a floor, not a sum.** `/b-index` computes a module's status as the worst of (its feature markers, its module-integration marker). A module with all features ✓ but integration ⏸ surfaces as 🚧, not ✓ — making the constitution's verified-for-✓ rule observable rather than aspirational.
- `/b-recap` now flags "all features ✓, module integration ⏸" explicitly and recommends `/b-integration <module>` as the next move.
- `/b-design` Stage 4 / writing step populates the new `## Module integration` section in each `module-status.md` placeholder, with `Test: not yet defined — ⏸` and the integration prose carried into `Notes:`.
- `/b-module` Step 4/5 now flips the new marker on the in-pass integration test (behavioural parity, just bookkeeping).

**Why**

Real-project use surfaced two coupled gaps:

1. When a module is built feature-by-feature with `/b-feature`, the module-integration test ends up as a residual with no command, scaffold, or marker. The constitution says ✓ requires the module integration test to pass — but no command enforces this and the test routinely went unbuilt.
2. Resumption pointers in `status.md` files varied in specificity. "Next move: write the integration test" sends the operator hunting; "Next move: `/b-integration foundation`" doesn't. Inconsistent handoffs eat the orientation budget that `status.md` and `/b-recap` exist to protect.

The two changes reinforce each other: a first-class command gives the handoff something concrete to point at, and the literal-command rule guarantees it gets pointed to.

**Migration notes**

- Existing projects on v0.7: each `module-status.md` should gain a `## Module integration` section. Hand-edit once; the schema is two lines plus a notes line. Set the marker to ✓ if the integration test exists and passes, ⏸ if not yet built, or 🟡/🔴 if known broken.
- Existing projects on v0.7: replace the `.claude/commands/bower-*.md` files with the v0.8 `b-*.md` set (drop in from this repo). Old `/bower-*` invocations will stop resolving — use `/b-*` instead. Update any project-level docs that mention the old command names.
- The `/b-design-full` command is gone; what was `/b-design-full` is now just `/b-design`. There is no separate router. Update any project-level docs that referenced `/b-design-full`.
- `/b-index` will start surfacing modules with all features ✓ but integration ⏸ as 🚧. This is a reporting change, not a regression — it reveals state that was always true.
- No source code changes required.
