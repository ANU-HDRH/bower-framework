#!/usr/bin/env node
'use strict';
// Bower adapter generator — skills-src/ → the four checked-in runtime variants.
//
//   node scripts/build-adapters.cjs            regenerate in place
//   node scripts/build-adapters.cjs --check    verify the tree is in sync (exit 1 on drift)
//   node scripts/build-adapters.cjs --root DIR operate on another root (fixtures)
//
// Zero dependencies, runs on node or bun, exits non-zero on failure.
// scripts/release.sh runs --check, so a release cannot ship desynchronised adapters.
//
// WHAT THIS IS FOR. One canonical body per command and per agent lives in
// skills-src/; each runtime wants it in a different wrapper. Claude Code reads
// .claude/commands/ and .claude/agents/; Codex reads .agents/skills/<n>/SKILL.md
// and .codex/agents/<n>.toml. Generating the wrappers is what keeps the two
// runtimes on one contract instead of two prose copies that drift.
//
// The transformations here are deliberately MECHANICAL — wrap in frontmatter,
// escape TOML, substitute the argument idiom. Nothing rewrites prose. If a
// runtime needs different wording, that is a source edit, not a generator
// branch, because branching prose is exactly how the variants drift.
//
// The generated files are checked in, not produced at scaffold time: scaffold
// stays a dumb copier, and every adapter change is reviewable as a diff.

const fs = require('fs');
const path = require('path');

const BANNER_MARK = 'GENERATED FILE — do not edit';
const REGEN_CMD = 'node scripts/build-adapters.cjs';

// Runtime couplings that must never appear in a canonical body. The whole point
// of skills-src/ is that the body is runtime-neutral; the binding lives in
// _bower/framework.md's Runtime bindings section and in this generator.
const DENY_LIST = ['$ARGUMENTS', 'AskUserQuestion'];

// Named runtime tools are the same coupling as the literals above, but they are
// easy to write by accident because the sentence reads naturally ("read that
// range with the Read tool's offset and limit") and the generated Codex skill
// then instructs Codex to use a tool it does not have. Matched as patterns
// rather than literals because the bare word is legitimate prose — "read the
// plan" must pass, "the Read tool" must not.
const DENY_PATTERNS = [
  {
    re: /\b(Read|Write|Edit|MultiEdit|Bash|Glob|Grep|Task|Agent|NotebookEdit|WebFetch|WebSearch|TodoWrite)\s+tool\b/,
    why: 'names a runtime tool — say what must happen, and let _bower/framework.md bind it',
  },
  {
    re: /\bsubagent_type\b|\ballowed-tools\b|\bargument-hint\b/,
    why: 'names a Claude Code adapter field — those are the generator\'s business, not a body\'s',
  },
];

const ARG_MARKER = '<!-- bower:arguments -->';

// Where the argument idiom binds, per runtime.
const ARG_BINDING = {
  claude: (label) => `The request (${label}): $ARGUMENTS`,
  skill: (label) =>
    `The request (${label}): the request as given in the message that invoked this skill.`,
};

const ROLE_TOOLS = {
  'read-only': 'Read, Glob, Grep, Bash',
  'write-capable': 'Read, Glob, Grep, Bash, Write, Edit',
};

// A default, not a boundary — the parent session's mode can be coarser. The
// role instruction in the body is what actually holds a read-only agent.
const ROLE_SANDBOX = {
  'read-only': 'read-only',
  'write-capable': 'workspace-write',
};

const COMMAND_KEYS = ['name', 'description', 'arguments'];
const AGENT_KEYS = ['name', 'description', 'role'];

// ---------------------------------------------------------------- frontmatter

// Deliberately strict: `key: value` on one line, nothing else. A source file
// that needs YAML we cannot parse is a source file whose adapters we cannot
// generate faithfully, so it should fail loudly rather than half-parse.
function parseFrontmatter(text, errors, where) {
  const norm = text.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) {
    errors.push(`${where}: no YAML frontmatter (file must start with "---")`);
    return null;
  }
  const end = norm.indexOf('\n---\n', 3);
  if (end === -1) {
    errors.push(`${where}: frontmatter is not closed by a "---" line`);
    return null;
  }
  const fields = {};
  for (const line of norm.slice(4, end + 1).split('\n')) {
    if (line === '') continue;
    const m = line.match(/^([a-z][a-z-]*): (.*)$/);
    if (!m) {
      errors.push(
        `${where}: frontmatter line is not a single-line "key: value" pair — ${JSON.stringify(line)}`
      );
      continue;
    }
    if (m[1] in fields) errors.push(`${where}: duplicate frontmatter key "${m[1]}"`);
    fields[m[1]] = m[2].trim();
  }
  const body = norm.slice(end + 5).replace(/^\n+/, '').replace(/\s+$/, '') + '\n';
  return { fields, body };
}

