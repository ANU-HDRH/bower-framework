---
id: ADR-binary-attachments
title: Binary attachments are stored out of band
status: accepted
date: 2026-01-24
scope: module
modules: [clean]
---

## Context

Fixture ADR. The losing side of an unrepaired `/b-merge` slug collision: two branches each wrote `ADR-binary-attachments`, git kept both files under different names, and nothing renamed this one.

## Decision

Binary attachments are stored out of band and referenced by hash.

## Consequences

Two files claim one ID, so every lookup by that ID resolves to one of them and the other is unreachable.
