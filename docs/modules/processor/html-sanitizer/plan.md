# HTML Sanitizer

## Purpose

Clean raw HTML pages by removing noise (scripts, styles, navigation) while preserving semantic structure for LLM consumption.

## How It Works

The sanitizer applies a whitelist-based approach:
1. Parse HTML with BeautifulSoup
2. Remove noisy elements (script, style, noscript, nav, comments)
3. Strip inline styles and unnecessary attributes
4. Preserve semantic structure (article, section, headings, paragraphs, lists, tables)
5. Keep essential attributes (href, src, alt) for context
6. Output cleaned HTML preserving document structure

## Key Components

- **HTMLSanitizer:** BeautifulSoup-based cleaning pipeline
- **Tag Whitelist:** Allowed semantic elements
- **Attribute Whitelist:** Essential attributes to preserve
- **Timing Tracker:** Per-file processing time measurement

## Source Location

**Primary source:**
- `kancil/processors/html_sanitizer.py` — HTML cleaning implementation

**Tests:**
- `tests/processors/test_html_sanitizer.py`

## Implementation Details

**Remove Elements:**
- `<script>`, `<style>`, `<noscript>` — code and styling
- `<nav>` — navigation menus (not content)
- HTML comments — developer notes
- Inline `style` attributes — presentation details

**Preserve Elements:**
- Semantic: `<article>`, `<section>`, `<main>`, `<aside>`
- Headings: `<h1>` through `<h6>`
- Text: `<p>`, `<span>`, `<blockquote>`, `<pre>`, `<code>`
- Lists: `<ul>`, `<ol>`, `<li>`, `<dl>`, `<dt>`, `<dd>`
- Tables: `<table>`, `<tr>`, `<td>`, `<th>`, `<thead>`, `<tbody>`
- Links/Media: `<a>`, `<img>`, `<figure>`, `<figcaption>`

**Preserve Attributes:**
- `href` — link destinations (valuable for context)
- `src` — image sources
- `alt` — image descriptions

**Output:**
```
data/output/{org_name}/processed/
└── page_0001_clean.html
```

## Integration Points

- **Input:** Raw HTML from `raw/` directory
- **Output:** Cleaned HTML in `processed/` directory
- **Metadata Update:** Sets `processed_files` and `processing_time_seconds`
- **Consumer:** Extractor module reads cleaned HTML for LLM processing

## Verification Strategy

### Testing Approach
- Unit tests for tag removal and preservation
- Comparison of raw vs cleaned HTML for semantic integrity
- Validation that cleaned HTML is well-formed

### Acceptance Criteria
- [x] Scripts, styles, and navigation removed
- [x] Semantic structure preserved (headings, sections, paragraphs)
- [x] Links and images retain essential attributes
- [x] Output is well-formed HTML
- [x] Processing time tracked per file

## Known Limitations

- Aggressive nav removal may occasionally drop useful content
- Some sites embed content in non-semantic divs (preserved but noisy)
- Does not extract main content area (preserves full page structure)

