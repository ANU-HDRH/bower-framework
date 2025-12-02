# Bower Framework

A lightweight, maintainable documentation pattern for AI-assisted research software engineering.

> **Work in Progress** — This repository demonstrates the Bower Framework through a worked example. The framework and its documentation are under active development.

## What is Bower?

Bower is a development pattern designed for research software projects using AI coding assistants (Claude Code, Cursor, etc.). It emphasises:

- **Living documentation** — Documents update in place, not as temporal phases
- **Feature modules** — Logical grouping for integration testing and system boundaries
- **AI discoverability** — Clear structure that AI agents can navigate without extensive searching
- **Planning before building** — Specification-driven development without excessive ceremony

The pattern borrows from [SpecKit](https://github.com/github/spec-kit) (planning discipline) and [OpenSpec](https://github.com/Fission-AI/OpenSpec) (living documentation), but optimises for small research teams and the full prototype-to-infrastructure lifecycle.

## Documentation

- **[bower.md](bower.md)** — Full framework specification with templates and guidance
- **[docs/constitution.md](docs/constitution.md)** — Development process conventions (reusable template)
- **[docs/index.md](docs/index.md)** — Example project navigation (Kancil web scraping pipeline)
- **[docs/architecture.md](docs/architecture.md)** — Example system architecture

## Example Project

This repository includes a worked example based on **Kancil**, a web scraping pipeline for extracting organisational information from interest group websites. The `docs/` folder demonstrates the Bower structure:

```
docs/
├── index.md                  # Project navigation
├── constitution.md           # Process conventions
├── architecture.md           # System design
├── design/                   # Problem space and decisions
└── modules/                  # Feature documentation
    ├── harvester/            # Web scraping module
    ├── processor/            # Content cleaning module
    ├── extractor/            # LLM extraction module
    └── orchestration/        # Batch processing module
```

## Getting Started

To adopt Bower for your project:

1. Read [bower.md](bower.md) for the full specification
2. Copy [docs/constitution.md](docs/constitution.md) as your starting template
3. Create your `docs/index.md` and `docs/architecture.md`
4. Add a `CLAUDE.md` (or equivalent) pointing to your docs

## About

A project by the **HASS Digital Research Hub** at the **Australian National University**.

## License

MIT
