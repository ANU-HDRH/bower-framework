#!/usr/bin/env node
'use strict';
// Acceptance test for scripts/build-adapters.cjs.
//
//   node tools/adapter-test/run.cjs
//
// Zero dependencies, runs on node or bun, exits non-zero on failure.
// scripts/release.sh runs it, so a release cannot be cut with the generator
// mis-emitting an adapter.
//
// WHAT THIS IS FOR. The generator is the only thing keeping four runtime
// variants on one canonical body. Two of its failure modes are silent:
//
//   1. A TOML escaping bug produces a file that either fails to parse (loud,
//      but only when Codex next reads it) or — worse — parses into a body that
//      is subtly not what the source said. `fixture/skills-src/agents/
//      t-writer.md` is deliberately hostile: triple-quote runs, trailing
//      backslashes, a line ending in a quote, unicode. The round-trip section
//      asserts unescape(escape(b)) === b over that plus every real source.
//
//   2. A lint that stops firing lets a broken source through to all four
//      outputs at once. Each lint therefore gets a case that must fail, and a
//      conformant control that must not — the negative assertion is the one
//      that catches a lint quietly regressing to a no-op.
//
// The golden fixture under fixture/ is a complete mini-root: skills-src/ plus
// the four generated trees, checked in. Regenerate it deliberately, with
// `node scripts/build-adapters.cjs --root tools/adapter-test/fixture`, only
// when the emission genuinely changed.

const fs = require('fs');
const os = require('os');
const path = require('path');

const B = require('../../scripts/build-adapters.cjs');

const REPO = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'fixture');

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
function section(title) {
  console.log(`\n${title}`);
}

