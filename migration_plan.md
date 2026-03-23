Let me peek at the docs folder in the bower project before writing this up, just to make sure I'm not missing anything.Good, got the lay of the land. Here's the migration plan:

---

**Bower v2 Migration Plan**

**Goal:** Refactor the framework so that process knowledge lives in CC slash commands, structural/reference knowledge lives in CLAUDE.md, and the whole thing ships as an adoptable kit.

---

**Phase 1: Distil the reference layer**

Rewrite `bower.md` into a compact `CLAUDE.md` template that teams copy into their projects. It should cover: the file structure, the living docs principle, status markers, what each core file is for, and a pointer to `docs/index.md` as the navigation entry point. Nothing procedural — no phases, no prompts, no workflows. Target: fits comfortably in a single screen.

The current `constitution.md` template is mostly good and stays as-is. It already reads more like agent instructions than the main docs do.

---

**Phase 2: Define the command set**

Four commands to start:

- `bower-start.md` — the entry point. Takes a description of what you want to do, reads current architecture (if any), does a brief analysis, then AskUserQuestion: Heavy design (recommended) / Lightweight change. Routes accordingly. For new projects with no existing architecture, auto-routes to heavy.
- `bower-design.md` — the heavyweight four-stage flow. Problem framing → design decisions → architecture synthesis → module planning. Hard gates between stages, writes the three design files plus populates index.md. Does not touch code.
- `bower-feature.md` — the lightweight flow. Describe behaviour change → CC proposes affected components and technological changes → acceptance criteria proposed → human confirms → implementation plan. One gate before any code.
- `bower-index.md` — regenerates index.md by scanning docs/modules/ for status markers. Deterministic, no gate needed.

Scaffolding (`bower-new-component`, `bower-new-module`) can come in a second pass — they're useful but not blocking.

---

**Phase 3: Write the commands**

Write each command file following the `/extract` pattern you already have: named stages, explicit "present and wait" gates, prescribed output formats, and a "what not to do" section. Start with `bower-design.md` since that's the most complex and will stress-test the format. Then `bower-feature.md`. Then the entry point `bower-start.md` last, once you know what it's routing into.

Keep the template files (plan.md, status.md, module-status.md) as actual files in a `templates/` directory rather than embedding them in command files — commands reference them, which means they're also human-readable without opening a command file.

---

**Phase 4: Restructure the repo**

The new repo shape:

```
bower-framework/
├── CLAUDE.md               ← the template teams copy
├── templates/
│   ├── plan.md
│   ├── status.md
│   ├── module-status.md
│   ├── constitution.md
│   └── index.md
├── .claude/
│   └── commands/
│       ├── bower-start.md
│       ├── bower-design.md
│       ├── bower-feature.md
│       └── bower-index.md
├── docs/                   ← the Kancil worked example, kept as-is
└── README.md               ← updated getting started
```

The old `bower.md` and `method.md` either get archived or folded into a `docs/rationale.md` for people who want the "why" — but they're no longer the operational core.

---

**Phase 5: Validate on robots/**

Run `bower-design.md` on the tool project that's been sitting in `robots/`. That's your integration test for the framework. If the command produces sensible outputs for a real project, it's done. If it doesn't, you'll know exactly what's missing.

---

**Suggested CC session order:** Phase 1 and 4 restructuring first (get the repo shape right), then Phase 3 command authoring (the meaty bit), then Phase 5 validation. Phase 2 is just this plan translated into decisions — you've basically already done it in this conversation.
