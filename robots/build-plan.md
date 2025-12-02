# Kancil: Implementation Plan

## Overview

Three-phase implementation corresponding to the three pipeline phases, and a pivot towards the production dataset. Each phase includes development, testing on a single pilot site (GetUp Australia), and manual inspection of outputs before proceeding to the next phase.

## Pilot Site

**GetUp Australia**: https://www.getup.org.au/

- English language (easier for initial development and debugging)
- Australian progressive advocacy organization
- Representative structure (mission, campaigns, media releases)
- Local hosting (faster iteration during development)

Once all phases validated on GetUp, full deployment on 30 Indonesian environmental NGOs.

## Phase 1: Scrape - Implementation
[Status Tracking](build-phase1.md)

### Goals
- Scrapy spider that crawls GetUp website
- Extracts and stores HTML pages and documents
- Generates metadata for each resource
- Produces outbound links CSV

### Project Output Structure
Per design.md, Phase 1 establishes this structure:
```
data/output/
  {org_name}/
    raw/              # Original HTML pages and documents
      page_001.html
      page_002.html
      document_001.pdf
      ...
    metadata/         # One JSON file per resource
      page_001.json
      page_002.json
      document_001.json
      ...
    links.csv         # Outbound links (source_url, target_url, link_text, timestamp)
```

### Tasks

1. **Project setup**
   - Initialize Scrapy project
   - Configure settings (politeness, allowed domains)
   - Set up output directory structure: `data/output/{org_name}/raw/`, `metadata/`

2. **Spider development**
   - Implement domain-restricted spider
   - HTML page collection
   - Document download (PDF, DOCX, PPTX, XLSX)
   - Outbound link extraction

3. **Metadata generation**
   - Pydantic model for ResourceMetadata
   - JSON serialization (pretty-printed)
   - One metadata file per resource

4. **Links CSV generation**
   - Extract all outbound links during crawl
   - Write to CSV (source_url, target_url, link_text, timestamp)

### Testing & Validation

**Automated checks:**
- Spider completes without errors
- All discovered pages have corresponding metadata files
- Links CSV validates (no malformed URLs)
- File hashes calculated correctly

**Manual inspection:**
- Review folder structure in `output/getup/`
- Spot check 5-10 metadata JSON files for completeness
- Verify raw HTML files are complete (not truncated)
- Check links.csv for reasonable link distribution
- Confirm documents downloaded successfully

**Success criteria:**
- Complete crawl of GetUp domain
- All resources have metadata
- Links CSV ready for network analysis
- No obvious data quality issues

## Phase 2: Process - Implementation

### Goals
- Sanitize HTML to remove scripts/styles while preserving structure
- Process documents with docling for section-aware extraction
- Prepare clean files for LLM consumption

### Existing Code Assets
- **`kancil/docling_extractor.py`**: Docling-based PDF extraction with section-aware parsing
  - `DoclingPDFExtractor` class with two extraction modes:
    - `extract_text_for_asks()`: Flat page-based text extraction
    - `extract_sections()`: Structured section extraction with doctags
  - Already handles PDF/DOCX/PPTX/XLSX via docling
  - Includes NLP-based sentence splitting
  - **NOTE**: Currently uses its own output structure (`data/output/`, `data/output2/`). Will need adaptation to conform to project structure below.
- **`kancil/nlp.py`**: SpaCy-based sentence splitting utilities

### Project Output Structure
Per design.md, Phase 2 adds `processed/` to the Phase 1 structure:
```
data/output/
  {org_name}/
    raw/              # Phase 1: Original HTML pages and documents
      page_001.html
      document_001.pdf
      ...
    metadata/         # Phase 1: One JSON file per resource
      page_001.json
      document_001.json
      ...
    processed/        # Phase 2: Cleaned/extracted content
      page_001_clean.html
      document_001_sections.json
      ...
    links.csv         # Phase 1: Outbound links
```

### Tasks

1. **HTML sanitization**
   - Implement HTML cleaning pipeline
   - Strip scripts, styles, comments
   - Remove inline styles and unnecessary attributes
   - Preserve semantic structure
   - Output cleaned HTML to `data/output/{org_name}/processed/`

