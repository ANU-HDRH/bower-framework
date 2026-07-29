#!/usr/bin/env node
'use strict';
// Acceptance test for _bower/viewer's extractor.
//
//   node tools/viewer-test/run.cjs
//
// Zero dependencies, runs on node or bun, exits non-zero on failure.
// scripts/release.sh runs it, so a release cannot be cut with the viewer
// misreading the current document schemas.
//
// WHAT THIS IS FOR. The viewer parses Bower's document schemas, so every
// framework change that touches a schema can break it — and the break is
// silent, producing a plausible-looking wall of wrong findings rather than a
// crash. That is not hypothetical: v0.26 moved the feature roster out of
// architecture.md and the viewer's drift report became 81% noise on a real
// project, undetected.
//
// A real project cannot catch that. It has whatever drift it happens to have,
// which is never one of each — a healthy project leaves every error-severity
// check completely unexercised. So the fixtures below *contain* the conditions,
// and the assertion that matters most is the negative one: EXPECTED is an exact
// set, so a check that starts firing where it should not fails the run.
//
// The fixtures are not a substitute for pointing the viewer at a real project
// before shipping — see the viewer README. They answer different questions:
// these prove each check is correct, a real project proves the parser survives
// real data.

const path = require('path');
const { extract, SCHEMA_VERSION } = require('../../_bower/viewer/lib/extract.cjs');

const FIXTURES = path.join(__dirname);
let failures = 0;
let checks = 0;

function fail(msg, detail) {
  failures++;
  console.error(`  ✗ ${msg}`);
  if (detail) console.error(`      ${detail}`);
}
function pass(msg) {
  checks++;
  console.log(`  ✓ ${msg}`);
}
function assert(cond, msg, detail) {
  cond ? pass(msg) : fail(msg, detail);
}
function assertSetsEqual(actual, expected, label) {
  const a = new Set(actual);
  const e = new Set(expected);
  const missing = [...e].filter((x) => !a.has(x)).sort();
  const extra = [...a].filter((x) => !e.has(x)).sort();
  if (!missing.length && !extra.length) return pass(`${label} — exactly ${e.size} kinds`);
  failures++;
  console.error(`  ✗ ${label}`);
  if (missing.length)
    console.error(
      `      never fired (${missing.length}): ${missing.join(', ')}\n` +
        `        → the fixture stopped triggering these, or the check was dropped.`,
    );
  if (extra.length)
    console.error(
      `      fired unexpectedly (${extra.length}): ${extra.join(', ')}\n` +
        `        → a check is firing on conformant docs. This is the v0.26 failure mode:\n` +
        `          if a schema changed, the check needs updating, not the fixture.`,
    );
}

// ─────────────────────────────────────────────────────── fixture: the main tree

// Every kind the main fixture is built to produce. Exact — see assertSetsEqual.
const EXPECTED = [
  // status and marker honesty
  'marker-disagreement',
  'pending-verification-complete',
  'status-no-marker',
  'missing-plan',
  'missing-status',
  'no-components-table',
  'component-missing',
  'feature-not-in-build-order',
  'build-order-orphan',
  // module structure
  'arch-module-missing',
  'module-dir-missing',
  'missing-module-status',
  'module-status-divergence',
  'arch-feature-roster',
  'build-order-unparsed',
  // scope criteria (v0.24)
  'criterion-no-owner',
  'criterion-stale-pointer',
  'criterion-carries-status',
  // ADR supersession
  'adr-asymmetric',
  'adr-dangling',
  'adr-status-conflict',
  'adr-no-successor',
  'adr-unknown-module',
  'adr-unclassified',
  // ADR narrowing (v0.27)
  'adr-narrow-asymmetric',
  'adr-narrow-dangling',
  'adr-narrow-and-supersede',
  'narrowed-adr-not-accepted',
  // links
  'broken-link',
  'relative-doc-link',
  // document cost
  'oversized-table-cell',
];

console.log(`\nBower docs viewer — acceptance test (schemas: v${SCHEMA_VERSION})\n`);

console.log('fixture/ — one instance of every drift condition');
const g = extract(path.join(FIXTURES, 'fixture'));

assertSetsEqual(
  g.health.map((h) => h.kind),
  EXPECTED,
  'finding kinds',
);

// The obsolescence tripwire must stay quiet here: if it fires, one of the
// checks above has started matching every candidate in the fixture, which
// makes that check's findings meaningless.
assert(
  !g.health.some((h) => h.kind === 'check-may-be-obsolete'),
  'no check matched all of its candidates',
  g.health
    .filter((h) => h.kind === 'check-may-be-obsolete')
    .map((h) => h.check)
    .join(', '),
);

// The conformant module is the other half of the negative assertion: a schema
// change that makes a check fire on correct docs shows up here first.
const cleanFindings = g.health.filter(
  (h) => /modules\/clean/.test(h.path || '') || /\bclean\//.test(h.message) || h.module === 'clean',
);
assert(
  cleanFindings.length === 0,
  'the conformant module contributes no findings',
  cleanFindings.map((h) => `${h.kind}: ${h.message}`).join('\n      '),
);

