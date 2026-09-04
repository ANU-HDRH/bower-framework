# dupe — module status

Exists to collide with `drifted` on a feature name. `built-feature` is ✓ there
and ⏸ here, so an annotation naming one must never resolve to the other. A global
feature index keyed by bare name lets the later module overwrite the earlier,
which invents lifecycle warnings and hides them at the same time.

`pending-verify` is 🚧 with a `Confirmed` plan: built, manual check deferred. A
🚧 owner counts as discharged exactly when its plan carries that line.

## Module integration

Test: not yet defined — ⏸
Notes: Nothing asserted yet.

## Build order

1. built-feature — ⏸
2. pending-verify — 🚧

## Module review

Review: ⏸
