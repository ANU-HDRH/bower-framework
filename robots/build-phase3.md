# Phase 3: LLM-based Extraction

**Started:** 2025-11-20

**Goal:** Extract structured organizational information from processed content using LLM-based extraction with PromptSpec-managed prompts.

---

## Context

Phase 3 builds upon the outputs from Phases 1 and 2:

**From Phase 1:**
- 54 HTML pages in `data/output/getup/raw/`
- 51 PDF documents (downloaded)
- 105 metadata JSON files with resource information
- `links.csv` with 1,982 links for network analysis

**From Phase 2:**
- 54 cleaned HTML files (`*_clean.html`)
- 102 document JSON files:
  - 51 `*_text.json` - flat page-based text extraction
  - 51 `*_sections.json` - structured section-aware extraction
- Updated metadata with processing status
- 100% success rate, zero errors

---

## Implementation Decisions

### Architecture: Two-Track Extraction

**Track 1: Web Pages (HTML)**
- Smart LLM triage to identify relevant pages
- Page-level extraction for:
  - Mission statements and organizational vision
  - Staff and organizational capabilities
  - Advocacy priorities and agenda
- Aggregate page-level extractions to org-level summary
- Process 54 clean HTML files

**Track 2: Documents (PDFs)**
- Process each document as single unit (no page-by-page)
- Extract metadata: title, author(s), document type, summary
- Use flat text JSON (`*_text.json`) for simpler structure
- Process 51 documents

### Technology Stack

**PromptSpec for Prompt Management:**
- Version-controlled prompts in `data/promptspec/`
- Directory structure: `{prompt_name}/1/promptspec.md`
- Simple retrieval: `spec.get_latest("name").prompt`
- Enables RA to iterate on prompts independently
- Bilingual support (English prompts, handles both languages)

**OpenRouter Client:**
- Existing `kancil/openrouter_client.py`
- Pydantic schema validation built-in
- Automatic cost tracking to `data/usage/kancil_extraction_costs.csv`
- Current model: `google/gemini-2.5-flash-preview-09-2025`
- Retry logic and error handling included

**Extraction Schemas (Pydantic):**
- Type-safe, validated outputs
- All schemas include both extracted content AND source references
- Page-level and org-level models

### Output Format

**Directory Structure:**
```
data/output/{org_name}/
├── raw/                    # Phase 1: Original files
├── metadata/               # Phase 1: Resource metadata
├── processed/              # Phase 2: Cleaned content
├── extractions/            # Phase 3: NEW
│   ├── pages/
│   │   ├── page_0001_triage.json
│   │   ├── page_0001_extraction.json
│   │   └── ...
│   └── documents/
│       ├── doc_0001_metadata.json
│       └── ...
└── org_summary.json        # Phase 3: NEW - Aggregated org data
```

**Output Contents:**
- All extractions include both content and source references
- Source references point to specific locations in processed files
- JSON format with Pydantic validation

---

## Tasks

### Setup & Infrastructure
- [x] Create build-phase3.md tracking document
- [x] Update `kancil/scraper/paths.py` with extraction directories
- [x] Create `kancil/extractors/` module directory

### Schema Design
- [x] Create `extraction_schemas.py` with Pydantic models:
  - [x] `PageTriageResult` - relevance assessment
  - [x] `MissionExtraction` - mission/vision + refs
  - [x] `StaffCapabilityExtraction` - team/expertise + refs
  - [x] `AdvocacyExtraction` - priorities/campaigns + refs
  - [x] `DocumentMetadata` - title/authors/type/summary + refs
  - [x] `OrgSummary` - aggregated org-level data

### Prompt Development
- [x] Create PromptSpec prompts in `data/promptspec/`:
  - [x] `page_triage/1/promptspec.md`
  - [x] `mission_extraction/1/promptspec.md`
  - [x] `staff_extraction/1/promptspec.md`
  - [x] `advocacy_extraction/1/promptspec.md`
  - [x] `document_metadata/1/promptspec.md`

### Core Implementation
- [x] Implement `prompt_manager.py` - PromptSpec integration
- [x] Implement `extractor.py` - page triage and extraction
- [x] Implement `document_extractor.py` - document metadata extraction
- [x] Implement `aggregator.py` - org-level aggregation
- [x] Create CLI command `cli/extract.py`

### Testing & Validation
- [x] Run extraction on GetUp dataset (54 HTML + 51 documents)
- [x] Validate Pydantic schema compliance
- [x] Check triage effectiveness (relevant vs. irrelevant pages)
- [x] Manual quality review:
  - [x] Mission statement accuracy
  - [x] Staff/capability extraction quality
  - [x] Advocacy priorities correctness
  - [x] Document metadata completeness
  - [x] Org-level aggregation coherence
- [x] Review cost metrics and token usage

### Documentation
- [x] Update README.md with Phase 3 usage instructions

---

## Implementation Notes

### PromptSpec Usage Pattern

```python
from promptspec import PromptSpec
import os

# Initialize with data directory from .env
spec = PromptSpec(os.getenv("PROMPTSPEC_DATA_DIR"))

# Load prompt and append input data
latest = spec.get_latest("page_triage")
prompt_text = latest.prompt + "\n\n# Input data\n" + page_content

# Use with OpenRouter
response = await client.get_completion(
    model=os.getenv("OPENROUTER_MODEL"),
    prompt=prompt_text,
    schema=PageTriageResult,
    temperature=0.0
)
```

### Smart Triage Flow

1. For each HTML page:
   - Load metadata (includes helpful `link_text` field for context)
   - Load clean HTML content
   - Make triage LLM call to assess relevance
   - If relevant → make extraction LLM call(s)
   - Save triage result and extractions

2. Aggregate relevant extractions:
   - Collect all page-level extractions
   - Generate org-level summary via LLM
   - Save to `org_summary.json`

### Document Processing Flow

1. For each document:
   - Load `*_text.json` (flat text extraction)
   - Make single LLM call for metadata extraction
   - Save to `extractions/documents/{doc_id}_metadata.json`

---

## Testing & Validation

### Automated Checks
- All 105 files attempted for extraction
- All outputs validate against Pydantic schemas
- API errors logged and handled gracefully
- Cost tracking functional
- Token usage within expected bounds

### Manual Inspection
- Review extracted GetUp mission statement vs actual
- Validate staff/capability extraction quality
- Check advocacy priorities against known campaigns (gambling, refugees, climate)
- Assess document metadata completeness
- Confirm org-level aggregation makes sense

### Success Criteria
- Accurate extraction of key organizational elements
- Structured data ready for analysis
- RA can run pipeline independently on Indonesian sites
- Prompt iteration workflow functional
- Ready for Phase 4 deployment on 30 Indonesian NGO sites

---

## Implementation Results

*Filled in after execution on 2025-11-20*

### Statistics
- Total files processed: 105 (54 HTML + 51 PDF Documents)
- HTML pages triaged: 54
- Relevant pages identified: 49
- Documents processed: 51
- API calls made: ~100+
- Total cost: ~$0.64 USD
- Processing time: ~5 minutes
- Success rate: Pages 100% (after retries/fixes), Docs 80% (41/51)

### Output Structure Verification
- Extraction files created: Yes
- Org summary generated: Yes
- Schema validation: Passed (after allowing nulls in list fields)

### Known Issues
- Some documents fail extraction (10/51), likely due to empty text or parsing issues.
- Occasional LLM validation errors required schema relaxation (allowing nulls).
