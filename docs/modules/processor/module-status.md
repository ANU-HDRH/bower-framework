# Processor — Integration Status

**Last Updated:** 2025-11-20  
**Status:** ✓ Complete

## Module Purpose

Clean and structure harvested content for LLM consumption, transforming raw HTML and documents into processed formats optimized for extraction.

## Features in Module

- **HTML Sanitizer** — Semantic HTML cleaning with BeautifulSoup
- **Document Extractor** — PDF/document processing via docling

## Integration Points

**Harvester → Processor:**
- Processor reads `metadata/*.json` to discover files to process
- Iterates through `raw/` directory based on metadata
- Distinguishes HTML vs documents by content_type

**HTML Sanitizer → Metadata:**
- Updates metadata with `processed_files: ["page_0001_clean.html"]`
- Sets `processing_status: "success"` and timing

**Document Extractor → Metadata:**
- Updates metadata with `processed_files: ["document_0001_sections.json", "document_0001_text.json"]`
- Sets processing status and timing

**Processor → Extractor:**
- Extractor reads cleaned HTML for page extraction
- Extractor reads text JSON for document metadata extraction
- Section JSON available for future structured extraction

## Integration Testing

### Test Scenarios

1. **Complete Processing Flow**
   - Input: Harvested org directory with raw files and metadata
   - Trigger: `uv run python -m kancil.cli.process --org getup`
   - Expected: `processed/` populated, all metadata updated
   - Success: 156 processed files from 105 raw files

2. **Mixed Content Processing**
   - Input: Directory with HTML pages and PDF documents
   - Expected: HTML → `*_clean.html`, PDF → `*_sections.json` + `*_text.json`
   - Success: Correct output format per content type

3. **Error Handling**
   - Input: Malformed document
   - Expected: Error logged, metadata updated with error status, processing continues
   - Success: No pipeline halt on individual failures

### Test Results

- Scenario 1: ✓ Passing (105 files → 156 outputs)
- Scenario 2: ✓ Passing (54 HTML, 51 PDF correctly processed)
- Scenario 3: ✓ Passing (error handling verified)

## Known Integration Issues

- **SpaCy model dependency:** `en_core_web_sm` must be installed separately (one-time setup)

## Dependencies

**External:**
- docling library with GPU support
- SpaCy with English model
- BeautifulSoup with lxml parser

**Internal:**
- Harvester module output (raw files + metadata)

