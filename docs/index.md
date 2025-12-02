# Kancil Project Index

## Core System
- [Architecture](architecture.md) — System overview and key decisions
- [Constitution](constitution.md) — Development process conventions
- [CLAUDE.md](CLAUDE.md) — AI agent context and code standards

## Design Context
- [Problem Space](design/problem-space.md) — Interest group analysis and web harvesting
- [Design Decisions](design/design-decisions.md) — Key choices and alternatives

## Modules

### Harvester [✓ Complete]
Web scraping and content acquisition pipeline using Scrapy
- [Spider](modules/harvester/spider/) [✓] — Domain-restricted crawling
- [Metadata](modules/harvester/metadata/) [✓] — Resource metadata generation
- [Module Status](modules/harvester/module-status.md)

### Processor [✓ Complete]
Content cleaning and document extraction for LLM consumption
- [HTML Sanitizer](modules/processor/html-sanitizer/) [✓] — Semantic HTML cleaning
- [Document Extractor](modules/processor/document-extractor/) [✓] — PDF/document processing via docling
- [Module Status](modules/processor/module-status.md)

### Extractor [✓ Complete]
LLM-based information extraction and aggregation
- [Triage](modules/extractor/triage/) [✓] — Page relevance classification
- [Page Extraction](modules/extractor/page-extraction/) [✓] — Mission/staff/advocacy extraction
- [Aggregation](modules/extractor/aggregation/) [✓] — Org-level summary generation
- [Module Status](modules/extractor/module-status.md)

### Orchestration [✓ Complete]
Batch processing and workflow management
- [Batch](modules/orchestration/batch/) [✓] — CSV-driven multi-site processing
- [Prefect](modules/orchestration/prefect/) [✓] — Workflow orchestration and observability
- [Module Status](modules/orchestration/module-status.md)

---

**Status Markers:**
- ✓ Complete and stable
- 🚧 In active development
- ⏸ Planned but not started
- 🟡 Complete but with known issues
- 🔴 Broken or degraded
- 🔧 Under revision/refactor

