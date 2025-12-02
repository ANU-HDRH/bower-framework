# Batch

## Purpose

Enable reliable batch processing of multiple organizations from a CSV input, orchestrating the complete pipeline (Scrape → Process → Extract) for each site with fault tolerance and resumability.

## How It Works

1. Load CSV file containing organization URLs
2. Initialize or load batch state from JSON file
3. For each organization:
   - Skip if already completed
   - Mark as in_progress
   - Run complete pipeline (scrape, process, extract)
   - Mark as completed or failed based on result
   - Update state file after each site
4. Generate final summary report

## Key Components

- **BatchManager:** State persistence and status tracking
- **BatchRunner:** Pipeline execution loop with error handling
- **State File:** JSON file tracking per-site status
- **CLI Command:** Entry point for batch execution

## Source Location

**Primary source:**
- `kancil/batch/manager.py` — Batch state management and execution

**Tests:**
- `tests/batch/test_manager.py`

## Implementation Details

**Input Format (CSV):**
```csv
url,org_name
https://www.walhi.or.id,walhi
https://kehati.or.id/,
https://www.misoolfoundation.org,misool
```

**State File (`batch_state.json`):**
```json
{
  "batch_id": "20251121-123456",
  "started_at": "2025-11-21T12:34:56",
  "status": "in_progress",
  "sites": {
    "https://www.walhi.or.id": {
      "org_name": "walhi",
      "status": "completed",
      "output_dir": "data/output/walhi"
    },
    "https://kehati.or.id/": {
      "org_name": "kehati-or-id",
      "status": "failed",
      "error": "Connection timeout"
    }
  }
}
```

**Site States:** `pending`, `in_progress`, `completed`, `failed`

**CLI Usage:**
```bash
uv run python -m kancil.cli.batch --input sites.csv
```

## Integration Points

- **Input:** CSV file with URLs and optional org names
- **Pipeline:** Calls existing scrape/process/extract commands
- **State:** JSON file for resumability
- **Output:** Per-org directories + batch summary

## Verification Strategy

### Testing Approach
- Unit tests for BatchManager state handling
- Integration test with 3-site CSV
- Resumability test (interrupt and restart)

### Acceptance Criteria
- [x] Batch processes multiple sites sequentially
- [x] State file correctly tracks completed/failed
- [x] Re-running skips completed sites
- [x] Individual site failures don't halt batch
- [x] Final summary report is accurate

## Known Limitations

- Sequential processing (not parallel)
- No retry logic for failed sites (manual re-run required)
- State file must be in accessible location

