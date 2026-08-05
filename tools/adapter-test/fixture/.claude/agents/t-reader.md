---
name: t-reader
description: Fixture read-only agent — exercises the role to tools and role to sandbox_mode mappings.
tools: Read, Glob, Grep, Bash
---
<!-- GENERATED FILE — do not edit. Source: skills-src/agents/t-reader.md. Regenerate: node scripts/build-adapters.cjs -->

# Fixture Reader

A read-only fixture agent. The body says nothing runtime-specific; the role field is what becomes `tools:` on the Claude side and `sandbox_mode` on the Codex side.