function copyTree(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function withTempRoot(seed, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bower-adapter-test-'));
  try {
    if (typeof seed === 'string') copyTree(seed, dir);
    else
      for (const [rel, content] of Object.entries(seed)) {
        const full = path.join(dir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content);
      }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// runCheck reports to the console; during the test its chatter is noise.
function quietly(fn) {
  const log = console.log;
  const error = console.error;
  const lines = [];
  console.log = console.error = (...a) => lines.push(a.join(' '));
  try {
    return { result: fn(), output: lines.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
  }
}

// ---------------------------------------------------------------- 1. goldens

section('Golden fixture — generator output matches the checked-in tree');

let fixtureFiles;
try {
  fixtureFiles = B.buildAll(FIXTURE);
} catch (err) {
  fail('fixture sources lint clean', (err.problems || [err.message]).join('; '));
  fixtureFiles = new Map();
}

const EXPECTED_OUTPUTS = [
  '.agents/skills/t-args/SKILL.md',
  '.agents/skills/t-plain/SKILL.md',
  '.claude/agents/t-reader.md',
  '.claude/agents/t-writer.md',
  '.claude/commands/t-args.md',
  '.claude/commands/t-plain.md',
  '.codex/agents/t-reader.toml',
  '.codex/agents/t-writer.toml',
];

assert(
  JSON.stringify([...fixtureFiles.keys()]) === JSON.stringify(EXPECTED_OUTPUTS),
  'two commands and two agents produce exactly the eight expected outputs',
  `got: ${[...fixtureFiles.keys()].join(', ')}`
);

for (const [rel, content] of fixtureFiles) {
  const full = path.join(FIXTURE, rel);
  const onDisk = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
  assert(
    onDisk === content,
    `byte-identical: ${rel}`,
    onDisk === null ? 'file is missing from the fixture' : 'regenerate the fixture if this change is intended'
  );
}

section('Golden fixture — the transformations that differ per runtime');

const claudeArgs = fixtureFiles.get('.claude/commands/t-args.md') || '';
const skillArgs = fixtureFiles.get('.agents/skills/t-args/SKILL.md') || '';
const claudePlain = fixtureFiles.get('.claude/commands/t-plain.md') || '';
const skillPlain = fixtureFiles.get('.agents/skills/t-plain/SKILL.md') || '';

assert(claudeArgs.includes(B.ARG_BINDING.claude('the target thing')), 'Claude command binds the marker to the slash-command argument');
assert(skillArgs.includes(B.ARG_BINDING.skill('the target thing')), 'SKILL.md binds the marker to the invoking message');
assert(claudeArgs.includes('argument-hint: the target thing'), 'Claude command carries argument-hint when arguments are declared');
assert(!claudePlain.includes('argument-hint'), 'Claude command omits argument-hint when no arguments are declared');
assert(!claudeArgs.includes(B.ARG_MARKER) && !skillArgs.includes(B.ARG_MARKER), 'no marker survives into either generated command');
assert(!skillArgs.includes('argument-hint') && !skillPlain.includes('argument-hint'), 'SKILL.md never carries Claude frontmatter extensions');
assert(/^---\nname: t-plain\ndescription: [^\n]+\n---\n/.test(skillPlain), 'SKILL.md frontmatter is name + description only, in that order');

const readerToml = fixtureFiles.get('.codex/agents/t-reader.toml') || '';
const writerToml = fixtureFiles.get('.codex/agents/t-writer.toml') || '';
const readerMd = fixtureFiles.get('.claude/agents/t-reader.md') || '';
const writerMd = fixtureFiles.get('.claude/agents/t-writer.md') || '';

assert(readerMd.includes(`tools: ${B.ROLE_TOOLS['read-only']}`), 'read-only role maps to the read-only Claude tool list');
assert(writerMd.includes(`tools: ${B.ROLE_TOOLS['write-capable']}`), 'write-capable role adds Write and Edit to the Claude tool list');
assert(readerToml.includes(`sandbox_mode = "${B.ROLE_SANDBOX['read-only']}"`), 'read-only role maps to sandbox_mode read-only');
assert(writerToml.includes(`sandbox_mode = "${B.ROLE_SANDBOX['write-capable']}"`), 'write-capable role maps to sandbox_mode workspace-write');
assert(!readerMd.includes('role:') && !readerToml.includes('role ='), 'the role field itself is not emitted — only what it maps to');

for (const [rel, content] of fixtureFiles) {
  if (!content.includes(B.BANNER_MARK)) fail(`banner present: ${rel}`);
}
pass('every generated file carries the do-not-edit banner naming its source');

// ------------------------------------------------------------ 2. TOML escaping

section('TOML escaping — round-trip and structural safety');

const ADVERSARIAL = [
  '"""',
  '""""',
  '"""""""',
  'ends with a quote"',
  'trailing backslash\\',
  'double backslash\\\\',
  'crlf\r\nlines\r\nhere\r\n',
  'unicode é — 日本語 — 🌱 — ✓',
  '',
  '\n\n\n',
  'a "b" c "" d """ e',
  'C:\\path\\to\\"thing"',
  'tab\there and formfeed\f',
];

function roundTrip(label, body) {
  const expected = body.replace(/\r\n/g, '\n');
  const escaped = B.escapeTomlMultiline(body);
  let back;
  try {
    back = B.unescapeTomlMultiline(escaped);
  } catch (err) {
    return fail(`round-trip: ${label}`, `unescape threw: ${err.message}`);
  }
  if (back !== expected) return fail(`round-trip: ${label}`, `got ${JSON.stringify(back)}`);
  if (escaped.includes('"""'))
    return fail(`round-trip: ${label}`, 'escaped form still contains a literal-terminating triple quote');
  if (escaped.endsWith('"') && !escaped.endsWith('\\"'))
    return fail(`round-trip: ${label}`, 'escaped form ends in a bare quote, which would abut the closing delimiter');
  pass(`round-trip: ${label}`);
}

for (const s of ADVERSARIAL) roundTrip(JSON.stringify(s.length > 24 ? s.slice(0, 24) + '…' : s), s);

// Every real source body, not just the adversarial set — the fixture proves the
// escaper is correct, the real bodies prove it survives 12 KiB of actual prose.
for (const root of [REPO, FIXTURE]) {
  const { agents, commands, errors } = B.loadSources(root);
  if (errors.length) {
    fail(`sources load clean under ${path.relative(REPO, root) || '.'}`, errors.join('; '));
    continue;
  }
  for (const src of [...agents, ...commands]) roundTrip(src.rel, src.body);
}

assert(
  B.escapeTomlBasic('a\\b "q" \r\n\t') === 'a\\\\b \\"q\\" \\r\\n\\t',
  'basic-string escaper handles backslash, quote, and control characters'
);

// --------------------------------------------------------------- 3. the lints

section('Lints — each must fire, and a conformant pair must not');

const OK_CMD = '---\nname: ok-cmd\ndescription: A conformant fixture command.\n---\n\n# OK\n\nBody.\n';
const OK_AGENT =
  '---\nname: ok-agent\ndescription: A conformant fixture agent.\nrole: read-only\n---\n\n# OK\n\nBody.\n';

function lintErrors(overrides) {
  const files = {
    'skills-src/commands/ok-cmd.md': OK_CMD,
    'skills-src/agents/ok-agent.md': OK_AGENT,
    ...overrides,
  };
  return withTempRoot(files, (root) => B.loadSources(root).errors);
}

assert(lintErrors({}).length === 0, 'control — a conformant command and agent produce no lint errors', lintErrors({}).join('; '));

const LINT_CASES = [
  {
    label: 'name that does not match the filename stem',
    files: { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('name: ok-cmd', 'name: something-else') },
    expect: /must equal the filename stem/,
  },
  {
    label: 'missing description',
    files: { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('description: A conformant fixture command.\n', '') },
    expect: /missing or empty frontmatter "description"/,
  },
  {
    label: 'description continued onto a second line',
    files: {
      'skills-src/commands/ok-cmd.md': OK_CMD.replace(
        'description: A conformant fixture command.',
        'description: A conformant fixture command\n  wrapped onto a second line.'
      ),
    },
    expect: /not a single-line "key: value" pair/,
  },
  {
    label: 'description containing a colon-space',
    files: {
      'skills-src/commands/ok-cmd.md': OK_CMD.replace(
        'description: A conformant fixture command.',
        'description: Fixture command: does a thing.'
      ),
    },
    expect: /description contains/,
  },
  {
    label: 'arguments declared with no marker in the body',
    files: {
      'skills-src/commands/ok-cmd.md': OK_CMD.replace(
        'description: A conformant fixture command.',
        'description: A conformant fixture command.\narguments: the target thing'
      ),
    },
    expect: /has "arguments" but the body has no/,
  },
  {
    label: 'marker in the body with no arguments declared',
    files: { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('Body.', `${B.ARG_MARKER}\n\nBody.`) },
    expect: /the frontmatter has no "arguments"/,
  },
  {
    label: 'runtime-specific argument literal in a body',
    files: { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('Body.', 'Body with $' + 'ARGUMENTS in it.') },
    expect: /runtime-specific literal/,
  },
  {
    label: 'Claude-specific gate tool named in a body',
    files: { 'skills-src/agents/ok-agent.md': OK_AGENT.replace('Body.', 'Ask via Ask' + 'UserQuestion.') },
    expect: /runtime-specific literal/,
  },
  {
    label: 'unrecognised role',
    files: { 'skills-src/agents/ok-agent.md': OK_AGENT.replace('role: read-only', 'role: mostly-harmless') },
    expect: /role must be one of/,
  },
  {
    label: 'unknown frontmatter key',
    files: { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('name: ok-cmd', 'name: ok-cmd\nmodel: opus') },
    expect: /unknown frontmatter key/,
  },
  {
    label: 'source with no frontmatter at all',
    files: { 'skills-src/commands/ok-cmd.md': '# OK\n\nBody.\n' },
    expect: /no YAML frontmatter/,
  },
  {
    label: 'unclosed frontmatter',
    files: { 'skills-src/commands/ok-cmd.md': '---\nname: ok-cmd\ndescription: Unclosed.\n\n# OK\n' },
    expect: /not closed/,
  },
];

for (const c of LINT_CASES) {
  const errors = lintErrors(c.files);
  assert(
    errors.some((e) => c.expect.test(e)),
    `lint fires: ${c.label}`,
    errors.length ? `errors were: ${errors.join('; ')}` : 'no error was raised at all'
  );
}

assert(
  (() => {
    const files = { 'skills-src/commands/ok-cmd.md': OK_CMD.replace('name: ok-cmd', 'name: nope') };
    return withTempRoot(
      { 'skills-src/agents/ok-agent.md': OK_AGENT, ...files },
      (root) => {
        try {
          B.buildAll(root);
          return false;
        } catch (err) {
          return Array.isArray(err.problems);
        }
      }
    );
  })(),
  'a lint failure throws instead of emitting output — a broken source produces no adapters'
);

// ---------------------------------------------------------------- 4. --check

section('--check — fresh tree passes, tampering and orphans fail');

assert(
  withTempRoot(FIXTURE, (root) => quietly(() => B.runCheck(root)).result) === 0,
  'a freshly generated tree passes --check'
);

assert(
  withTempRoot(FIXTURE, (root) => {
    const target = path.join(root, '.claude/commands/t-args.md');
    const text = fs.readFileSync(target, 'utf8');
    fs.writeFileSync(target, text.replace('# Fixture With Arguments', '# Fixture with arguments'));
    const { result, output } = quietly(() => B.runCheck(root));
    return result === 1 && /stale:\s+\.claude\/commands\/t-args\.md/.test(output);
  }),
  'a one-character edit to a generated file fails --check and names the file'
);

assert(
  withTempRoot(FIXTURE, (root) => {
    fs.unlinkSync(path.join(root, '.codex/agents/t-writer.toml'));
    const { result, output } = quietly(() => B.runCheck(root));
    return result === 1 && /missing:\s+\.codex\/agents\/t-writer\.toml/.test(output);
  }),
  'a deleted generated file fails --check and names the file'
);

assert(
  withTempRoot(FIXTURE, (root) => {
    // A command that used to exist: its adapters linger, carrying the banner.
    fs.writeFileSync(
      path.join(root, '.claude/commands/t-retired.md'),
      `---\ndescription: Left behind.\n---\n<!-- ${B.BANNER_MARK}. Source: skills-src/commands/t-retired.md. -->\n\n# Gone\n`
    );
    const { result, output } = quietly(() => B.runCheck(root));
    return result === 1 && /orphan:\s+\.claude\/commands\/t-retired\.md/.test(output);
  }),
  'a generated file with no source is reported as an orphan'
);

assert(
  withTempRoot(FIXTURE, (root) => {
    // A hand-written file in an output directory carries no banner and is not ours.
    fs.mkdirSync(path.join(root, '.agents/skills/my-own-skill'), { recursive: true });
    fs.writeFileSync(path.join(root, '.agents/skills/my-own-skill/SKILL.md'), '---\nname: my-own-skill\ndescription: Mine.\n---\n\n# Mine\n');
    return quietly(() => B.runCheck(root)).result === 0;
  }),
  'a hand-written skill alongside the generated ones is left alone, not flagged'
);

section('--check — the repository itself is in sync');

assert(quietly(() => B.runCheck(REPO)).result === 0, 'the checked-in adapters match skills-src/', 'run: node scripts/build-adapters.cjs');

// ------------------------------------------------------------------ summary

console.log('');
if (failures) {
  console.error(`✗ ${failures} failed, ${checks} passed`);
  process.exit(1);
}
console.log(`✓ ${checks} checks passed`);
