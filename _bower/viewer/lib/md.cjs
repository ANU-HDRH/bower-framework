'use strict';
// Minimal Markdown structure parsing. No rendering — the browser does that.
// Deliberately dependency-free and shell-agnostic: this file must run unchanged
// in node, bun, and a VS Code extension host.

const MARKERS = ['✓', '🚧', '⏸', '🟡', '🔴', '🔧'];

const MARKER_META = {
  '✓': { key: 'complete', label: 'Complete and stable', rank: 0 },
  '🚧': { key: 'wip', label: 'In active development', rank: 2 },
  '⏸': { key: 'planned', label: 'Planned but not started', rank: 1 },
  '🟡': { key: 'issues', label: 'Complete with known issues', rank: 3 },
  '🔴': { key: 'broken', label: 'Broken or degraded', rank: 5 },
  '🔧': { key: 'revision', label: 'Under revision / refactor', rank: 4 },
};

/** Strip fenced code blocks so structural scans never match inside them. */
function withoutFences(md) {
  const out = [];
  let fenced = false;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      out.push('');
      continue;
    }
    out.push(fenced ? '' : line);
  }
  return out.join('\n');
}

/** Parse the leading `---` YAML block. Handles `k: v`, `k: [a, b]`, and quotes. */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { fm: {}, body: text };
  const fm = {};
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trim();
    if (!line) continue;
    const kv = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (/^\[.*\]$/.test(val)) {
      fm[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { fm, body: text.slice(m[0].length) };
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Heading outline, for in-page TOCs on the very large central docs. */
function headings(md) {
  const seen = new Map();
  const out = [];
  for (const line of withoutFences(md).split('\n')) {
    const m = /^(#{1,4})\s+(.*?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/\s*#+\s*$/, '');
    let slug = slugify(text);
    if (seen.has(slug)) {
      const n = seen.get(slug) + 1;
      seen.set(slug, n);
      slug = `${slug}-${n}`;
    } else {
      seen.set(slug, 0);
    }
    out.push({ depth: m[1].length, text, slug });
  }
  return out;
}

/** Split on `## ` headings → { heading: bodyText }. Preserves order via _order. */
function sections(md) {
  const clean = withoutFences(md).split('\n');
  const lines = md.split('\n');
  const map = {};
  const order = [];
  let current = null;
  let buf = [];
  const flush = () => {
    if (current !== null) map[current] = buf.join('\n').trim();
  };
  for (let i = 0; i < lines.length; i++) {
    const m = /^##\s+(.*?)\s*$/.exec(clean[i] || '');
    if (m) {
      flush();
      current = m[1];
      order.push(current);
      buf = [];
    } else if (current !== null) {
      buf.push(lines[i]);
    }
  }
  flush();
  Object.defineProperty(map, '_order', { value: order, enumerable: false });
  return map;
}

/** First GFM table in a block → { header: [], rows: [[]] }. */
function firstTable(block) {
  if (!block) return null;
  const lines = block.split('\n');
  const start = lines.findIndex(
    (l, i) => /^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1] || ''),
  );
  if (start === -1) return null;
  const cells = (l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
  const header = cells(lines[start]);
  const rows = [];
  for (let i = start + 2; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) break;
    rows.push(cells(lines[i]));
  }
  return { header, rows };
}

/** All inline links `[text](target)`, excluding images and bare anchors. */
function links(md) {
  const out = [];
  const re = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  const clean = withoutFences(md);
  while ((m = re.exec(clean))) {
    if (m[1] === '!') continue;
    const target = m[3];
    if (target.startsWith('#')) continue;
    out.push({ text: m[2], target });
  }
  return out;
}

/**
 * Earliest-occurring marker in a string, by position in the text.
 *
 * Never scan in MARKERS order. Prose routinely names a marker other than the
 * one the line asserts — "🚧 … complete and previously ✓" is how a reopened
 * feature is written — and declaration order hands back whichever glyph is
 * listed first, which is ✓. That reads a reopened feature as done and reports
 * its agreement with its own build order as a marker disagreement.
 */
function firstMarkerIn(text) {
  let best = null;
  for (const mk of MARKERS) {
    const i = (text || '').indexOf(mk);
    if (i !== -1 && (best === null || i < best.i)) best = { i, mk };
  }
  return best ? best.mk : null;
}

// The asserted marker sits just past the separator; anything after it is
// annotation and may name others.
const AFTER_DASH = new RegExp(`[—–-]\\s*(${MARKERS.join('|')})`);

/** Leading status marker in the first few lines of a status doc. */
function leadingMarker(md) {
  const lines = md.split('\n').slice(0, 12);
  // The canonical home first (framework-reference.md → "status.md — Resumption
  // Framing"): `# <feature> — <marker>`. The heading is the claim; the paragraph
  // under it is prose that may mention any number of other markers, so the
  // heading wins outright rather than competing with the body.
  const heading = lines.find((l) => /^#\s/.test(l));
  if (heading) {
    const mk = (AFTER_DASH.exec(heading) || [])[1] || firstMarkerIn(heading);
    if (mk) return mk;
  }
  for (const line of lines) {
    const stripped = line.replace(/^#+\s.*$/, '').replace(/\*\*[^*]*\*\*/g, '').trim();
    for (const mk of MARKERS) {
      if (stripped.startsWith(mk)) return mk;
    }
  }
  // Fall back to the earliest marker anywhere in the opening paragraph block.
  return firstMarkerIn(lines.join('\n'));
}

/** Trailing status marker on a line, e.g. `Test: foo.ts — ✓`. */
function trailingMarker(line) {
  if (!line) return null;
  // Take the separator's marker when there is one (`Test: foo.ts — ✓`,
  // `5. feature — 🚧 (…)`), earliest otherwise — `Review: ✓ 2026-08-04 (13 of
  // 13 features)` carries no dash.
  return (AFTER_DASH.exec(line) || [])[1] || firstMarkerIn(line);
}

/**
 * Value of a `Label:` clause, to the end of its line.
 *
 * Both line-leading (`Pending verification:` in a status.md) and mid-line
 * (`Remaining:` inside a build-order annotation) forms occur, so the label is
 * matched at any non-word boundary rather than anchored to the line start.
 * Returns null when the label is absent, '' when present but empty.
 */
function labelled(block, label, opts = {}) {
  // `anchored` requires the label to open its own line (emphasis allowed). Use it
  // for labels whose *name* is likely to appear in surrounding prose — the
  // mid-line default would happily match a sentence discussing the convention
  // and return the rest of that sentence as the value.
  const lead = opts.anchored ? '^\\s*' : '(?:^|[^\\w])';
  const re = new RegExp(`${lead}(\\*\\*|__|\\*|_)?${label}(?:\\*\\*|__|\\*|_)?\\s*:\\s*(.*)$`, 'im');
  const m = re.exec(block || '');
  if (!m) return null;
  let rest = m[2].trim();
  // `**Label:** value` closes its emphasis *after* the colon, so the run lands
  // at the head of the value. Strip it only when the label itself was emphasised
  // with the same marker — that way a value that legitimately opens with
  // emphasis (`Notes: *none yet*`) is left alone.
  if (m[1] && rest.startsWith(m[1])) rest = rest.slice(m[1].length).trim();
  return rest;
}

/**
 * Success criteria from `scope.md`'s `## Success criteria` block.
 *
 * Per framework-reference.md's "scope.md — Boundary, Not Tracker": each
 * criterion is a bullet, optionally followed by an italicised
 * `Delivered by: <module>[, <module>]` clause and **no** status field. Both
 * `*…*` and `_…_` emphasis are accepted; projects write either.
 */
function criteria(block) {
  if (!block) return [];
  const out = [];
  let cur = null;
  const push = () => {
    if (!cur) return;
    cur.text = cur.text.trim();
    if (cur.text) out.push(cur);
    cur = null;
  };
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    // A `Delivered by:` clause continues the criterion above it, whether or not
    // it is itself written as a nested bullet.
    const clause = /^(?:[-*]\s+)?[*_]*\s*Delivered by\s*:\s*(.*?)\s*[*_]*$/i.exec(line);
    if (clause) {
      if (cur)
        cur.deliveredBy = clause[1]
          .split(/[,·]|\band\b/)
          .map((s) => s.trim().replace(/[`*_.]/g, ''))
          .filter(Boolean);
      continue;
    }
    if (bullet) {
      push();
      cur = { text: bullet[1], deliveredBy: [], marker: trailingMarker(bullet[1]) };
      continue;
    }
    if (!line) {
      // A blank line ends a criterion only once its clause has been seen; scope
      // files vary on whether the clause is separated by one.
      if (cur && cur.deliveredBy.length) push();
      continue;
    }
    if (cur) cur.text += ` ${line}`;
  }
  push();
  return out;
}

/** Backticked identifiers in a prose fragment: `` `foo` `` → ['foo']. */
function backticked(text) {
  const out = [];
  const re = /`([^`]+)`/g;
  let m;
  while ((m = re.exec(text || ''))) out.push(m[1]);
  return out;
}

/**
 * ADR references anywhere in text. Three forms, two ID shapes (v0.38):
 *   ADR-0014 / ADR-host-credentials      — the ID itself
 *   adr/0014-<slug>.md                    — a legacy link; the key is the digits
 *   adr/host-credentials.md               — a v0.38 link; the key is the stem
 * A slug ID ends at the first character outside [a-z0-9-] and never ends in a
 * hyphen, so `ADR-foo-bar.` and `ADR-foo-bar)` both yield `ADR-foo-bar`.
 */
function adrRefs(text) {
  const ids = new Set();
  let m;
  const re = /ADR-([a-z0-9]+(?:-[a-z0-9]+)*)/gi;
  while ((m = re.exec(text || ''))) ids.add(`ADR-${m[1]}`);
  const legacyLink = /adr\/(\d{4})-[^\s)]*\.md/g;
  while ((m = legacyLink.exec(text || ''))) ids.add(`ADR-${m[1]}`);
  const slugLink = /adr\/([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\.md/g;
  while ((m = slugLink.exec(text || ''))) if (m[1] !== 'index') ids.add(`ADR-${m[1]}`);
  return [...ids];
}

/** First non-empty paragraph of a block, flattened to one line. */
function firstParagraph(block) {
  if (!block) return '';
  const lines = block.split('\n');
  const buf = [];
  for (const line of lines) {
    if (!line.trim()) {
      if (buf.length) break;
      continue;
    }
    if (/^#/.test(line)) {
      if (buf.length) break;
      continue;
    }
    buf.push(line.trim());
  }
  return buf.join(' ').trim();
}

module.exports = {
  MARKERS,
  MARKER_META,
  frontmatter,
  slugify,
  headings,
  sections,
  firstTable,
  links,
  firstMarkerIn,
  leadingMarker,
  trailingMarker,
  labelled,
  criteria,
  backticked,
  adrRefs,
  firstParagraph,
  withoutFences,
};