// Severities are load-bearing: a contradiction is an error, something to
// reconcile is a warn, a convention note is info.
const sevOf = (kind) => (g.health.find((h) => h.kind === kind) || {}).severity;
for (const [kind, want] of [
  ['marker-disagreement', 'error'],
  ['pending-verification-complete', 'error'],
  ['narrowed-adr-not-accepted', 'error'],
  ['criterion-stale-pointer', 'error'],
  ['component-missing', 'warn'],
  ['arch-feature-roster', 'warn'],
  ['relative-doc-link', 'info'],
])
  assert(sevOf(kind) === want, `${kind} is ${want}`, `got ${sevOf(kind)}`);

// ── structure the views depend on ────────────────────────────────────────────

assert(
  g.counts.modules === 5,
  'five modules (two documented, one ghost, one undeclared, one unparseable build order)',
  `got ${g.counts.modules}`,
);
assert(g.schema.match === true, 'fixture is on the schema version the viewer parses', JSON.stringify(g.schema));

const clean = g.modules.find((m) => m.name === 'clean');
const drifted = g.modules.find((m) => m.name === 'drifted');
assert(clean.status === '✓' && clean.complete, 'a fully built module rolls up ✓', `got ${clean.status}`);
// framework-reference.md's own worked example: all features ✓ with integration
// still ⏸ surfaces as 🚧, not ⏸. ⏸ means not-started, not a severity.
assert(drifted.status === '🚧', 'a part-built module rolls up 🚧, not ⏸', `got ${drifted.status}`);

// v0.22 pull-forward annotation — the `Remaining:` half is the load-bearing
// part, since it is what stops the next pass rebuilding what already exists.
const shrunk = drifted.buildOrder.find((b) => b.name === 'shrunk-feature');
assert(!!shrunk.annotation, 'a scope-reduced build-order entry keeps its annotation');
assert(shrunk.remaining === 'the CLI wrapper only.', 'the Remaining: clause is extracted', `got ${shrunk.remaining}`);
assert(shrunk.marker === '⏸', 'an annotated entry keeps its own marker', `got ${shrunk.marker}`);

// A build order whose numbered entries all fail to parse must say so — the
// silent version cascades into feature-not-in-build-order and a wrong rollup,
// which is exactly the wall-of-plausible-findings failure this tool exists to
// avoid. One finding, naming the module and quoting the first bad line.
const bou = g.health.filter((h) => h.kind === 'build-order-unparsed');
assert(bou.length === 1, 'an unparseable build order is one finding, not a cascade', `got ${bou.length}`);
assert(bou[0] && bou[0].module === 'boldorder', 'it names the module', bou[0] && bou[0].module);
assert(
  bou[0] && /\*\*bold-feature\*\*/.test(bou[0].message),
  'it quotes the first line that failed to parse',
  bou[0] && bou[0].message,
);
const boldorder = g.modules.find((m) => m.name === 'boldorder');
assert(boldorder.buildOrder.length === 0, 'nothing half-parsed leaks into the roster', `got ${boldorder.buildOrder.length}`);

// v0.24 derived success criteria.
assert(g.scope.total === 5, 'five success criteria parsed', `got ${g.scope.total}`);
assert(g.scope.derivable === 3, 'three are derivable', `got ${g.scope.derivable}`);
assert(g.scope.satisfied === 2, 'two are satisfied', `got ${g.scope.satisfied}`);
assert(
  g.scope.criteria.filter((c) => c.satisfied === null).length === 2,
  'an unowned and a stale-pointer criterion are not guessed at',
);
assert(
  g.scope.criteria.some((c) => c.blocking.some((b) => b.module === 'drifted')),
  'an unsatisfied criterion names its blocking module',
);

// v0.27 narrowing — the conformant pair must survive with the target accepted.
const adr = (id) => g.adrs.find((a) => a.id === id);
assert(adr('ADR-0011').narrows.includes('ADR-0012'), 'narrows is read from frontmatter');
assert(adr('ADR-0012').narrowedBy.includes('ADR-0011'), 'narrowed-by is read from frontmatter');
assert(adr('ADR-0012').status === 'accepted', 'a narrowed ADR stays accepted');
assert(g.counts.adrsNarrowed === 3, 'narrowed ADRs are counted', `got ${g.counts.adrsNarrowed}`);

// v0.23 constitution: aspirations must be separable from rules.
assert(g.constitution.items.length === 1, 'the Not-yet-in-force section is extracted', JSON.stringify(g.constitution));

// framework-reference.md status.md spec.
const pending = g.features.filter((f) => f.pendingVerification);
assert(pending.length === 1, 'one feature has pending verification', `got ${pending.length}`);

