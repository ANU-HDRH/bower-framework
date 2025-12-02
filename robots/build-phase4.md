# Phase 4: Batch Processing

**Started:** 2025-11-21
**Status:** Implementation Complete

**Goal:** Enable reliable batch processing of multiple organizations from a CSV input, orchestrating the complete Kancil pipeline (Scrape -> Process -> Extract) for each.

---

## Context

With Phases 1-3 complete, we can run the full pipeline for a single organization. Phase 4 focuses on scaling this to handle the target dataset of ~30 Indonesian NGO sites.

**Key Requirements:**
- Input: CSV file containing a list of URLs.
- Reliability: The process must be robust against individual site failures.
- Resumability: Default behavior. If the batch job stops, restarting it will skip already completed sites.
- Observability: Clear logging of overall progress and individual site status.
- Fault Tolerance: Catch errors for individual sites, log them, mark as failed, and proceed to the next site. No early bail-out.
- Final Report: clear summary of the run (e.g. "20 completed, 3 failed").

---

## Architecture Proposal

### 1. Input Format
A simple CSV file with at least a `url` column. Optionally an `org_name` column to override the auto-generated slug.

**`sites.csv` Example:**
```csv
url,org_name
https://www.walhi.or.id,walhi
https://kehati.or.id/,
https://www.misoolfoundation.org,misool
```

### 2. State Management (`BatchManager`)
To support resumability, we will maintain a state file (JSON) alongside the input CSV or in the output directory.

**`batch_state.json` Structure:**
```json
{
  "batch_id": "20251121-123456",
  "started_at": "2025-11-21T12:34:56",
  "last_updated": "2025-11-21T13:00:00",
  "status": "in_progress",
  "sites": {
    "https://www.walhi.or.id": {
      "org_name": "walhi",
      "status": "completed",
      "completed_at": "2025-11-21T12:40:00",
      "output_dir": "data/output/walhi"
    },
    "https://kehati.or.id/": {
      "org_name": "kehati-or-id",
      "status": "failed",
      "error": "Connection timeout during scrape",
      "failed_at": "2025-11-21T12:45:00",
      "attempts": 1
    },
    "https://www.misoolfoundation.org": {
      "status": "pending"
    }
  }
}
```

**States:** `pending`, `in_progress`, `completed`, `failed`.

### 3. CLI Command (`kancil.cli.batch`)

New entry point to drive the batch process.

```bash
uv run python -m kancil.cli.batch --input sites.csv
```

**Workflow:**
1.  Load `sites.csv`.
2.  Load or initialize `batch_state.json` (hashed from input filename or explicitly defined).
3.  Iterate through sites:
    *   Skip if `completed`.
    *   If `failed` or `pending` (or partial), process.
    *   Mark as `in_progress`.
    *   Invoke `kancil.cli.run` logic (programmatically).
    *   If success: Mark `completed`.
    *   If fail: Mark `failed`, log error, continue to next site.
4.  Update state file after each site.
5.  **Final Report:** Print summary of results (Total, Completed, Failed, Skipped).

### 4. Logging
- **Batch Log:** `data/logs/batch_{timestamp}.log` - High-level progress.
- **Site Logs:** Standard logs from `run.py`.

---

## Implementation Plan

### Tasks

#### Core Logic
- [x] Create `kancil/batch/` module.
- [x] Implement `BatchManager` class:
    - Load/Save state.
    - Update site status.
- [x] Implement `BatchRunner` class:
    - Loop through sites.
    - Call `kancil.cli.run` functions.
    - Handle exceptions (Pokemon exception handling: catch 'em all).

#### CLI
- [x] Create `kancil/cli/batch.py`.
- [x] Add arguments: `--input`.

#### Integration
- [x] Refactor `kancil.cli.run` to extract `run_pipeline(url, options...)` function that returns success/fail status/exception instead of exiting.

#### Testing
- [x] Create `tests/` directory.
- [x] Create `tests/test_sites.csv` with the 3 example URLs.
- [x] Verify state file updates and resumability.

---

## Refactoring Needs

**`kancil.cli.run` review:**
- Extract the core orchestration logic from `main()` into a reusable `PipelineRunner` class or function.
- Ensure it propagates exceptions or returns a status object rather than `sys.exit()`.

---

## Success Criteria
1.  Can run a batch of 3 sites.
2.  State file correctly reflects `completed` and `failed` statuses.
3.  Re-running the command skips the `completed` sites.
4.  Errors in one site do not stop the batch.
5.  Final summary report is accurate.
