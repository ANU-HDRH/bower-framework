# Document Extractor

## Purpose

Extract structured text content from documents (PDF, DOCX, PPTX, XLSX) using docling, preserving section structure for context-aware LLM processing.

## How It Works

The extractor uses docling with the doctags data model to:
1. Parse document structure (sections, headings, paragraphs)
2. Extract text in two modes:
   - **Sections mode:** Structured extraction preserving document hierarchy
   - **Text mode:** Flat page-based extraction for simpler processing
3. Apply SpaCy-based sentence splitting for clean text boundaries
4. Output structured JSON preserving document organization

## Key Components

- **DocumentExtractor:** docling-based extraction pipeline
- **Section Parser:** doctags-based structure extraction
- **Text Parser:** Flat page-by-page extraction
- **NLP Utils:** SpaCy sentence splitting (`kancil/nlp.py`)
- **Timing Tracker:** Per-file processing time measurement

## Source Location

**Primary source:**
- `kancil/processors/document_extractor.py` — Document extraction pipeline

**Tests:**
- `tests/processors/test_document_extractor.py`

## Implementation Details

**Supported Formats:**
- PDF — primary document type
- DOCX — Microsoft Word documents
- PPTX — PowerPoint presentations
- XLSX — Excel spreadsheets

**Extraction Modes:**

*Sections Mode (`*_sections.json`):*
```json
{
  "sections": [
    {
      "heading": "Executive Summary",
      "level": 1,
      "content": "..."
    },
    {
      "heading": "Background",
      "level": 2,
      "content": "..."
    }
  ]
}
```

*Text Mode (`*_text.json`):*
```json
{
  "pages": [
    {"page": 1, "text": "..."},
    {"page": 2, "text": "..."}
  ]
}
```

**Output Structure:**
```
data/output/{org_name}/processed/
├── document_0001_sections.json
└── document_0001_text.json
```

## Integration Points

- **Input:** Documents from `raw/` directory, metadata for file discovery
- **Output:** Structured JSON in `processed/` directory (two files per document)
- **Metadata Update:** Sets `processed_files` list and `processing_time_seconds`
- **Consumer:** Extractor module uses text JSON for LLM processing

## Verification Strategy

### Testing Approach
- Unit tests for JSON structure validation
- Integration test with sample documents of each type
- Comparison of extracted text against source document

### Acceptance Criteria
- [x] PDFs extracted with section structure preserved
- [x] Both extraction modes produce valid JSON
- [x] SpaCy sentence splitting applied correctly
- [x] Processing time tracked per document
- [x] Error handling for malformed documents

## Known Limitations

- Processing is moderately slow (~23 seconds average per document)
- Complex layouts (multi-column, tables) may not extract perfectly
- Some documents fail due to format issues (~20% failure rate on complex docs)
- GPU acceleration recommended for reasonable performance

