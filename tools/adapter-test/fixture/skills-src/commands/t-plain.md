---
name: t-plain
description: Fixture command with no argument binding — exercises the marker-absent path.
---

# Fixture Plain

This command takes no request argument. It exists so the generator's "no `arguments` field, no marker" path has a golden, and so the lint that rejects a marker without an `arguments` field has something conformant to contrast against.