2. **Document processing**
   - **Adapt** existing `docling_extractor.py` to work with project structure
   - Read documents from `data/output/{org_name}/raw/`
   - Output structured JSON to `data/output/{org_name}/processed/`
   - Preserve section-aware extraction capabilities

3. **Update metadata**
   - Add `processed_file` paths to ResourceMetadata
   - Track processing status/errors

4. **Processing script**
   - Iterate through `raw/` directory
   - Process each file appropriately (HTML vs documents)
   - Handle processing errors gracefully

### Testing & Validation

**Automated checks:**
- All raw files have corresponding processed files
- Processed HTML validates as well-formed
- Docling outputs parse as valid JSON
- No processing errors logged

**Manual inspection:**
- Compare raw vs sanitized HTML for 5-10 pages
- Verify semantic structure preserved (headings, sections, links)
- Check docling output quality on sample documents
- Confirm mission/about pages retain key structural elements
- Validate news/media pages maintain article structure

**Success criteria:**
- Clean HTML preserves document semantics
- Docling successfully extracts sections from documents
- Files ready for LLM processing
- No critical content lost during cleaning

## Phase 3: Extract - Implementation

### Goals
- LLM-based extraction of organizational information
- Structured output for each organization
- Validation on GetUp before deployment to Indonesian sites

### Existing Code Assets
- **`kancil/openrouter_client.py`**: Bulletproof OpenRouter API client with structured data validation
  - Ready for LLM API calls via OpenRouter
  - Built-in error handling and retry logic
  - Supports structured output validation
- **PromptSpec**: Installed from git (`promptspec` package)
  - Enables independent prompt iteration by research assistant
  - Data directory configured via `.env`: `PROMPTSPEC_DATA_DIR=prompts`

### Configuration
- **`.env` file** contains:
  - `OPENROUTER_API_KEY`: API authentication
  - `OPENROUTER_MODEL`: Currently set to `google/gemini-2.5-flash-preview-09-2025`
  - `PROMPTSPEC_DATA_DIR`: Path to PromptSpec data directory

### Tasks

1. **Extraction schema design**
   - Pydantic models for org-level data
   - Mission, staff/capability, advocacy priorities, media releases
   - Page-level vs org-level aggregation strategy

2. **OpenRouter integration**
   - Use existing `openrouter_client.py` wrapper
   - Model selection via `OPENROUTER_MODEL` env var (currently Gemini Flash 2.5)
   - Error handling and retry logic (already implemented)
   - Token usage tracking

3. **Prompt engineering**
   - Initial prompts for each extraction type using PromptSpec
   - Handle both English and Indonesian content
   - Structured output formatting
   - Store prompts in PromptSpec data directory for RA iteration

4. **Extraction pipeline**
   - Iterate through processed files
   - Make LLM calls via `openrouter_client.py`
   - Store structured extractions
   - Aggregate to org-level summary

5. **Documentation for RA**
   - PromptSpec workflow guide for prompt iteration
   - How to run extraction on Indonesian sites
   - Output validation procedures
   - Model selection guide (changing `OPENROUTER_MODEL` in `.env`)

### Testing & Validation

**Automated checks:**
- All processed files attempted for extraction
- Structured outputs validate against Pydantic schemas
- API errors logged and handled
- Token usage within expected bounds

**Manual inspection:**
- Review extracted mission statement vs actual GetUp mission
- Check staff/capability extraction quality
- Validate advocacy priorities against known campaigns
- Assess media release identification accuracy
- Confirm org-level aggregation makes sense

**Success criteria:**
- Accurate extraction of key organizational elements
- Structured data ready for analysis
- RA can run pipeline independently on Indonesian sites
- Prompt iteration workflow documented

## Phase 4: Deployment on Indonesian sites

After successful validation on GetUp:

### Batch preparation

- Load CSV of 30 Indonesian organizations
- Configure batch processing
- Run scraper on all 30 sites
- Monitor for crawl errors
- Validate outputs

## Risk Mitigation

- **Scrapy issues**: adjust politeness settings if sites block crawler
- **HTML variability**: Sanitization may need tuning for different site structures
- **Docling failures**: Some document formats may fail, log and continue
- **LLM extraction quality**: Expect iteration on prompts, especially for Indonesian content
- **Site availability**: Some Indonesian sites may be offline/slow, implement timeouts and retry logic
