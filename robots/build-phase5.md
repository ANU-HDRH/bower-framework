# Phase 5: Prefect Orchestration Refactor

## Overview
Refactor the current file-based, multi-stage CLI pipeline into a robust, observable workflow using Prefect. This phase focuses on "exceptional adherence to documentation" and leveraging Prefect's internal SQLite database for state and artifact management.

## Goals
1.  **Orchestration**: Replace manual CLI steps with a single Prefect flow (`kancil_flow`).
2.  **Observability**: Use Prefect Dashboard to monitor progress, retries, and artifacts.
3.  **Granularity**: Map tasks over individual files for processing and extraction to allow fine-grained retries and parallelism.
4.  **State Management**: Use Prefect's internal SQLite DB (`PREFECT_HOME` in `data/prefect`) to store flow state and results.
5.  **Artifacts**: Generate rich artifacts (tables, summaries) for each phase.
6.  **Export**: Explicit export phase to write final JSON outputs, keeping intermediate data managed by Prefect where possible (or tracking file paths).

## Architecture Changes

### Data Flow
- **Current**: CLI -> File System (Phase 1) -> CLI -> File System (Phase 2) -> ...
- **New**: Prefect Flow -> Task (Scrape) -> [File Refs] -> Task (Process Mapped) -> [Data/File Refs] -> Task (Extract Mapped) -> [Data Objects] -> Task (Aggregate) -> Task (Export JSON)

### Directory Structure
```
data/
  prefect/          # PREFECT_HOME (sqlite db, etc.)
  output/
    {org_name}/
      raw/          # Managed by Scrape Task
      processed/    # Managed by Process Task (optional if passing text content, but better to keep for cache)
      final/        # Exported JSONs
```

## Implementation Plan

### 1. Setup & Configuration
- [x] Add `prefect` and `prefect-shell` to `pyproject.toml` via `uv add`.
- [x] Configure `PREFECT_HOME` environment variable in `.env` (pointing to `absolute_path_to/data/prefect`).
- [x] Add `data/prefect` to `.gitignore`.
- [x] Create `kancil/flows/` directory.

### 2. Refactor Scraper (Phase 1)
- [x] Create `kancil/flows/tasks/scrape.py`.
- [x] Implement `scrape_site_task(url, org_name, base_dir)`.
    -   Wraps existing `CrawlerProcess` logic.
    -   **Challenge**: Scrapy `CrawlerProcess` is blocking and reactor-based.
    -   **Solution**: Run Scrapy in a subprocess (using `prefect-shell` or `subprocess`) to avoid reactor conflicts with Prefect's async loop, OR ensure it runs in a dedicated thread/process.
    -   Returns: List of paths to downloaded metadata files (or `ResourceMetadata` objects).
- [x] Create `create_scrape_artifact_task` to generate a Markdown summary of the crawl.

### 3. Refactor Processor (Phase 2)
- [x] Modify `kancil/processors/processor.py`:
    -   Refactor `process_all` to separate the logic for processing a *single* file into `process_single_file(metadata_path)`.
- [x] Create `kancil/flows/tasks/process.py`.
    -   Implement `process_file_task(resource_metadata)`.
    -   Use `task(retries=3)` to handle transient file errors.
- [x] Create `create_process_artifact_task` for stats (sanitization errors, docling success).

### 4. Refactor Extractor (Phase 3)
- [x] Modify `kancil/extractors/extractor.py` (and `doc/page` extractors):
    -   Ensure `process_single_page` and `process_single_document` are exposed and return structured data (Pydantic models) instead of just writing files.
- [x] Create `kancil/flows/tasks/extract.py`.
    -   Implement `extract_resource_task(processed_resource)`.
    -   Use `task_runner=ConcurrentTaskRunner` or `async` tasks to parallelize LLM calls (light concurrency).
    -   Respect `OPENROUTER_MODEL` env var.

### 5. Aggregation & Export
- [x] Create `kancil/flows/tasks/aggregate.py`.
    -   `aggregate_org_data_task(list_of_extractions)`.
    -   Returns `OrgSummary` object.
- [x] Create `kancil/flows/tasks/export.py`.
    -   `export_summary_task(org_summary, output_dir)`.
    -   Writes the final JSON to `data/output/{org}/final/`.

### 6. Workflow Orchestration
- [x] Create `kancil/flows/main.py`.
- [x] Define `kancil_pipeline` flow:
    -   Accepts `url`, `org_name`, `limit_pages` (for testing).
    -   Chains the tasks.
    -   Uses `.map()` for processing and extraction.
- [x] Define `batch_pipeline` flow:
    -   Reads CSV.
    -   Calls `kancil_pipeline` for each row (using `run_deployment` or subflows).

### 7. Documentation
- [x] Rewrite `README.md` to reflect Prefect usage.
- [x] Document how to start the Prefect server (`prefect server start`).
- [x] Document how to run the pipeline.

## Testing Strategy
- **Pilot**: Run `kancil_pipeline` on `https://www.getup.org.au/` with `limit_pages=10`.
- **Validation**: Check `data/prefect` is populated, Dashboard shows graph, Artifacts appear, and `final/` JSON exists.