function checkCommonFields(fields, stem, allowed, errors, where) {
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) errors.push(`${where}: unknown frontmatter key "${key}"`);
  }
  if (fields.name === undefined) errors.push(`${where}: missing frontmatter "name"`);
  else if (fields.name !== stem)
    errors.push(`${where}: name "${fields.name}" must equal the filename stem "${stem}"`);
  if (!fields.description) errors.push(`${where}: missing or empty frontmatter "description"`);
  else if (fields.description.includes(': '))
    errors.push(
      `${where}: description contains ": " — invalid as an unquoted YAML scalar; rephrase with an em dash`
    );
}

function checkBody(body, errors, where) {
  for (const banned of DENY_LIST) {
    if (body.includes(banned))
      errors.push(
        `${where}: body contains the runtime-specific literal "${banned}" — canonical bodies are runtime-neutral`
      );
  }
  for (const { re, why } of DENY_PATTERNS) {
    const hit = body.match(re);
    if (hit)
      errors.push(
        `${where}: body contains the runtime-specific literal "${hit[0]}" — ${why}`
      );
  }
}

// ------------------------------------------------------------------- TOML

// Control characters TOML forbids raw inside a basic string. Built via RegExp
// from a string literal so this source file stays plain ASCII.
const CONTROL_RE = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]', 'g');

