# Harvester — Integration Status

**Last Updated:** 2025-11-20  
**Status:** ✓ Complete

## Module Purpose

Automated harvest of raw website data including HTML pages, downloadable documents, metadata, and outbound links for network analysis.

## Features in Module

- **Spider** — Domain-restricted web crawling with Scrapy
- **Metadata** — Resource metadata generation and tracking

## Integration Points

**Spider → Metadata:**
- Spider saves raw file, triggers metadata pipeline
- Metadata JSON created alongside each raw file
- Content hash calculated from raw content

**Harvester → Processor:**
- Processor reads `metadata/*.json` to discover files to process
- Processor updates metadata with `processed_files` field
- Links CSV provides network data for analysis

## Integration Testing

### Test Scenarios

1. **Complete Harvest Flow**
   - Input: Organization URL
   - Trigger: `uv run python -m kancil.cli.run --url <url>`
   - Expected: `raw/` populated with pages and docs, `metadata/` has matching JSONs, `links.csv` exists
   - Success: All files have metadata, no orphaned files

2. **Document Download**
   - Input: Page with PDF links on CDN subdomain
   - Expected: PDFs downloaded to `raw/`, metadata includes content_type
   - Success: Documents accessible for processor

### Test Results

- Scenario 1: ✓ Passing (54 pages, 51 docs, 105 metadata files)
- Scenario 2: ✓ Passing (51 PDFs from cdn.getup.org.au)

## Known Integration Issues

None. Spider and metadata components are tightly coupled and work reliably together.

## Dependencies

**External:**
- Target website availability
- Network connectivity

**Internal:**
- None (harvester is the first module in the pipeline)

