---
name: t-writer
description: Fixture write-capable agent whose body is deliberately hostile to the TOML escaper.
role: write-capable
---

# Fixture Writer

A write-capable fixture agent. Everything below exists to make the emitted `developer_instructions` literal hard to get right.

A fenced block holding a bare triple quote and a longer run:

```
"""
""""
a "quoted" phrase, and a doubled "" pair
```

A path ending in a backslash: `C:\some\path\`

A lone backslash: \

Unicode that must survive byte-for-byte: é — 日本語 — 🌱 — ✓

A line whose last character is a double quote: "