function escapeTomlBasic(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(CONTROL_RE, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

// Same set minus tab and newline, which a multi-line basic string may carry raw.
const MULTILINE_CONTROL_RE = new RegExp('[\\u0000-\\u0008\\u000b-\\u001f\\u007f]', 'g');

function endsWithUnescapedQuote(s) {
  if (!s.endsWith('"')) return false;
  let backslashes = 0;
  for (let i = s.length - 2; i >= 0 && s[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 0;
}

// Body → the inside of a TOML multi-line basic string. Backslashes double;
// any run of three or more quotes would close the literal early, so every
// quote in such a run is escaped; a trailing *unescaped* quote would abut the
// closing delimiter, so it is escaped too. Everything else — newlines, tabs,
// unicode — passes through, which is what keeps the TOML diff readable.
function escapeTomlMultiline(s) {
  let out = s.replace(/\r\n/g, '\n').replace(/\\/g, '\\\\');
  out = out.replace(MULTILINE_CONTROL_RE, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
  out = out.replace(/"{3,}/g, (run) => '\\"'.repeat(run.length));
  if (endsWithUnescapedQuote(out)) out = out.slice(0, -1) + '\\"';
  return out;
}

// The exact inverse, so the acceptance test can assert a round-trip rather
// than eyeballing the escaper.
function unescapeTomlMultiline(s) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '\\') {
      out += s[i];
      continue;
    }
    const n = s[++i];
    if (n === undefined) throw new Error('trailing backslash in TOML string');
    switch (n) {
      case 'b': out += '\b'; break;
      case 't': out += '\t'; break;
      case 'n': out += '\n'; break;
      case 'f': out += '\f'; break;
      case 'r': out += '\r'; break;
      case '"': out += '"'; break;
      case '\\': out += '\\'; break;
      case 'u':
        out += String.fromCharCode(parseInt(s.slice(i + 1, i + 5), 16));
        i += 4;
        break;
      case 'U':
        out += String.fromCodePoint(parseInt(s.slice(i + 1, i + 9), 16));
        i += 8;
        break;
      default:
        if (/\s/.test(n)) {
          // Line-ending backslash: swallows the newline and the whitespace after it.
          while (i < s.length && /\s/.test(s[i])) i++;
          i--;
          break;
        }
        throw new Error(`invalid TOML escape \\${n}`);
    }
  }
  return out;
}

// ------------------------------------------------------------------ banners

function mdBanner(sourceRel) {
  return `<!-- ${BANNER_MARK}. Source: ${sourceRel}. Regenerate: ${REGEN_CMD} -->`;
}
function tomlBanner(sourceRel) {
  return `# ${BANNER_MARK}. Source: ${sourceRel}\n# Regenerate: ${REGEN_CMD}`;
}

// -------------------------------------------------------------------- load

function loadSources(root) {
  const errors = [];
  const commands = [];
  const agents = [];

  const cmdDir = path.join(root, 'skills-src', 'commands');
  const agtDir = path.join(root, 'skills-src', 'agents');
  for (const dir of [cmdDir, agtDir]) {
    if (!fs.existsSync(dir)) errors.push(`missing source directory: ${path.relative(root, dir)}`);
  }
  if (errors.length) return { commands, agents, errors };

  for (const file of fs.readdirSync(cmdDir).filter((f) => f.endsWith('.md')).sort()) {
    const stem = file.slice(0, -3);
    const rel = `skills-src/commands/${file}`;
    const parsed = parseFrontmatter(fs.readFileSync(path.join(cmdDir, file), 'utf8'), errors, rel);
    if (!parsed) continue;
    const { fields, body } = parsed;
    checkCommonFields(fields, stem, COMMAND_KEYS, errors, rel);
    checkBody(body, errors, rel);
    const hasMarker = body.split('\n').includes(ARG_MARKER);
    if (fields.arguments && !hasMarker)
      errors.push(`${rel}: frontmatter has "arguments" but the body has no ${ARG_MARKER} line`);
    if (!fields.arguments && hasMarker)
      errors.push(`${rel}: body has a ${ARG_MARKER} line but the frontmatter has no "arguments"`);
    commands.push({ stem, rel, fields, body });
  }

  for (const file of fs.readdirSync(agtDir).filter((f) => f.endsWith('.md')).sort()) {
    const stem = file.slice(0, -3);
    const rel = `skills-src/agents/${file}`;
    const parsed = parseFrontmatter(fs.readFileSync(path.join(agtDir, file), 'utf8'), errors, rel);
    if (!parsed) continue;
    const { fields, body } = parsed;
    checkCommonFields(fields, stem, AGENT_KEYS, errors, rel);
    checkBody(body, errors, rel);
    if (!(fields.role in ROLE_TOOLS))
      errors.push(
        `${rel}: role must be one of ${Object.keys(ROLE_TOOLS).map((r) => `"${r}"`).join(' | ')} — got ${JSON.stringify(fields.role)}`
      );
    agents.push({ stem, rel, fields, body });
  }

  return { commands, agents, errors };
}

// ------------------------------------------------------------------ render

function bindArguments(body, fields, runtime) {
  if (!fields.arguments) return body;
  return body
    .split('\n')
    .map((line) => (line === ARG_MARKER ? ARG_BINDING[runtime](fields.arguments) : line))
    .join('\n');
}

function renderClaudeCommand(src) {
  const fm = [`description: ${src.fields.description}`];
  if (src.fields.arguments) fm.push(`argument-hint: ${src.fields.arguments}`);
  return `---\n${fm.join('\n')}\n---\n${mdBanner(src.rel)}\n\n${bindArguments(src.body, src.fields, 'claude')}`;
}

function renderSkill(src) {
  // Codex takes the invocation name from the skill DIRECTORY; the name field
  // creates no alias, so the lint above (name === stem) is what makes the
  // directory and the frontmatter agree. Frontmatter is standard fields only —
  // never Claude extensions, which Codex would not understand.
  const fm = [`name: ${src.fields.name}`, `description: ${src.fields.description}`];
  return `---\n${fm.join('\n')}\n---\n${mdBanner(src.rel)}\n\n${bindArguments(src.body, src.fields, 'skill')}`;
}

function renderClaudeAgent(src) {
  const fm = [
    `name: ${src.fields.name}`,
    `description: ${src.fields.description}`,
    `tools: ${ROLE_TOOLS[src.fields.role]}`,
  ];
  return `---\n${fm.join('\n')}\n---\n${mdBanner(src.rel)}\n\n${src.body}`;
}

function renderCodexAgent(src) {
  return (
    `${tomlBanner(src.rel)}\n` +
    `name = "${escapeTomlBasic(src.fields.name)}"\n` +
    `description = "${escapeTomlBasic(src.fields.description)}"\n` +
    `sandbox_mode = "${ROLE_SANDBOX[src.fields.role]}"\n` +
    `developer_instructions = """\n${escapeTomlMultiline(src.body)}"""\n`
  );
}

// Returns a Map of root-relative path → content, in sorted key order.
// Throws on any lint failure — a broken source must never produce output.
function buildAll(root) {
  const { commands, agents, errors } = loadSources(root);
  if (errors.length) {
    const err = new Error(`build-adapters: ${errors.length} problem(s) in skills-src/`);
    err.problems = errors;
    throw err;
  }
  const out = new Map();
  for (const c of commands) {
    out.set(`.claude/commands/${c.stem}.md`, renderClaudeCommand(c));
    out.set(`.agents/skills/${c.stem}/SKILL.md`, renderSkill(c));
  }
  for (const a of agents) {
    out.set(`.claude/agents/${a.stem}.md`, renderClaudeAgent(a));
    out.set(`.codex/agents/${a.stem}.toml`, renderCodexAgent(a));
  }
  return new Map([...out].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

// ------------------------------------------------------------------ orphans

const OUTPUT_ROOTS = ['.claude/commands', '.claude/agents', '.agents/skills', '.codex/agents'];

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.isFile()) acc.push(full);
  }
  return acc;
}

// Any file carrying our banner that the current sources would not produce.
// This is what catches a renamed or deleted command whose old adapters would
// otherwise sit in the tree looking authoritative.
function findOrphans(root, expected) {
  const orphans = [];
  for (const sub of OUTPUT_ROOTS) {
    for (const full of walk(path.join(root, sub), [])) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      if (expected.has(rel)) continue;
      let text;
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      if (text.includes(BANNER_MARK)) orphans.push(rel);
    }
  }
  return orphans.sort();
}

// --------------------------------------------------------------------- CLI

function reportProblems(err) {
  console.error(`✗ ${err.message}`);
  for (const p of err.problems || []) console.error(`    ${p}`);
}

function runCheck(root) {
  let files;
  try {
    files = buildAll(root);
  } catch (err) {
    if (!err.problems) throw err;
    reportProblems(err);
    return 1;
  }
  const drift = [];
  for (const [rel, content] of files) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) drift.push(`missing: ${rel}`);
    else if (fs.readFileSync(full, 'utf8') !== content) drift.push(`stale:   ${rel}`);
  }
  for (const rel of findOrphans(root, files)) drift.push(`orphan:  ${rel}`);
  if (drift.length) {
    console.error(`✗ generated adapters are out of sync with skills-src/ (${drift.length} problem(s)):`);
    for (const d of drift) console.error(`    ${d}`);
    console.error(`  Regenerate with: ${REGEN_CMD}`);
    return 1;
  }
  console.log(`✓ ${files.size} generated adapters match skills-src/`);
  return 0;
}

