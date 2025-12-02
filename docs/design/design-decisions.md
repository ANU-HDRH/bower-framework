# Design Decisions

## Decision Log

### Three-Phase Pipeline Architecture — 2025-11

**Context:** Need to extract structured data from websites, but LLM prompt engineering requires iteration. Re-scraping websites for each prompt change is expensive and slow.

**Options Considered:**
1. Single-pass pipeline — scrape, process, extract in one flow
   - Pros: Simpler, less intermediate storage
   - Cons: Any extraction change requires re-crawling
2. Two-phase (scrape + extract) — skip intermediate processing
   - Pros: Fewer steps
   - Cons: Raw HTML too noisy for LLM, document formats unhandled
3. Three-phase (scrape → process → extract) — full separation
   - Pros: Independent iteration on each phase, clean LLM input
   - Cons: More complexity, intermediate storage

**Decision:** Three-phase architecture  
**Rationale:** Prompt iteration is the most likely change; decoupling extraction from scraping enables rapid experimentation without infrastructure load  
**Implications:** Need intermediate file formats, clear handoff contracts between phases

---

### Scrapy for Web Harvesting — 2025-11

**Context:** Need a web crawler that handles politeness, error recovery, and document downloads.

**Options Considered:**
1. Scrapy — full-featured crawl framework
   - Pros: Battle-tested, handles edge cases, built-in politeness, document pipelines
   - Cons: Learning curve, async reactor model
2. requests + BeautifulSoup — manual crawling
   - Pros: Simple, familiar
   - Cons: Reinventing rate limiting, retry logic, link following
3. Playwright/Selenium — browser automation
   - Pros: Handles JavaScript-heavy sites
   - Cons: Slow, heavyweight, most target sites are static

**Decision:** Scrapy with conservative settings  
**Rationale:** Target sites are mostly static HTML; Scrapy's politeness controls and document handling are exactly what we need  
**Implications:** Spider development follows Scrapy patterns; reactor conflicts with Prefect require subprocess isolation

---

### docling for Document Processing — 2025-11

**Context:** Need to extract text from PDFs and office documents while preserving section structure.

**Options Considered:**
1. docling — section-aware document processing
   - Pros: Preserves document structure, handles multiple formats, GPU acceleration
   - Cons: Moderate performance overhead (~23s/document)
2. PyMuPDF/pdfplumber — PDF-focused extraction
   - Pros: Fast, lightweight
   - Cons: Less structure-aware, PDF-only
3. Apache Tika — universal format support
   - Pros: Handles many formats
   - Cons: Java dependency, less Python-native

**Decision:** docling with both text and section extraction modes  
**Rationale:** Section-aware parsing provides natural chunking boundaries for LLM context; quality justifies performance cost  
**Implications:** Need GPU for reasonable performance; processing time scales with document complexity

---

### PromptSpec for Prompt Management — 2025-11

**Context:** Research assistants need to iterate on LLM prompts without modifying Python code.

**Options Considered:**
1. PromptSpec — versioned prompts in markdown files
   - Pros: Non-developers can edit, version history, metadata support
   - Cons: Additional dependency
2. Hardcoded prompts in Python — prompts as string constants
   - Pros: Simple, no dependencies
   - Cons: Requires code changes for prompt iteration, blocks non-dev work
3. Database-stored prompts — prompts in SQLite/Postgres
   - Pros: API-accessible
   - Cons: Overkill for this use case, harder to version

**Decision:** PromptSpec with `data/promptspec/` directory  
**Rationale:** Research assistants are the primary prompt iterators; keeping prompts in editable markdown files with version directories enables independent experimentation  
**Implications:** Prompts structured as `{name}/1/promptspec.md`; Python code loads latest version

---

### Two-Track LLM Extraction — 2025-11

**Context:** Web pages and documents have different characteristics; single extraction approach may not fit both.

**Options Considered:**
1. Unified extraction — same prompts for all content
   - Pros: Simpler prompt management
   - Cons: Different content types need different handling
2. Two-track extraction — separate flows for pages vs documents
   - Pros: Optimized prompts per content type, smart triage for pages
   - Cons: More prompts to maintain

**Decision:** Two-track with smart triage for pages  
**Rationale:** Pages need relevance filtering (most pages aren't about mission/staff); documents are individually valuable and need metadata extraction  
**Implications:** Page flow: triage → extract; Document flow: direct metadata extraction; Final aggregation combines both

---

### Pydantic for Data Models — 2025-11

**Context:** Need validated, typed data structures for metadata and extractions.

**Options Considered:**
1. Pydantic — type-validated models
   - Pros: JSON serialization, validation, OpenRouter schema support
   - Cons: Slight overhead
2. dataclasses — standard library
   - Pros: Built-in, lightweight
   - Cons: No validation, manual serialization
3. TypedDict — type hints only
   - Pros: Zero overhead
   - Cons: No runtime validation

**Decision:** Pydantic throughout  
**Rationale:** LLM structured output requires schema validation; Pydantic integrates with OpenRouter client  
**Implications:** All data contracts defined as Pydantic models; JSON I/O via model serialization

---

### Prefect for Orchestration — 2025-11

**Context:** Batch processing of multiple sites needs observability, retry logic, and state management.

**Options Considered:**
1. Prefect — workflow orchestration with dashboard
   - Pros: Observability, retries, artifacts, SQLite state
   - Cons: Learning curve, reactor conflicts with Scrapy
2. Custom BatchManager — file-based state tracking
   - Pros: Simple, no dependencies
   - Cons: Limited observability, manual retry logic
3. Airflow — enterprise workflow orchestration
   - Pros: Industry standard
   - Cons: Heavyweight for single-user research tool

**Decision:** Prefect with custom BatchManager as fallback  
**Rationale:** Dashboard observability is valuable for multi-hour batch runs; Prefect's task mapping fits per-file processing pattern  
**Implications:** Scrapy runs in subprocess to avoid reactor conflicts; state stored in `data/prefect/`

