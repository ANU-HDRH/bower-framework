# Project Context

This project follows the Bower AI-assisted development pattern.

**Start here:** [docs/index.md](docs/index.md) — Project navigation and status

**Development conventions:** [docs/constitution.md](docs/constitution.md) — Process and standards

All documentation in `docs/` represents current state (living documents).

## Project-Specific Code Standards

### Python Type Hints
- Use modern type hints (Python 3.11+)
- No need to import types like `List`, `Dict` from typing module
- Use `list[str]`, `dict[str, int]` syntax
- Type hint all function signatures and complex variables
