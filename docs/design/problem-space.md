# Problem Space

## The Problem

Researchers studying interest group organizations need structured data about organizational characteristics—mission statements, staff capabilities, advocacy priorities, and network relationships. This information exists on organization websites but is:

1. **Scattered:** Spread across multiple pages, PDFs, and document types
2. **Unstructured:** HTML layouts vary wildly between organizations
3. **Time-consuming:** Manual extraction doesn't scale to dozens of organizations
4. **Inconsistent:** Human extractors apply different interpretations

The immediate need is analyzing ~30 Indonesian environmental NGOs for a research project, but the approach should inform the data model for a larger national infrastructure project (Gudgenby).

## Who Has This Problem

**Primary users:**
- Political science researchers studying advocacy organizations
- Research assistants performing data collection
- Policy analysts mapping organizational networks

**Use cases:**
- Extract organizational mission/vision statements for comparative analysis
- Identify staff expertise and organizational capabilities
- Map advocacy priorities and campaign focus areas
- Build network graphs of organizational relationships (via outbound links)
- Aggregate media releases and policy documents

## Current Alternatives

**Manual extraction:**
- Researcher visits each website, copies relevant text
- Slow, inconsistent, doesn't capture network relationships
- Doesn't scale beyond a handful of organizations

**Generic web scrapers:**
- Capture raw HTML but don't extract structured information
- Require significant post-processing
- Don't handle document formats (PDF, DOCX)

**Commercial data providers:**
- May not cover niche organizations (Indonesian NGOs)
- Expensive for research budgets
- Data models don't match research questions

## Success Criteria

1. Complete harvest of ~30 organization websites with all accessible content
2. Network analysis data (outbound links) in usable format for graph analysis
3. Clean, structured content suitable for LLM processing
4. Accurate extraction of mission statements, staff info, and advocacy priorities
5. Pydantic data models that transfer to the larger Gudgenby project
6. Research assistant can independently iterate on extraction prompts
7. Total cost under reasonable research budget constraints

## Scope

**In Scope:**
- Web page harvesting (HTML) within organization domains
- Document download and processing (PDF, DOCX, PPTX, XLSX)
- Outbound link extraction for network analysis
- HTML sanitization preserving semantic structure
- LLM-based extraction of organizational characteristics
- Batch processing of multiple organizations
- Pilot validation on English-language site before Indonesian deployment

**Out of Scope:**
- Real-time monitoring of website changes
- Social media content extraction
- Deep crawling beyond primary domains
- Translation services (LLM handles Indonesian directly)
- Public-facing data interface (research tool only)
- Historical/archived content (Wayback Machine)

## Constraints

**Technical constraints:**
- Target sites hosted in Indonesia, potentially limited infrastructure
- Must respect robots.txt and use conservative crawl rates
- LLM API costs scale with content volume
- Document processing (docling) has moderate performance overhead

**Research constraints:**
- Research ethics: spoofing and robots.txt bypass justifiable if necessary
- Budget limits on LLM API spending
- Timeline pressure from research output deadlines

**Data constraints:**
- Indonesian language content (LLM must handle appropriately)
- Variable website quality and structure
- Some documents may be malformed or unparseable

