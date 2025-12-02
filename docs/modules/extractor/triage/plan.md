# Triage

## Purpose

Classify web pages by relevance before detailed extraction, avoiding expensive LLM calls on irrelevant content (navigation pages, privacy policies, etc.).

## How It Works

For each cleaned HTML page:
1. Load page content and metadata (including `link_text` for context)
2. Send to LLM with triage prompt asking: "Is this page about mission, staff, or advocacy?"
3. Receive structured classification response
4. Save triage result for downstream extraction decisions
5. Only pages marked relevant proceed to detailed extraction

## Key Components

- **PageTriageResult:** Pydantic model for triage response
- **Triage Prompt:** PromptSpec-managed classification prompt
- **OpenRouter Client:** LLM API integration with retry logic
- **Cost Tracker:** Token usage and cost logging

## Source Location

**Primary source:**
- `kancil/extractors/triage.py` — Page relevance classification

**Tests:**
- `tests/extractors/test_triage.py`

## Implementation Details

**Triage Schema:**
```python
class PageTriageResult(BaseModel):
    is_relevant: bool
    categories: list[str]  # ["mission", "staff", "advocacy"]
    confidence: float
    reasoning: str
```

**PromptSpec Location:** `data/promptspec/page_triage/1/promptspec.md`

**Prompt Strategy:**
- Provide page content (cleaned HTML or text excerpt)
- Include link_text from metadata for additional context
- Ask for binary relevance + category classification
- Request reasoning for quality assurance

**Output:**
```
data/output/{org_name}/extractions/pages/
└── page_0001_triage.json
```

## Integration Points

- **Input:** Cleaned HTML from `processed/` directory
- **Metadata:** Uses `link_text` field for context
- **Output:** Triage JSON in `extractions/pages/`
- **Consumer:** Page extraction only processes pages with `is_relevant: true`

## Verification Strategy

### Testing Approach
- Manual review of triage decisions on pilot site
- Comparison of identified relevant pages against expected content
- Analysis of false positive/negative rates

### Acceptance Criteria
- [x] All pages receive triage classification
- [x] Triage results validate against Pydantic schema
- [x] Relevant pages include mission/about pages
- [x] Irrelevant pages correctly filtered (privacy, terms, etc.)
- [x] Cost tracking functional

## Known Limitations

- Triage adds LLM cost overhead (mitigated by fast/cheap model)
- Some borderline pages may be incorrectly classified
- Category detection is coarse (mission/staff/advocacy only)

