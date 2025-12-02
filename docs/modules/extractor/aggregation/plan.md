# Aggregation

## Purpose

Combine page-level and document-level extractions into a unified organization summary, synthesizing information from multiple sources into a coherent profile.

## How It Works

After all page and document extractions complete:
1. Collect all page-level extractions (mission, staff, advocacy)
2. Collect all document metadata extractions
3. Send combined data to LLM for synthesis
4. Generate unified organization summary
5. Include statistics on processed content

## Key Components

- **OrgSummary:** Pydantic model for aggregated output
- **Aggregation Prompt:** Synthesis prompt for combining extractions
- **Statistics Generator:** Counts of processed files and extractions
- **Document Summary:** Concatenated document metadata

## Source Location

**Primary source:**
- `kancil/extractors/aggregator.py` — Organization summary aggregation

**Tests:**
- `tests/extractors/test_aggregator.py`

## Implementation Details

**OrgSummary Schema:**
```python
class OrgSummary(BaseModel):
    org_name: str
    mission_vision: MissionVision
    staff_capabilities: StaffSummary
    advocacy_agenda: AdvocacySummary
    statistics: ProcessingStatistics
    source_summary: list[SourceSummary]
```

**Aggregation Strategy:**
- Deduplicate similar mission statements across pages
- Merge staff lists from multiple sources
- Consolidate campaign/priority lists
- Preserve source attribution

**Output:**
```
data/output/{org_name}/
├── extractions/
│   ├── pages/
│   └── documents/
├── documents_summary.json  # Concatenated document metadata
└── org_summary.json        # Final aggregated output
```

## Integration Points

- **Input:** All extraction JSONs from `extractions/` directory
- **Page Extractions:** Mission, staff, advocacy from pages
- **Document Extractions:** Metadata from documents
- **Output:** `org_summary.json` as final deliverable

## Verification Strategy

### Testing Approach
- Manual review of org summary vs individual extractions
- Validation that all sources are represented
- Check for coherent narrative synthesis

### Acceptance Criteria
- [x] Summary includes all extraction types
- [x] Statistics accurately reflect processing counts
- [x] Source attributions preserved
- [x] Coherent synthesis (not just concatenation)
- [x] JSON validates against OrgSummary schema

## Known Limitations

- Synthesis quality depends on extraction quality
- Conflicting information may not be resolved clearly
- Large organizations may exceed context limits
- Single aggregation pass (no iterative refinement)

