# Prefect

## Purpose

Provide workflow orchestration with observability, retry logic, and task-level granularity using Prefect, enabling monitoring via dashboard and fine-grained error recovery.

## How It Works

Refactors the file-based pipeline into Prefect tasks and flows:

1. **Flows:** High-level workflow definitions
   - `kancil_pipeline` — single org processing
   - `batch_pipeline` — multi-org from CSV

2. **Tasks:** Individual processing units
   - `scrape_site_task` — Scrapy crawl (subprocess)
   - `process_file_task` — per-file processing with retries
   - `extract_resource_task` — per-file LLM extraction
   - `aggregate_org_data_task` — synthesis
   - `export_summary_task` — final JSON output

3. **Mapping:** Tasks mapped over files for parallelism

## Key Components

- **Flows:** `kancil/flows/main.py`
- **Tasks:** `kancil/flows/tasks/` (scrape, process, extract, aggregate, export)
- **Artifacts:** Markdown summaries for dashboard display
- **State:** Prefect SQLite database in `data/prefect/`

## Source Location

**Primary source:**
- `kancil/flows/main.py` — Prefect flow definitions

**Tests:**
- `tests/flows/test_main.py`

## Implementation Details

**Flow Definition:**
```python
@flow(name="kancil_pipeline")
async def kancil_pipeline(url: str, org_name: str, limit_pages: int = None):
    # Scrape
    metadata_paths = await scrape_site_task(url, org_name)
    
    # Process (mapped over files)
    processed = await process_file_task.map(metadata_paths)
    
    # Extract (mapped over processed)
    extractions = await extract_resource_task.map(processed)
    
    # Aggregate
    summary = await aggregate_org_data_task(extractions)
    
    # Export
    await export_summary_task(summary, org_name)
```

**Scrapy Integration:**
- Runs in subprocess to avoid reactor conflicts with Prefect async loop
- Uses `prefect-shell` or `subprocess` for isolation

**State Storage:**
- `PREFECT_HOME` set to `data/prefect/` via `.env`
- SQLite database for flow runs, task results, artifacts

**Dashboard Access:**
```bash
prefect server start
# Open http://localhost:4200
```

## Integration Points

- **Input:** Same as batch (URL, org_name)
- **Existing Code:** Wraps existing processor/extractor logic
- **Output:** Same directory structure + Prefect artifacts
- **Observability:** Dashboard shows flow graph, task status, artifacts

## Verification Strategy

### Testing Approach
- Pilot run with `limit_pages=10` on GetUp
- Validate Prefect database population
- Check dashboard visualization
- Confirm artifact generation

### Acceptance Criteria
- [x] Single flow orchestrates complete pipeline
- [x] Tasks support retries (3 attempts)
- [x] Dashboard shows progress and graph
- [x] Artifacts display processing summaries
- [x] Final JSON exported correctly

## Known Limitations

- Scrapy subprocess adds overhead
- Prefect server must be running for dashboard
- Local SQLite limits scaling (single machine)

