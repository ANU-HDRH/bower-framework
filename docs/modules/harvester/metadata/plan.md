# Metadata

## Purpose

Generate structured metadata for each harvested resource, enabling tracking, deduplication, and downstream processing coordination.

## How It Works

For each resource (HTML page or document) saved by the spider, a corresponding JSON metadata file is created containing:
- Source URL and fetch timestamp
- Content type and HTTP status
- File paths (raw and processed)
- Content hash for deduplication

Metadata files are pretty-printed JSON for easy debugging and manual inspection.

## Key Components

- **ResourceMetadata:** Pydantic model defining the metadata schema
- **Metadata Pipeline:** Scrapy item pipeline that generates metadata on save
- **Paths:** Consistent naming between raw files and metadata files

## Source Location

**Primary source:**
- `kancil/scraper/models.py` — Pydantic metadata models

**Tests:**
- `tests/scraper/test_models.py`

## Implementation Details

**Pydantic Schema:**
```python
class ResourceMetadata(BaseModel):
    url: str
    timestamp: datetime
    content_type: str
    status_code: int
    raw_file: Path
    extracted_file: Path | None  # Set by processor
    content_hash: str  # SHA256 for deduplication
    link_text: str | None  # Text of link that led here
```

**Output Structure:**
```
data/output/{org_name}/
├── raw/
│   ├── page_0001.html
│   └── document_0001.pdf
└── metadata/
    ├── page_0001.json
    └── document_0001.json
```

**Naming Convention:**
- Metadata filename matches raw filename with `.json` extension
- Sequential numbering shared with raw files

## Integration Points

- **Input:** Scrapy response object during crawl
- **Output:** JSON files in `metadata/` directory
- **Consumers:** Processor module reads metadata to find files to process
- **Updates:** Processor updates `extracted_file` and processing status fields

## Verification Strategy

### Testing Approach
- Unit tests for Pydantic model validation
- Integration test: metadata files match raw files 1:1
- Validation of JSON structure and required fields

### Acceptance Criteria
- [x] Every raw file has a corresponding metadata JSON
- [x] Metadata validates against Pydantic schema
- [x] Content hashes calculated correctly (SHA256)
- [x] Pretty-printed JSON (human-readable)
- [x] Timestamps in ISO format

## Known Limitations

- Content hash is of raw content, not normalized (different encodings may not dedupe)
- Metadata file size grows with additional processing fields

