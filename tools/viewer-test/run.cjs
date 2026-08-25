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
const M = require('../../_bower/viewer/lib/md.cjs');

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
  'next-move-on-complete',
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
  // module review state (v0.29)
  'review-section-missing',
  'review-open-no-plan',
  'review-plan-not-open',
  'review-stale',
  'review-routed-no-brief',
  // findings queue (v0.34), open-item surfacing (v0.36)
  'findings-queue-empty',
  'findings-queue-open',
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
  'transient-link',
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
//
// `findings-queue-open` is excluded, and it is the one exclusion this assertion
// permits. Every other check here reports drift, so firing on `clean` would mean
// the check is wrong. That one reports conformant state — `clean` carries a
// correctly-formed queue with an open item, which is the queue working — so it
// fires here by construction and its absence would be the failure. Do not add a
// second exclusion to make a red test green; see the header.
const cleanFindings = g.health.filter(
  (h) =>
    h.kind !== 'findings-queue-open' &&
    (/modules\/clean/.test(h.path || '') || /\bclean\//.test(h.message) || h.module === 'clean'),
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
  g.counts.modules === 6,
  'six modules (two documented, one ghost, one undeclared, one unparseable build order, one stale-reviewed)',
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

// v0.29 module review state. The marker and review-plan.md are two sides of one
// fact — /b-review writes them together — so a disagreement is mechanically
// detectable, which is the whole reason the redundancy exists.
const rvOf = (n) => (g.modules.find((m) => m.name === n) || {}).review;
assert(rvOf('clean').marker === '✓', 'a closed review is read from the marker', JSON.stringify(rvOf('clean')));
assert(rvOf('clean').date === '2026-07-20', 'the review date is extracted', rvOf('clean').date);
assert(rvOf('clean').featureCount === 2, 'the roster snapshot is extracted', `got ${rvOf('clean').featureCount}`);
assert(rvOf('boldorder') === null, 'a module with no ## Module review section reports null, not ⏸');
assert(rvOf('drifted').marker === '🚧', 'an open review is read from the marker', JSON.stringify(rvOf('drifted')));

// Review is orthogonal to completion: folding it into the rollup would silently
// make an optional command mandatory. `reviewstale` is ⏸ everywhere but ✓
// reviewed; `drifted` is mid-build with a review open. Neither marker moves the
// other, and this is the assertion that catches someone wiring them together.
const rs = g.modules.find((m) => m.name === 'reviewstale');
assert(rs.status === '⏸', 'a reviewed module still rolls up from its own features', `got ${rs.status}`);
assert(rs.review.marker === '✓', 'and keeps its review marker independently', `got ${rs.review.marker}`);

// Staleness is derived from the snapshot, never stored — so nothing has to
// remember to invalidate a review when the module grows.
const staleF = g.health.find((h) => h.kind === 'review-stale');
assert(staleF && staleF.module === 'reviewstale', 'staleness is derived for the grown module', staleF && staleF.module);
assert(staleF && /2 added since/.test(staleF.message) === false && /1 added since/.test(staleF.message),
  'it reports how many features the review never saw', staleF && staleF.message);
assert(
  g.health.filter((h) => h.kind === 'review-stale').length === 1,
  'a review whose snapshot matches its roster is not stale',
);
for (const [kind, want] of [
  ['review-open-no-plan', 'warn'],
  ['review-plan-not-open', 'warn'],
  ['review-stale', 'info'],
  ['review-section-missing', 'info'],
  ['review-routed-no-brief', 'info'],
])
  assert(sevOf(kind) === want, `${kind} is ${want}`, `got ${sevOf(kind)}`);

// The plan's checklist carries three dispositions: `[ ]` open holds the review
// open, `[x]` resolved and `[~]` won't-fix both discharge it. Won't-fix is an
// operator decision recorded here and deliberately left no other trace.
const bp = g.reviewPlans.find((p) => p.module === 'boldorder');
assert(bp && bp.total === 7, 'every finding in the plan is tracked, routed included', `got ${bp && bp.total}`);
assert(bp && bp.open === 4, 'only `[ ]` items hold the review open', `got ${bp && bp.open}`);
assert(bp && bp.wontFix === 1, "`[~]` is counted as won't-fix", `got ${bp && bp.wontFix}`);

// v0.31: the plan is readable, not just countable. A finding line splits into
// id, gist, class and pointer so the review page can show what was found and
// where — and a line that does not fit the shape survives as written, because
// the plan is operator prose first.
assert(bp && bp.route === '#/review/boldorder', 'the plan gets its own route', bp && bp.route);
assert(
  bp && g.docRoutes[bp.rel] === '#/review/boldorder',
  'and links to review-plan.md resolve there, not to the module',
  bp && g.docRoutes[bp.rel],
);
assert(bp && bp.diagnosed === '2026-07-28', 'the diagnosis date is read from the preamble', bp && bp.diagnosed);
assert(bp && bp.featureCount === 2, 'as is the roster snapshot', `got ${bp && bp.featureCount}`);
const f1 = bp && bp.items[0];
assert(f1 && f1.id === 'F1' && f1.class === 'inline-reconcile' && !f1.routed, 'an owned finding parses its class', JSON.stringify(f1));
assert(
  f1 && f1.pointerKind === 'path' && f1.pointerFile === 'docs/modules/boldorder/plan.md' && f1.pointerLine === 12,
  'a file pointer keeps its line number and stays openable',
  JSON.stringify(f1),
);
assert(f1 && f1.gist === 'plan.md stale on the parser entry point', 'the gist excludes id, class and pointer', f1 && f1.gist);
const f2 = bp && bp.items[1];
assert(f2 && f2.routed && /^won't fix/.test(f2.note) && !f2.pointer, "a won't-fix note is not mistaken for a pointer", JSON.stringify(f2));
const f3 = bp && bp.items[2];
assert(f3 && f3.routed && f3.pointerKind === 'command', 'a routed finding points at the command that discharges it', JSON.stringify(f3));
// v0.32: the finding reference is *inside* the command, so a pasted invocation
// carries the plan path and the ID with it — IDs are module-local, so the path
// is what identifies the finding. It must not split the line into two parts.
assert(
  f3 && /according to F3 in docs\/modules\/boldorder\/review-plan\.md$/.test(f3.pointer),
  'the command carries its own finding reference, path included',
  f3 && f3.pointer,
);
const f4 = bp && bp.items[4];
assert(
  f4 && f4.class === null && f4.gist === 'a finding written as free prose, with no class and no pointer',
  'an unparseable line keeps its text rather than being dropped',
  JSON.stringify(f4),
);

// v0.32: a routed finding is deferred into a fresh session, so it carries the
// reviewer's Location/Drift/Resolution verbatim. The sub-bullets are indented
// and checkbox-free — the counts above prove they are attached, not tracked, as
// a brief line mistaken for an item would inflate both total and open.
assert(
  f3 && f3.brief && f3.brief.location === 'src/boldorder/read.ts:48 vs src/boldorder/write.ts:61',
  'a routed finding attaches its brief',
  JSON.stringify(f3 && f3.brief),
);
assert(f3 && /404/.test(f3.brief.drift) && /Pick one/.test(f3.brief.resolution), 'all three brief fields are kept');
assert(f1 && f1.brief === null, 'an owned finding has no brief and is not given one', JSON.stringify(f1 && f1.brief));
// F5 is the gap the check exists for: routed, open, and briefless, so whichever
// command eventually discharges it starts from the gist alone.
const noBrief = g.health.filter((h) => h.kind === 'review-routed-no-brief');
assert(noBrief.length === 2, 'each incomplete open routed finding is reported once', `got ${noBrief.length}`);
// F14 has no brief at all; F5 has a Location and an empty Drift label. A partial
// brief is the worse case — it looks like a handoff and is not one — so the
// check requires all three fields, not the presence of the block.
const f14msg = noBrief.find((h) => /F14/.test(h.message));
assert(f14msg && /carries no Location\/Drift\/Resolution brief/.test(f14msg.message), 'a wholly absent brief is named as such', f14msg && f14msg.message);
const f5msg = noBrief.find((h) => /F5/.test(h.message));
assert(f5msg && /missing `drift` and `resolution`/.test(f5msg.message), 'a partial brief names the fields it lacks', f5msg && f5msg.message);
// F13 is routed and ticked: the finding is discharged, so its brief is moot.
assert(!noBrief.some((h) => /F13/.test(h.message)), 'a disposed routed finding is not chased for a brief');
// An empty label is not a field: `- Drift:` with nothing after it must not read
// as a populated brief anywhere downstream.
const f5 = bp && bp.items.find((i) => i.id === 'F5');
assert(f5 && f5.brief && !f5.brief.drift, 'an empty label does not become a field', JSON.stringify(f5 && f5.brief));

// The review page is the plan's only rendering — links to review-plan.md
// resolve here, not to a raw file view — so free prose under a finding (a
// re-opened note, a caveat) is carried, not dropped. It is prose, not a brief:
// F14's annotation coexists with its review-routed-no-brief finding above, and
// the counts above prove it is attached, not tracked.
const f14 = bp && bp.items.find((i) => i.id === 'F14');
assert(
  f14 && f14.annotations && /Re-opened 2026-07-30/.test(f14.annotations[0]),
  'free prose under a finding is kept as an annotation',
  JSON.stringify(f14 && f14.annotations),
);
assert(f3 && f3.annotations === null, 'a finding with no prose carries none', JSON.stringify(f3 && f3.annotations));
// Same rule one level up: a section the schema doesn't name rides along whole.
assert(
  bp && bp.sections.length === 1 && bp.sections[0].title === 'Constitution',
  'a non-schema section is extracted, not dropped',
  JSON.stringify(bp && bp.sections),
);

// v0.34: the discharging command ticks its own routed finding and appends a
// completion note. The note is provenance for the closeout audit, not part of
// the pointer — and the pointer is a command meant to be copied and run
// verbatim, so a note left glued to it would make the page's copy wrong.
const f13 = bp && bp.items.find((i) => i.id === 'F13');
assert(
  f13 && f13.completion === 'done 2026-07-29 via /b-feature already-landed',
  'a completion note is split off the finding line',
  JSON.stringify(f13 && f13.completion),
);
assert(
  f13 && f13.pointer === 'Run /b-feature modify boldorder already-landed according to F13 in docs/modules/boldorder/review-plan.md',
  'and the pointer stays a runnable command',
  JSON.stringify(f13 && f13.pointer),
);
assert(f3 && f3.completion === null, 'an unticked finding carries none', JSON.stringify(f3 && f3.completion));

// v0.34: a findings queue is a loose .md at a module root. The old walker
// registered a route for exactly four names, so a file that existed and was
// correctly linked still rendered dead — with the drift report agreeing it was
// fine, because broken-link tests existence and the renderer tests routability.
// The sweep is now general, so the next invented artifact resolves too.
assert(
  g.docRoutes['docs/modules/clean/findings.md'] === `#/doc/${encodeURIComponent('modules/clean/findings')}`,
  'a loose .md at a module root gets a route',
  g.docRoutes['docs/modules/clean/findings.md'],
);
const fq = g.docs.find((d) => d.rel === 'docs/modules/clean/findings.md');
assert(fq && fq.renderable && /Findings queue/.test(fq.title), 'and is rendered from its own H1', JSON.stringify(fq && fq.title));
assert(fq && fq.origin === 'bower', 'findings.md is a Bower artifact, not project material', fq && fq.origin);
assert(fq && fq.ownership === 'agent-owned (transient)', 'and is transient, like the review plan', fq && fq.ownership);

// Nothing pairs with the queue, so there is one mechanical fact worth
// reporting: whoever disposed of the last item was supposed to delete the file.
// `clean` has an open item and is silent; `drifted`'s queue is drained.
const fqEmpty = g.health.filter((h) => h.kind === 'findings-queue-empty');
assert(fqEmpty.length === 1 && fqEmpty[0].module === 'drifted', 'a drained queue left on disk is reported', JSON.stringify(fqEmpty.map((h) => h.module)));
assert(sevOf('findings-queue-empty') === 'warn', 'findings-queue-empty is warn', `got ${sevOf('findings-queue-empty')}`);

// v0.36. Through v0.35 the queue reached no surface but full-text search — the
// rail groups Bower docs by a fixed list and project docs by `origin`, and the
// queue is in neither — so recorded remedial work was invisible unless you knew
// it was there. Three surfaces now carry it: the module object (rail badge and
// module-page strap), and one health finding per open item.
const cleanQ = g.modules.find((m) => m.name === 'clean').findings;
assert(cleanQ && cleanQ.total === 3 && cleanQ.open === 1, 'the queue is parsed, disposed items included', JSON.stringify(cleanQ && { total: cleanQ.total, open: cleanQ.open }));
assert(cleanQ && cleanQ.items[0].id === 'Q1' && cleanQ.items[1].id === 'Q2', 'Q-space IDs parse — the plan parser only knew F', JSON.stringify(cleanQ && cleanQ.items.map((i) => i.id)));
// v0.38: a queue ID is a name, `Q-<slug>`; legacy `Q<n>` items keep theirs. Both parse.
assert(cleanQ && cleanQ.items[2].id === 'Q-shared-loader-helper' && cleanQ.items[2].routed && cleanQ.items[2].completion, 'a Q-<slug> ID parses, with its class, pointer and completion intact', JSON.stringify(cleanQ && cleanQ.items[2]));
assert(cleanQ && cleanQ.items[1].completion === 'done 2026-07-24 via /b-feature consolidate-fixture-loader', 'a discharged item keeps its completion note out of the pointer', JSON.stringify(cleanQ && cleanQ.items[1].completion));
assert(cleanQ && !!(cleanQ.items[0].brief || {}).resolution, 'the three-line brief is attached, not counted as items', JSON.stringify(cleanQ && cleanQ.items[0].brief));
assert(cleanQ && cleanQ.route === g.docRoutes['docs/modules/clean/findings.md'], 'the module carries the queue route, so the rail and module page have somewhere to point', JSON.stringify(cleanQ && cleanQ.route));
// The extractor → client contract below checks top-level and per-item fields;
// nothing covers reads off a module, because `m` is also every regex match in
// app.js and the sweep would be all false positives. So the three keys the rail
// badge and the module-page strap reach for are asserted by name here.
assert(cleanQ && ['open', 'route', 'rel'].every((k) => k in cleanQ), 'the queue emits the keys the rail badge and module strap read', JSON.stringify(Object.keys(cleanQ || {})));
// A drained queue reports `findings-queue-empty` and nothing else — the two
// checks are mutually exclusive by construction.
assert(g.modules.find((m) => m.name === 'drifted').findings.open === 0, 'a drained queue has no open items', 'drifted');
const fqOpen = g.health.filter((h) => h.kind === 'findings-queue-open');
assert(fqOpen.length === 1 && fqOpen[0].module === 'clean' && fqOpen[0].id === 'Q1', 'one finding per open item, carrying its ID', JSON.stringify(fqOpen.map((h) => `${h.module}/${h.id}`)));
assert(/according to Q1 in/.test(fqOpen[0].message), 'and the runnable pointer, which is what an operator acts on', fqOpen[0].message);
// Severity is the whole argument for this check being on the health page at
// all: an open queue is conformant, so it must not read as drift.
assert(sevOf('findings-queue-open') === 'info', 'findings-queue-open is info — it is owed work, not a contradiction', `got ${sevOf('findings-queue-open')}`);

// Nothing may link a transient file (framework.md → Working Conventions): it is
// deleted when its work is done, so the link breaks on a schedule and disposal
// cannot clean it up. Observed on a real project as a dead ADR link, written
// four days before the rule existed and unrepairable ever after.
const tl = g.health.filter((h) => h.kind === 'transient-link');
assert(tl.length === 1 && tl[0].path === 'docs/adr/0002-module-decision.md', 'a link to a transient file is reported at the linking document', JSON.stringify(tl.map((h) => h.path)));
assert(/immutable/.test(tl[0].message), 'and an immutable ADR body is named as unrepairable, not as something to go and fix', tl[0].message);
// One cause, one finding. The link resolves today, so broken-link is silent
// anyway; when the queue drains it must stay silent rather than send a reader
// to repair a link that should never have been written.
{
  const fs = require('fs');
  const drained = path.join(FIXTURES, 'fixture/docs/modules/drifted/findings.md');
  const kept = fs.readFileSync(drained, 'utf8');
  try {
    fs.rmSync(drained);
    const gone = extract(path.join(FIXTURES, 'fixture')).health;
    const stillOne = gone.filter((h) => h.kind === 'transient-link');
    assert(stillOne.length === 1 && /already has/.test(stillOne[0].message), 'once the target is deleted the same check reports it, now as broken', stillOne.map((h) => h.message).join(' | '));
    assert(!gone.some((h) => h.kind === 'broken-link' && /findings\.md/.test(h.message)), 'and broken-link does not double-report it', gone.filter((h) => h.kind === 'broken-link').map((h) => h.message).join(' | '));
  } finally {
    fs.writeFileSync(drained, kept);
  }
}

// The check is version-gated: on a pre-v0.32 project every routed finding is
// briefless by construction, which is history, not drift. The gate is the one
// behaviour the fixture above (on the current version) cannot exercise, so the
// same fixture is re-run with only its VERSION rewritten to 0.31.
{
  const fs = require('fs');
  const os = require('os');
  const pre = fs.mkdtempSync(path.join(os.tmpdir(), 'bower-viewer-pre032-'));
  try {
    fs.cpSync(path.join(FIXTURES, 'fixture'), pre, { recursive: true });
    fs.writeFileSync(path.join(pre, '_bower/VERSION'), '0.31\n');
    const gPre = extract(pre);
    const bpPre = gPre.reviewPlans.find((p) => p.module === 'boldorder');
    assert(bpPre && bpPre.total === 7, 'the pre-v0.32 copy still parses the plan', `got ${bpPre && bpPre.total}`);
    assert(
      !gPre.health.some((h) => h.kind === 'review-routed-no-brief'),
      'review-routed-no-brief stands down on a pre-v0.32 project',
      gPre.health.filter((h) => h.kind === 'review-routed-no-brief').map((h) => h.message).join('\n      '),
    );
    assert(
      gPre.health.some((h) => h.kind === 'schema-version-skew'),
      'the version skew itself is still reported',
    );
  } finally {
    fs.rmSync(pre, { recursive: true, force: true });
  }
}
assert(bp && bp.observations.length === 1, 'observations ride along with the plan', `got ${bp && bp.observations.length}`);

// Exercise the actual review renderer, not just the graph it consumes. This
// tiny DOM is deliberately only the interface app.js's `el()` helper needs;
// keeping it here preserves the viewer's zero-dependency acceptance test.
class TestNode {
  constructor(tag, text = '') {
    this.nodeType = tag === '#text' ? 3 : 1;
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this._text = text;
    this.className = '';
    this.innerHTML = '';
  }
  setAttribute(name, value) {
    this.attrs[name] = String(value);
  }
  addEventListener() {}
  append(...nodes) {
    this.children.push(...nodes);
  }
  get textContent() {
    return this.nodeType === 3
      ? this._text
      : this.children.map((child) => child.textContent).join('');
  }
  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
}
const priorDocument = global.document;
global.document = {
  createElement: (tag) => new TestNode(tag),
  createTextNode: (value) => new TestNode('#text', String(value)),
};
const reviewApp = require('../../_bower/viewer/web/app.js');
reviewApp.setGraphForTest(g);
const renderedReview = reviewApp.viewReview('boldorder');
const descendants = (node) => [node, ...node.children.flatMap(descendants)];
const renderedNodes = descendants(renderedReview);
const renderedText = renderedReview.textContent;
assert(renderedText.includes('Review · boldorder'), 'the review page renders its module heading');
assert(renderedText.includes('3 of 7 disposed'), 'the review page renders disposition progress');
assert(renderedText.includes('ADR-0002'), 'the review page renders observations');
assert(
  renderedNodes.some((node) => node.tagName === 'a' && node.attrs.href === '/open?path=docs%2Fmodules%2Fboldorder%2Fplan.md&line=12'),
  'a finding link opens its exact file line',
);
assert(
  renderedNodes.some((node) => node.tagName === 'code' && node.textContent.includes('/b-feature modify boldorder owner-response')),
  'the review page renders routed commands literally',
);
assert(
  renderedNodes.some((node) => node.className === 'strap' && node.textContent.includes('Marker disagrees with the plan')),
  'the review page exposes marker/plan disagreement',
);
// The brief is shown in full, not folded away: a reader on this page is deciding
// whether to act on the finding, which is the question the brief answers.
const hasClass = (node, c) => String(node.className || '').split(' ').includes(c);
const briefRow = renderedNodes.find((node) => hasClass(node, 'brief'));
assert(briefRow && briefRow.textContent.includes('src/boldorder/read.ts:48'), 'the review page renders the routed brief', briefRow && briefRow.textContent);
assert(briefRow && /Location:.*Drift:.*Resolution:/s.test(briefRow.textContent), 'with all three fields labelled');
const briefRows = renderedNodes.filter((node) => hasClass(node, 'brief'));
assert(briefRows.length === 2, 'and only for the findings that have one', `got ${briefRows.length}`);
// F5's brief is Location-only. It renders what it has rather than an empty
// `Drift:` label — the health check is what reports the gap.
const partial = briefRows.find((n) => n.textContent.includes('parse.ts:19'));
assert(partial && !/Drift:/.test(partial.textContent), 'a partial brief renders only its populated fields', partial && partial.textContent);
// Nothing in the file is invisible on the page: operator prose under a finding
// and sections beyond Findings/Observations both render.
const annRow = renderedNodes.find((node) => hasClass(node, 'ann'));
assert(annRow && /Re-opened 2026-07-30/.test(annRow.textContent), 'the review page renders finding annotations', annRow && annRow.textContent);
assert(
  renderedText.includes('Constitution') && renderedText.includes('consented to'),
  'the review page renders non-schema sections',
);
global.document = priorDocument;

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
assert(g.counts.adrsNarrowed === 4, 'narrowed ADRs are counted', `got ${g.counts.adrsNarrowed}`);

// v0.38 slug IDs — a v0.38 `<slug>.md` and a pre-v0.38 `NNNN-*.md` are both ADRs,
// identity comes from frontmatter, and the key (route token) is the slug for one
// and the four digits for the other. Both shapes coexist forever.
const slugAdr = adr('ADR-typed-boundaries');
assert(slugAdr && slugAdr.key === 'typed-boundaries', 'a slug ADR is read and keyed by its slug', JSON.stringify(slugAdr && slugAdr.key));
assert(adr('ADR-0022') && adr('ADR-0022').key === '0022', 'a legacy ADR is keyed by its four digits');
assert(slugAdr && slugAdr.supersedes.includes('ADR-0022') && adr('ADR-0022').supersededBy.includes('ADR-typed-boundaries'), 'a supersession chain crosses the ID boundary');
assert(adr('ADR-binary-attachments') && adr('ADR-binary-attachments').narrows.includes('ADR-typed-boundaries') && slugAdr.narrowedBy.includes('ADR-binary-attachments') && slugAdr.status === 'accepted', 'a slug ADR narrows a slug ADR, symmetric, target still accepted');
assert(
  g.adrs.every((a, i) => i === 0 || ((g.adrs[i - 1].date || '') < (a.date || '') || ((g.adrs[i - 1].date || '') === (a.date || '') && g.adrs[i - 1].key <= a.key))),
  'ADRs sort by date, then key',
);
assert(
  M.adrRefs('see ADR-0014, [ADR-host-credentials](/docs/adr/host-credentials.md), adr/0009-old-thing.md and ADR-a1-b2.').sort().join() ===
    ['ADR-0009', 'ADR-0014', 'ADR-a1-b2', 'ADR-host-credentials'].sort().join(),
  'adrRefs reads both ID shapes and both link forms',
  JSON.stringify(M.adrRefs('see ADR-0014, [ADR-host-credentials](/docs/adr/host-credentials.md), adr/0009-old-thing.md and ADR-a1-b2.')),
);
assert(!M.adrRefs('[the index](/docs/adr/index.md)').length, 'a link to the ADR index is not an ADR reference');

// v0.23 constitution: aspirations must be separable from rules.
assert(g.constitution.items.length === 1, 'the Not-yet-in-force section is extracted', JSON.stringify(g.constitution));

// framework-reference.md status.md spec.
const pending = g.features.filter((f) => f.pendingVerification);
assert(pending.length === 1, 'one feature has pending verification', `got ${pending.length}`);

// v0.30 next-move scoping. Both spellings must be read, and a decorated
// `(none — …)` must not be mistaken for live work: on a real project the bold
// form leaked its closing `**` into the value, which turned a properly closed
// next move into a spurious finding.
const featOf = (mod, name) => g.features.find((f) => f.module === mod && f.name === name);
assert(
  (featOf('clean', 'feature-a').adrs || []).includes('ADR-typed-boundaries') && (featOf('clean', 'feature-a').adrs || []).includes('ADR-0002'),
  'a plan citing a slug ADR and a legacy ADR resolves both',
  JSON.stringify(featOf('clean', 'feature-a').adrs),
);
const stale = featOf('drifted', 'stale-pointer');
assert(
  stale.status.nextMove === '`Run /b-feature ghost-feature`',
  'an inline **Next move:** line is read, emphasis stripped',
  `got ${JSON.stringify(stale && stale.status.nextMove)}`,
);
const closed = featOf('drifted', 'done-but-pending');
assert(closed.status.nextMove === null, 'a closed next move is not outstanding work', `got ${JSON.stringify(closed.status.nextMove)}`);
assert(
  M.labelled('**Next move:** (none — complete)', 'Next move') === '(none — complete)',
  'a bold label does not leak its closing emphasis into the value',
  `got ${JSON.stringify(M.labelled('**Next move:** (none — complete)', 'Next move'))}`,
);
assert(
  M.labelled('Notes: *none yet*', 'Notes') === '*none yet*',
  'a value that legitimately opens with emphasis keeps it',
  `got ${JSON.stringify(M.labelled('Notes: *none yet*', 'Notes'))}`,
);
assert(
  M.labelled('prose about the `Next move:` convention\n**Next move:** real', 'Next move', { anchored: true }) === 'real',
  'an anchored label ignores a mid-sentence mention of itself',
  `got ${JSON.stringify(M.labelled('prose about the `Next move:` convention\n**Next move:** real', 'Next move', { anchored: true }))}`,
);
assert(
  !g.nextMoves.some((n) => n.marker === '✓'),
  'the outstanding-next-moves list excludes ✓ features',
  JSON.stringify(g.nextMoves.filter((n) => n.marker === '✓')),
);
assert(
  !g.ladder.some((l) => l.command.startsWith('/b-review')),
  'the derived ladder does not nag about optional review',
  JSON.stringify(g.ladder),
);

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

// ──────────────────────────── md.cjs: which marker a line asserts

// Markers are read out of prose that routinely *names* markers other than the
// one it asserts, and getting it wrong is invisible: the extractor reports a
// disagreement between two documents that in fact agree. A fixture cannot cover
// this cheaply — the failing shapes are one line each, and adding a sixth
// feature to a module to carry one perturbs its roster, review snapshot and
// rollup — so the two helpers are exercised directly.
//
// Both were originally written as `for (const mk of MARKERS) if (…)`, which
// returns whichever glyph is *declared* first rather than the one that appears
// first. MARKERS lists ✓ first, so every reopened feature ("🚧 … complete and
// previously ✓") read as ✓ and drew a false error-level marker-disagreement on
// a real project.
console.log('\nmd.cjs — the marker a line asserts, not the ones it mentions');
const REOPENED = '# evaluation-view-ui — 🚧\n\nComplete and previously ✓; reopened by a rendering fix.\n';
assert(M.leadingMarker(REOPENED) === '🚧', 'a reopened feature asserts the heading marker, not the ✓ its prose recalls', M.leadingMarker(REOPENED));
assert(M.leadingMarker('# feature-a — ✓\n\nAll criteria met.\n') === '✓', 'the ordinary heading form still reads');
assert(M.leadingMarker('# no-marker — status\n\nProse with no glyph.\n') === null, 'a markerless status doc still returns null');
// The heading wins outright where it carries a marker; a body line opening with
// one is the fallback that reads a hand-written status.md, and it must survive.
assert(M.leadingMarker('# hand-written — status\n\n🚧 mid-build.\n') === '🚧', 'a marker opening a body line still reads when the heading has none');
// The separator is what makes a marker an assertion; anything past it is
// annotation. Checked on the shapes the extractor actually feeds this.
assert(M.trailingMarker('5. evaluation-view-ui — 🚧 (complete and previously ✓, reopened)') === '🚧', 'a build-order entry asserts the marker after its dash', M.trailingMarker('5. evaluation-view-ui — 🚧 (complete and previously ✓, reopened)'));
assert(M.trailingMarker('🚧 (complete and previously ✓, reopened)') === '🚧', 'and the same entry with the dash already consumed', M.trailingMarker('🚧 (complete and previously ✓, reopened)'));
assert(M.trailingMarker('Review: ✓ 2026-08-04 (13 of 13 features)') === '✓', 'a Review: line carries no dash and still reads');
assert(M.trailingMarker('`x/integration.test.ts` — ✓ (2026-08-11)') === '✓', 'an integration Test: line reads past the backticked path');
assert(M.trailingMarker('') === null && M.trailingMarker(null) === null, 'an empty or absent line is null, never a marker');

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
// Top-level fields are not the whole contract. The review page and the adoption
// page both render a list of `it`, reaching into per-item fields that no
// top-level check covers — so renaming one in extract.cjs blanks a cell in
// silence, which is how `completion` (v0.34) would fail. Both item shapes are
// fixed key sets, so the union of them is checkable the same way.
const itemFields = [...new Set([...appSrc.matchAll(/\bit\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))];
const itemKeys = new Set([
  ...Object.keys((g.reviewPlans.find((p) => p.module === 'boldorder') || { items: [{}] }).items[0]),
  ...Object.keys(extract(path.join(FIXTURES, 'fixture-adoption')).adoption.openItems[0]),
]);
const unresolvedItem = itemFields.filter((f) => !itemKeys.has(f)).sort();
assert(
  unresolvedItem.length === 0,
  `all ${itemFields.length} per-item fields the client reads are emitted`,
  unresolvedItem.join(', '),
);

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
