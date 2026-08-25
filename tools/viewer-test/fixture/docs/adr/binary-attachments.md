---
id: ADR-binary-attachments
title: Binary attachments cross feature boundaries as opaque blobs
status: accepted
date: 2026-01-23
scope: module
modules: [clean]
narrows: [ADR-typed-boundaries]
---

## Context

Fixture ADR. Slug-to-slug narrowing: a v0.38 ADR carving an exception out of another v0.38 ADR, so relationship fields are exercised with slug IDs on both sides.

## Decision

Binary attachments are exempt from the typed-record rule and cross boundaries as opaque blobs.
