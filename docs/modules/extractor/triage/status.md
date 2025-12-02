# Triage — Status

**Last Updated:** 2025-11-20  
**Status:** ✓ Complete

## Current State

Page triage is fully implemented and validated. Successfully classifies pages as relevant or irrelevant for downstream extraction.

**Pilot Results:**
- Pages triaged: 54
- Relevant pages identified: 49 (91%)
- Irrelevant pages filtered: 5 (9%)
- Success rate: 100%

## Known Issues

- Some navigation/index pages may be marked relevant when they contain mission-related keywords but lack extractable content

## Work In Progress

None — feature complete.

## Deferred Work

- **Finer categories:** Could expand beyond mission/staff/advocacy to include media, events, etc.
- **Confidence thresholds:** Could filter by confidence score for borderline cases
- **Batch triage:** Could process multiple pages in single LLM call for efficiency

## Performance Notes

- Triage uses fast/cheap model for cost efficiency
- Average triage time: <1 second per page
- Cost: Minimal (small input, structured output)

## Recent Changes

- 2025-11-20: Initial implementation with PromptSpec integration
- 2025-11-20: Added link_text context for improved classification
- 2025-11-20: Validated triage accuracy on pilot site

