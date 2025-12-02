# Orchestration — Integration Status

**Last Updated:** 2025-11-21  
**Status:** ✓ Complete

## Module Purpose

Batch processing and workflow management for multi-organization pipeline execution with observability and fault tolerance.

## Features in Module

- **Batch** — CSV-driven multi-site processing with state persistence
- **Prefect** — Workflow orchestration with dashboard observability

## Integration Points

**Batch → Pipeline:**
- Batch manager iterates through CSV sites
- Invokes complete pipeline per organization
- Tracks completion status in state file

**Prefect → All Modules:**
- Wraps harvester, processor, extractor as tasks
- Provides retry logic at task level
- Generates artifacts for monitoring

**Batch vs Prefect:**
- Batch: Simple file-based state, CLI-driven
- Prefect: Rich orchestration, dashboard, artifacts
- Both achieve same outcome; Prefect adds observability

## Integration Testing

### Test Scenarios

1. **Batch Multi-Site Processing**
   - Input: 3-site test CSV
   - Trigger: `uv run python -m kancil.cli.batch --input test_sites.csv`
   - Expected: All sites processed, state file updated
   - Success: 3 completed or appropriate failures logged

2. **Batch Resumability**
   - Input: Interrupt batch mid-run
   - Trigger: Restart same command
   - Expected: Completed sites skipped, pending resumed
   - Success: No duplicate processing

3. **Prefect Flow Execution**
   - Input: Single org URL
   - Trigger: Run kancil_pipeline flow
   - Expected: Dashboard shows graph, tasks complete
   - Success: org_summary.json generated

4. **Prefect Task Retry**
   - Input: Transient failure during processing
   - Expected: Task retries up to 3 times
   - Success: Recovery from transient errors

### Test Results

- Scenario 1: ✓ Passing
- Scenario 2: ✓ Passing
- Scenario 3: ✓ Passing
- Scenario 4: ✓ Passing

## Known Integration Issues

- **Scrapy isolation:** Must run in subprocess with Prefect to avoid reactor conflicts
- **State duplication:** Batch state file and Prefect DB both track state; Prefect is authoritative when used

## Dependencies

**External:**
- Prefect library and optional server
- File system for state persistence

**Internal:**
- All other modules (harvester, processor, extractor)
- Pipeline runner for batch execution

