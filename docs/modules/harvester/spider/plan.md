# Spider

## Purpose

Domain-restricted web crawler that harvests HTML pages and downloadable documents from organization websites while extracting outbound links for network analysis.

## How It Works

The spider starts from an organization's landing page URL and crawls within the domain boundary, collecting:
1. HTML pages — saved as raw files with sequential naming
2. Documents (PDF, DOCX, PPTX, XLSX) — downloaded from CDN or asset domains
3. Outbound links — extracted from all pages for network graph construction

Scrapy handles rate limiting, politeness, and error recovery automatically.

## Key Components

- **OrgSpider:** Main Scrapy spider class with domain restriction logic
- **Settings:** Politeness configuration (delays, concurrency, robots.txt)
- **Paths:** Output directory structure utilities (`OrgPaths` class)
- **Runner:** Programmatic spider execution wrapper

## Source Location

**Primary source:**
- `kancil/scraper/spiders/org_spider.py` — Main spider implementation

**Tests:**
- `tests/scraper/test_org_spider.py`

## Implementation Details

**Domain Handling:**
- HTML crawling restricted to primary domain
- Document downloads allowed from CDN subdomains (e.g., cdn.example.org)
- External links captured but not followed

**Politeness Settings:**
- Download delay: 2 seconds
- Concurrent requests: 4 (2 per domain)
- AutoThrottle enabled with 1.0 target concurrency
- HTTP caching for development iteration

**Output Structure:**
```
data/output/{org_name}/
├── raw/
│   ├── page_0001.html
│   ├── page_0002.html
│   └── document_0001.pdf
├── metadata/
│   └── (created by metadata feature)
└── links.csv
```

## Integration Points

- **Input:** Organization name and landing page URL
- **Output:** Raw files in `raw/`, triggers metadata generation
- **Links CSV:** Consumed by network analysis tools

## Verification Strategy

### Testing Approach
- Unit tests for URL filtering and domain restriction logic
- Integration test: complete crawl of pilot site (GetUp Australia)
- End-to-end validation of output structure

### Acceptance Criteria
- [x] Spider completes without errors on pilot site
- [x] All discovered pages saved with sequential naming
- [x] Documents downloaded from CDN domains
- [x] Links CSV contains source_url, target_url, link_text, timestamp
- [x] Politeness settings respected (observable crawl rate)

## Known Limitations

- Does not handle JavaScript-rendered content (static HTML only)
- Some relative URLs may resolve incorrectly (logged, handled gracefully)
- Depth not limited by default (adjustable if sites prove enormous)

