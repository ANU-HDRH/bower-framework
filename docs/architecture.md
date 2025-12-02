# System Architecture

## Overview

Kancil is a three-phase pipeline to harvest, process, and extract structured data from interest-group websites. It maps URL networks, harvests website content, and extracts organizational characteristics (mission statements, staff capabilities, advocacy priorities) using LLM-based extraction.

## Key Components

### Harvester Module
- **Purpose:** Automated harvest of raw website data
- **Technology:** Scrapy with politeness controls, Pydantic for metadata
- **Interfaces:** CSV input (org name, URL) → raw HTML/docs + metadata JSON + links CSV
- **Location:** `kancil/scraper/`

### Processor Module
- **Purpose:** Clean and structure data for LLM consumption
- **Technology:** BeautifulSoup for HTML, docling for documents, SpaCy for NLP
- **Interfaces:** Raw files → cleaned HTML + structured JSON
- **Location:** `kancil/processors/`

### Extractor Module
- **Purpose:** LLM-based extraction of organizational information
- **Technology:** OpenRouter API, PromptSpec for prompt management, Pydantic schemas
- **Interfaces:** Processed content → triage results + extractions + org summary
- **Location:** `kancil/extractors/`

### Orchestration Module
- **Purpose:** Batch processing and workflow management
- **Technology:** Prefect for orchestration, custom BatchManager for state
- **Interfaces:** CSV of sites → complete pipeline runs with observability
- **Location:** `kancil/batch/`, `kancil/flows/`

## Data Flow

```
CSV (orgs + URLs)
  → Harvester: Scrape (Scrapy)
      → Raw HTML/Docs + Metadata + Links CSV
  → Processor: Clean & Extract
      → Cleaned HTML + Structured Document JSON
  → Extractor: LLM Processing
      → [Triage] → Relevant Pages
      → [Extract] → Page/Doc Extractions
      → [Aggregate] → Org Summary JSON
```

## Technology Stack
- **Language:** Python 3.11+
- **Web Scraping:** Scrapy
- **Document Processing:** docling, BeautifulSoup, SpaCy
- **LLM Integration:** OpenRouter API (Gemini Flash 2.5)
- **Prompt Management:** PromptSpec
- **Data Validation:** Pydantic
- **Orchestration:** Prefect
- **Package Management:** UV

## Key Design Decisions

### Decision 1: Three-Phase Separation
**Context:** Need to iterate on LLM prompts without re-scraping websites  
**Decision:** Separate scrape → process → extract phases with intermediate files  
**Rationale:** Allows independent iteration on extraction without costly re-crawling  
**Alternatives:** Single-pass pipeline (rejected: too coupled, expensive iteration)

### Decision 2: Scrapy for Crawling
**Context:** Need polite, configurable web crawler  
**Decision:** Use Scrapy with conservative politeness settings  
**Rationale:** Battle-tested, handles edge cases, respects infrastructure limits  
**Alternatives:** requests + custom logic (rejected: reinventing wheels)

### Decision 3: docling for Documents
**Context:** Need section-aware extraction from PDFs and office documents  
**Decision:** Use docling with doctags data model  
**Rationale:** Preserves document structure, handles multiple formats  
**Alternatives:** PyMuPDF, pdfplumber (rejected: less structure-aware)

### Decision 4: PromptSpec for Prompts
**Context:** Research assistants need to iterate on prompts independently  
**Decision:** Use PromptSpec with versioned prompts in `data/promptspec/`  
**Rationale:** Decouples prompt engineering from code changes  
**Alternatives:** Hardcoded prompts (rejected: blocks non-dev iteration)

## Known Constraints
- Indonesian site hosting may have limited infrastructure (conservative crawl rates)
- LLM extraction costs scale with document count (~$0.64 for 105 files)
- docling processing is moderately slow (~23s/document average)
- Some documents may fail extraction due to format issues

## Extension Points
- New extraction types: Add PromptSpec prompts + Pydantic schemas
- Additional document formats: docling supports extensibility
- Alternative LLM providers: OpenRouter abstracts provider selection
- Parallel processing: Prefect enables scaled execution

## Development Dependencies
Build order follows the data flow:
1. **Harvester** — produces raw content
2. **Processor** — requires harvester output
3. **Extractor** — requires processor output
4. **Orchestration** — wraps all phases

## Project Conventions

### Environment
- UV for package management
- Configuration via `.env` file
- PromptSpec for versioned prompt management

### Data Handling
- Output structure: `data/output/{org_name}/`
- Metadata as pretty-printed JSON
- Links data as CSV for network analysis
- All extractions include source references

### Ethics & Crawling
- Respect robots.txt by default
- Conservative crawl rates for infrastructure consideration
- Client spoofing justifiable for research if necessary

