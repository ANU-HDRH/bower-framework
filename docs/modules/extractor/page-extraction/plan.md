# Page Extraction

## Purpose

Extract structured organizational information from relevant web pages, including mission statements, staff capabilities, and advocacy priorities.

## How It Works

For each page marked relevant by triage:
1. Load cleaned HTML content
2. Determine extraction type(s) based on triage categories
3. Send to LLM with appropriate extraction prompt
4. Receive structured extraction with source references
5. Save extraction result for aggregation

Three extraction types, each with dedicated prompts:
- **Mission:** Organizational mission, vision, values
- **Staff:** Team members, expertise, capabilities
- **Advocacy:** Campaigns, priorities, policy positions

## Key Components

- **Extraction Schemas:** Pydantic models per extraction type
- **Extraction Prompts:** PromptSpec-managed prompts
- **OpenRouter Client:** LLM API with structured output validation
- **Source References:** Links extracted content to source pages

## Source Location

**Primary source:**
- `kancil/extractors/page_extractor.py` — Page content extraction

**Tests:**
- `tests/extractors/test_page_extractor.py`

## Implementation Details

**Extraction Schemas:**
```python
class MissionExtraction(BaseModel):
    mission_statement: str | None
    vision_statement: str | None
    values: list[str]
    source_refs: list[SourceRef]

class StaffCapabilityExtraction(BaseModel):
    staff_members: list[StaffMember]
    capabilities: list[str]
    source_refs: list[SourceRef]

class AdvocacyExtraction(BaseModel):
    campaigns: list[Campaign]
    priorities: list[str]
    policy_positions: list[str]
    source_refs: list[SourceRef]
```

**PromptSpec Locations:**
- `data/promptspec/mission_extraction/1/promptspec.md`
- `data/promptspec/staff_extraction/1/promptspec.md`
- `data/promptspec/advocacy_extraction/1/promptspec.md`

**Output:**
```
data/output/{org_name}/extractions/pages/
├── page_0001_triage.json
└── page_0001_extraction.json  # Contains all extraction types
```

## Integration Points

- **Input:** Cleaned HTML + triage result
- **Triage Filter:** Only processes `is_relevant: true` pages
- **Output:** Extraction JSON with source references
- **Consumer:** Aggregation module combines page-level extractions

## Verification Strategy

### Testing Approach
- Manual comparison of extracted mission vs actual website mission
- Validation of staff extraction against about/team pages
- Check advocacy priorities against known campaigns

### Acceptance Criteria
- [x] All relevant pages receive extraction attempts
- [x] Extractions validate against Pydantic schemas
- [x] Source references point to correct pages
- [x] Mission/vision accurately captured
- [x] Staff information extracted where available
- [x] Advocacy priorities match visible campaigns

## Known Limitations

- Extraction quality depends on page content clarity
- Some pages may lack extractable content despite being relevant
- Multi-page information requires aggregation (not captured per-page)
- Schema allows nulls to handle missing information gracefully