// An oversized table cell, and the formatter padding it multiplies. Measured on
// a real project: one 15,229-character cell became 75kB of alignment padding in
// docs/index.md, on the orientation read-path of nearly every command.
const cellFinding = g.health.find((h) => h.kind === 'oversized-table-cell');
assert(cellFinding && cellFinding.path === 'docs/index.md', 'the oversized cell is found in index.md');
assert(cellFinding && cellFinding.worstCell > 1200, 'the cell size is reported', `got ${cellFinding && cellFinding.worstCell}`);
assert(cellFinding && cellFinding.padding > 4096, 'the padding it causes is reported', `got ${cellFinding && cellFinding.padding}`);
// Ordinary column alignment is what a formatter is for and must not be reported.
assert(
  g.health.filter((h) => h.kind === 'oversized-table-cell').length === 1,
  'ordinary table alignment elsewhere is not reported',
);
// The tagline feeds a one-line page subtitle, so it is clamped regardless.
assert(g.project.tagline.length <= 200, 'the tagline is clamped', `${g.project.tagline.length} chars`);

// docs/ subdirectories are discovered, not hardcoded to a known list.
assert(g.docs.some((d) => d.id === 'ui'), 'ui.md is picked up');
assert(g.docs.some((d) => d.id === 'adr-index'), 'the ADR index gets its own route');
assert(g.docs.some((d) => d.id === 'operations/runbook'), 'a project subdirectory is discovered');

// Bower's own documents are distinguished from the project's material: the rail
// breaks on it and project pages carry a strap saying no convention applies.
const originOf = (id) => (g.docs.find((d) => d.id === id) || {}).origin;
for (const [id, want] of [
  ['index', 'bower'],
  ['scope', 'bower'],
  ['constitution', 'bower'],
  ['design/problem-space', 'bower'],
  ['adr-index', 'bower'],
  ['operations/runbook', 'project'],
])
  assert(originOf(id) === want, `${id} is ${want}-owned`, `got ${originOf(id)}`);

// The inverse lookup the docs cannot answer: file → owning feature.
assert(g.counts.indexedFiles >= 3, 'the file index is populated', `got ${g.counts.indexedFiles}`);
assert(
  (g.fileIndex['src/b.ts'] || []).length === 2,
  'a file claimed by two features lists both',
  JSON.stringify(g.fileIndex['src/b.ts']),
);

// ───────────────────────────────────────── fixture-adoption: the 🌱 phase

console.log('\nfixture-adoption/ — a project mid-adoption');
const a = extract(path.join(FIXTURES, 'fixture-adoption'));

assert(a.adoption && a.adoption.active, 'the 🌱 banner in index.md is the phase flag');
assert(a.adoption.openItems.length === 2, 'ledger items are parsed', `got ${a.adoption.openItems.length}`);
assert(
  a.adoption.openItems[0].location === 'src/found.ts:14',
  'a ledger line splits into location and question',
  JSON.stringify(a.adoption.openItems[0]),
);
// Adoption marks observed features 🚧 as-built and writes no status.md by
// design. Without the suppression this warns once per adopted feature, which
// makes the report useless on exactly the projects that most need it.
assert(
  !a.health.some((h) => h.kind === 'missing-status'),
  'missing-status stands down during adoption',
  a.health.map((h) => h.kind).join(', '),
);
assert(a.health.length === 0, 'a conformant adopted project is clean', a.health.map((h) => h.kind).join(', '));
// As-built is not verified, so a criterion delivered by an adopted module
// correctly reads outstanding.
assert(a.scope.satisfied === 0 && a.scope.derivable === 1, 'as-built 🚧 does not satisfy a criterion');

// ────────────────────────────── fixture-obsolete: the regression detector

console.log('\nfixture-obsolete/ — a check that has gone universal');
const o = extract(path.join(FIXTURES, 'fixture-obsolete'));
const tripped = o.health.filter((h) => h.kind === 'check-may-be-obsolete');
assert(tripped.length === 1, 'the obsolescence tripwire fires', `got ${tripped.length}`);
assert(
  tripped[0] && tripped[0].check === 'arch-feature-roster',
  'it names the check that matched everything',
  tripped[0] && tripped[0].check,
);
assert(tripped[0] && tripped[0].severity === 'info', 'it is info — aimed at the viewer, not the project');

// ──────────────────────────── the extractor → client contract

// The client reaches the graph through top-level fields only. Renaming one in
// extract.cjs without updating web/app.js produces a blank panel rather than an
// error, so the read set is checked against the real thing. `rev` is the one
// field the server adds after extraction.
console.log('\nweb/app.js — graph fields the client reads');
const appSrc = require('fs').readFileSync(path.join(__dirname, '../../_bower/viewer/web/app.js'), 'utf8');
const readFields = [...new Set([...appSrc.matchAll(/\bG\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))];
const provided = new Set([...Object.keys(g), 'rev']);
const unresolved = readFields.filter((f) => !provided.has(f)).sort();
assert(
  unresolved.length === 0,
  `all ${readFields.length} graph fields the client reads are emitted`,
  unresolved.map((f) => `G.${f} is read but never emitted`).join('\n      '),
);

// ────────────────────────────────────────────────────────────────── result

console.log('');
if (failures) {
  console.error(`FAIL — ${failures} of ${checks + failures} assertions failed\n`);
  console.error('If a schema changed, update _bower/viewer/lib/extract.cjs and the README\'s');
  console.error('Schema contract table — then adjust these fixtures to match the new shape.\n');
  process.exit(1);
}
console.log(`ok — ${checks} assertions\n`);
