# Architecture

## Runtime view

Two modules and two deliberate defects.

## Software architecture

**Build-order rationale.** `clean` first because it has no dependencies.

### clean

**Purpose.** The conformant module. Contributes no findings at all.

**Data concern.** The `a` and `b` tables.

**Depends on.** Nothing.

**Consumed by.** `drifted`

### drifted

**Purpose.** Carries one instance of most per-feature drift conditions.

**Data concern.** The `drift` table.

**Features.** `built-feature` · `ghost-feature`

**Depends on.** `clean`

**Consumed by.** Nothing.

### ghost

**Purpose.** Declared here with no directory under docs/modules/.

**Data concern.** None — it does not exist.

**Depends on.** `clean`

**Consumed by.** Nothing.

### reviewstale

**Purpose.** Reviewed once, then grown — the derived-staleness condition.

**Data concern.** The `snapshot` table.

**Depends on.** Nothing.

**Consumed by.** Nothing.