function runWrite(root) {
  let files;
  try {
    files = buildAll(root);
  } catch (err) {
    if (!err.problems) throw err;
    reportProblems(err);
    return 1;
  }
  let written = 0;
  for (const [rel, content] of files) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    const before = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
    if (before === content) continue;
    fs.writeFileSync(full, content);
    written++;
    console.log(`  ${before === null ? 'new  ' : 'write'} ${rel}`);
  }
  // Only banner-carrying files are ever removed, so a hand-written file in
  // these directories is safe from this.
  for (const rel of findOrphans(root, files)) {
    const full = path.join(root, rel);
    fs.unlinkSync(full);
    const dir = path.dirname(full);
    if (dir !== root && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    console.log(`  prune ${rel} (no source in skills-src/)`);
  }
  console.log(`✓ ${files.size} adapters generated, ${written} changed`);
  return 0;
}

function main(argv) {
  let root = path.resolve(__dirname, '..');
  let check = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') check = true;
    else if (argv[i] === '--root') root = path.resolve(argv[++i]);
    else {
      console.error(`usage: ${REGEN_CMD} [--check] [--root DIR]`);
      return 2;
    }
  }
  return check ? runCheck(root) : runWrite(root);
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = {
  ARG_BINDING,
  ARG_MARKER,
  BANNER_MARK,
  DENY_LIST,
  DENY_PATTERNS,
  OUTPUT_ROOTS,
  ROLE_SANDBOX,
  ROLE_TOOLS,
  buildAll,
  escapeTomlBasic,
  escapeTomlMultiline,
  findOrphans,
  loadSources,
  main,
  runCheck,
  runWrite,
  unescapeTomlMultiline,
};
