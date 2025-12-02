# Kancil: Interest Group Organization Web Scraper

## Project Overview

A three-phase pipeline to harvest, process, and extract structured data from a series of interest-group websites. This prototype will inform the data model for the larger Gudgenby national infrastructure project while providing researchers with a working tool for analyzing organizational characteristics.

## Input

CSV file containing:
- Organization name
- Landing page URL

Approximately 30 organizations total.

## Project Goals

1. Map URL networks (outbound links from each organization's website)
2. Harvest website content (HTML pages and documents)
3. Extract organizational characteristics:
   - Mission statements
   - Staff and organizational capability
   - Advocacy agenda/priorities
   - Media releases and documents

## Architecture

### Three-Phase Approach

**Phase 1: SCRAPE** - Automated harvest of raw website data
**Phase 2: PROCESS** - Clean and structure data for LLM consumption  
**Phase 3: EXTRACT** - LLM-based extraction of organizational information

This separation allows independent iteration on extraction prompts without re-scraping websites.

## Phase 1: Scrape

### Technology
- Scrapy for crawl orchestration and politeness controls
- Per-organization spider runs
- Research ethics; client spoofing and side stepping robots.txt is justifiable if necessary

### Scope
- Crawl domain boundaries: Stay within each organization's primary domain
- Document types: PDF, DOCX, PPTX, XLSX, HTML (all docling-supported formats)
- Outbound link extraction for network analysis

### Configuration
- Conservative crawl rate (DOWNLOAD_DELAY and CONCURRENT_REQUESTS) - these are hosted in Indonesia, potentially on limited infrastructure
- No depth limits initially (easily adjustable if sites prove enormous)

### Output Structure

```
data/output/
  {org_name}/
    raw/
      page_001.html
      page_002.html
      document_001.pdf
      ...
    metadata/
      page_001.json
      page_002.json
      document_001.json
      ...
    links.csv
```

### Metadata Schema

Pydantic model serialized as pretty-printed JSON (one file per resource):

```python
class ResourceMetadata(BaseModel):
    url: str
    timestamp: datetime
    content_type: str
    status_code: int
    raw_file: Path
    extracted_file: Path | None
    content_hash: str  # for deduplication, could be ETag?
    # Additional Scrapy metadata as needed
```

### Links Data

CSV format with columns:
- source_url
- target_url  
- link_text
- timestamp

Includes both internal and external links (network analysis will filter as needed).

## Phase 2: Process

### HTML Sanitization

Remove noise while preserving semantic structure:
- Strip: `<script>`, `<style>`, `<noscript>`, HTML comments
- Remove: inline styles, most attributes (keep `href`, `src`, `alt`)
- Preserve: semantic tags (`<article>`, `<section>`, `<h1-6>`, `<p>`, etc.)
- Tools: BeautifulSoup with tag whitelist or html_sanitizer

Output stored as cleaned HTML files preserving document structure for LLM context.

### Document Processing

- Use docling for PDF, DOCX, PPTX, XLSX extraction
- We provide example code that shows section-aware text extraction by using the doctags data model
- Output structured text preserving document sections

### Output Structure

```
output/
  {org_name}/
    raw/
      [original files]
    processed/
      page_001_clean.html
      page_002_clean.html
      document_001_sections.json
      ...
    metadata/
      [resource metadata]
    links.csv
```

## Phase 3: Extract

### Technology
- **LLM Client:** OpenRouter wrapper (`kancil/openrouter_client.py`) with Pydantic schema validation and cost tracking.
- **Prompt Management:** `PromptSpec` stores versioned prompts in `data/promptspec/` (Markdown format with YAML metadata).
- **Models:** Tested with `google/gemini-2.5-flash-preview-09-2025`.

### Architecture: Two-Track Extraction

**Track 1: Web Pages (Smart Triage)**
1. **Triage:** Each page is sent to a fast/cheap LLM call to determine relevance ("Is this page about mission, staff, or advocacy?").
2. **Extract:** If relevant, a second LLM call extracts specific structured data based on the triage categories.
3. **Result:** Triage result (`*_triage.json`) and extraction data (`*_extraction.json`) are saved per page.

**Track 2: Documents**
1. **Extract:** Each document (PDF, etc.) is processed to extract metadata (title, authors, summary) using the flat text representation.
2. **Result:** Metadata saved as `*_metadata.json`.

### Aggregation Strategy

A final aggregation step collects all page-level extractions and synthesizes them into a single organization-level summary (`org_summary.json`), containing:
- Unified Mission/Vision statement
- Consolidated Staff & Capability list
- Aggregated Advocacy priorities
- Statistics on processed files

### Output Structure

```
data/output/{org_name}/
├── extractions/
│   ├── pages/
│   │   ├── page_0001_triage.json
│   │   ├── page_0001_extraction.json
│   │   └── ...
│   └── documents/
│       ├── document_0001_metadata.json
│       └── ...
├── documents_summary.json  # Concatenated document metadata
└── org_summary.json        # Final aggregated output
```

## Data Flow

```
CSV (orgs + URLs) 
  → Phase 1: Scrape (Scrapy)
      → Raw HTML/Docs + Metadata + Links CSV
  → Phase 2: Process
      → Cleaned HTML + Structured Document Text
  → Phase 3: Extract (LLM)
      → [Triage] → Relevant Pages
      → [Extract] → Page/Doc Extractions
      → [Aggregate] → Org Summary JSON
```

## Success Criteria

1. Complete harvest of ~30 organization websites
2. Network analysis data (outbound links) in usable format
3. Clean, structured content ready for LLM processing
4. Pydantic data models that transfer to full Gudgenby project
5. Research assistant can independently iterate on extraction prompts via PromptSpec

## Notes

- **Prompt Iteration:** Prompts are decoupled from code. RAs can edit `data/promptspec/*/1/promptspec.md` to improve extraction quality without touching Python code.
- **Cost Management:** All LLM calls are tracked in `data/usage/`.
- **Language Support:** System handles Indonesian content (prompts in English, instructing model to process Indonesian text).
