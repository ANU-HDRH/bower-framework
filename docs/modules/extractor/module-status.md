# Extractor — Integration Status

**Last Updated:** 2025-11-20  
**Status:** ✓ Complete

## Module Purpose

LLM-based extraction of structured organizational information from processed content, including smart triage, multi-type extraction, and synthesis aggregation.

## Features in Module

- **Triage** — Page relevance classification
- **Page Extraction** — Mission/staff/advocacy extraction from HTML
- **Aggregation** — Org-level summary generation

## Integration Points

**Processor → Extractor:**
- Extractor reads cleaned HTML from `processed/`
- Extractor reads document text JSON for metadata extraction
- Metadata provides context (URL, link_text)

**Triage → Page Extraction:**
- Triage classifies each page as relevant/irrelevant
- Page extraction only processes `is_relevant: true` pages
- Triage categories guide extraction type selection

**Page Extraction → Aggregation:**
- All page extractions collected in `extractions/pages/`
- Document extractions collected in `extractions/documents/`
- Aggregation synthesizes all into `org_summary.json`

**Two-Track Architecture:**
- **Track 1 (Pages):** Triage → Extract → Aggregate
- **Track 2 (Documents):** Direct metadata extraction → Aggregate

## Integration Testing

### Test Scenarios

1. **Complete Extraction Flow**
   - Input: Processed org directory
   - Trigger: `uv run python -m kancil.cli.extract --org getup`
   - Expected: Triage + extractions + org_summary.json
   - Success: All outputs present and valid

2. **Triage Filtering**
   - Input: Mix of relevant and irrelevant pages
   - Expected: Only relevant pages get extraction files
   - Success: 49/54 pages extracted (5 filtered)

3. **Document Track**
   - Input: Processed document JSONs
   - Expected: Document metadata extracted, included in summary
   - Success: 41/51 documents contribute to summary

### Test Results

- Scenario 1: ✓ Passing
- Scenario 2: ✓ Passing (91% relevance rate)
- Scenario 3: ✓ Passing (80% document success rate)

## Known Integration Issues

- **Document failures:** ~20% of documents fail extraction due to empty text or format issues; logged and continued
- **Schema relaxation:** Pydantic schemas allow nulls for graceful handling of partial extractions

## Dependencies

**External:**
- OpenRouter API access
- LLM model availability (Gemini Flash 2.5)

**Internal:**
- Processor module output (cleaned HTML, document JSON)
- PromptSpec prompts in `data/promptspec/`

## Cost Summary

**Pilot Run (105 files):**
- API calls: ~100+
- Total cost: ~$0.64 USD
- Processing time: ~5 minutes

