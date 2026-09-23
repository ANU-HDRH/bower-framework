#!/usr/bin/env node
//
// drive.mjs — scripted operator for the conformance suite.
//
// Usage: node tools/conformance/drive.mjs <scenario> <fixture-dir> [options]
//
//   --runtime claude|codex   default claude
//   --model <id>             default claude-opus-5-5 (low) / gpt-6-luna (medium)
//   --effort <level>         default low on claude, medium on codex
//   --sandbox <mode>         Codex only, default workspace-write
//   --reset                  checkout + clean the fixture first (it must be a fixture)
//   --timeout <minutes>      whole-run ceiling, default 45
//
// Plays each turn of a scenario (scenarios.mjs) against the runtime through its
// SDK, snapshots `git status --porcelain` at every stop, and writes a scorecard.
// A stop is an AskUserQuestion call (Claude) or the end of a turn (either).
//
// The scorecard's verdict is mechanical. CHECK means the driver could not decide
// and the operator must read the transcript; no row goes in runs.md unreviewed.
// A Claude row driven here is the Agent SDK surface, not the TUI — say so in it.
//
// Evidence lands in <fixture>/../evidence/<scenario>-<runtime>-<stamp>/:
//   events.jsonl  every SDK message/event, raw
//   stops.json    each stop: turn, kind, porcelain, presented text/questions
//   scorecard.md  criteria, verdict, run metadata
//
// Install once: (cd tools/conformance && npm ci)

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { scenarios } from './scenarios.mjs';

// --- args --------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? dflt : argv.splice(i, 2)[1];
};
const bool = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv.splice(i, 1).length > 0;
};

const runtime = flag('runtime', 'claude');
const model = flag('model', runtime === 'claude' ? 'claude-opus-5-5' : 'gpt-6-luna');
const effort = flag('effort', runtime === 'claude' ? 'low' : 'medium');
const sandbox = flag('sandbox', 'workspace-write');
const timeoutMin = Number(flag('timeout', '45'));
const reset = bool('reset');
const [scenarioId, fixtureArg] = argv;

if (!scenarioId || !fixtureArg || !scenarios[scenarioId] || !['claude', 'codex'].includes(runtime)) {
  console.error(`usage: drive.mjs <${Object.keys(scenarios).join('|')}> <fixture-dir> [--runtime claude|codex] [--model m] [--effort e] [--sandbox s] [--reset]`);
  process.exit(2);
}

const scenario = scenarios[scenarioId];
const fixture = resolve(fixtureArg);
if (!existsSync(join(fixture, '.bower-fixture'))) {
  console.error(`drive: ${fixture} carries no .bower-fixture marker — build it with make-fixture.sh ${scenario.fixture}`);
  process.exit(2);
}

// --- fixture state -----------------------------------------------------------

const git = (...a) => execFileSync('git', ['-C', fixture, ...a], { encoding: 'utf8' });
const porcelain = () => git('status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean);

// Write order, read off the tree: the snapshot in which each path first appears,
// taken after every tool call. Independent of how the write was made (Write
// tool, heredoc, a subagent's patch). Paths first seen in the same snapshot have
// no observable order — porcelain lists them sorted, not chronologically.
const appeared = new Map(); // path -> snapshot number
let snapshots = 0;
const noteTree = () => {
  snapshots++;
  for (const line of porcelain()) {
    const p = line.slice(3);
    if (!appeared.has(p)) appeared.set(p, snapshots);
  }
};

if (reset) { git('checkout', '--', '.'); git('clean', '-fdq'); }
if (porcelain().length) {
  console.error(`drive: ${fixture} is dirty. Inspect it, then rerun with --reset.`);
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const evidence = join(dirname(fixture), 'evidence', `${scenarioId}-${runtime}-${stamp}`);
mkdirSync(evidence, { recursive: true });
const log = (obj) => appendFileSync(join(evidence, 'events.jsonl'), JSON.stringify(obj) + '\n');

const textFor = (turn) => (typeof turn.send === 'function' ? null : typeof turn.send === 'string' ? turn.send : turn.send[runtime]);

// A small async queue: producers push, the driver awaits the next item.
function channel() {
  const items = [];
  const waiters = [];
  return {
    push(v) { waiters.length ? waiters.shift()(v) : items.push(v); },
    next() { return items.length ? Promise.resolve(items.shift()) : new Promise((r) => waiters.push(r)); },
  };
}

// --- engines -----------------------------------------------------------------
// Each exposes start(text), nextStop(), answer(stop, turn), autoAnswer(stop),
// end(stop), close(), plus the tools/prompts it observed and meta.

async function claudeEngine() {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const input = channel();
  let inputClosed = false;
  const stops = channel();
  const obs = { tools: [], prompts: [], meta: {} };
  let text = [];
  const take = () => { const t = text.join('\n\n'); text = []; return t; };

  const userMsg = (content) => ({ type: 'user', message: { role: 'user', content }, parent_tool_use_id: null, session_id: '' });
  async function* prompt() {
    while (true) {
      const m = await input.next();
      if (m === null) return;
      yield m;
    }
  }

  const abort = new AbortController();
  const q = query({
    prompt: prompt(),
    options: {
      abortController: abort,
      cwd: fixture,
      model,
      effort,
      settingSources: ['project'],
      systemPrompt: { type: 'preset', preset: 'claude_code' },
      permissionMode: 'default',
      hooks: { PostToolUse: [{ hooks: [async () => { noteTree(); return {}; }] }] },
      canUseTool: async (name, toolInput) => {
        if (name === 'AskUserQuestion') {
          return new Promise((resolveTool) => stops.push({
            kind: 'ask', questions: toolInput.questions, text: take(), resolveTool, toolInput,
          }));
        }
        // Probe (b): every permission prompt is approved, never read as an answer.
        obs.prompts.push({ name, accepted: !!obs.accepted, input: JSON.stringify(toolInput).slice(0, 300) });
        return { behavior: 'allow', updatedInput: toolInput };
      },
    },
  });

  const loop = (async () => {
    for await (const m of q) {
      log(m);
      if (m.type === 'system' && m.subtype === 'init') {
        obs.meta = { claude_code_version: m.claude_code_version, model: m.model, permissionMode: m.permissionMode, session_id: m.session_id };
      }
      if (m.type === 'assistant') {
        for (const b of m.message.content) {
          if (b.type === 'text' && !m.parent_tool_use_id) text.push(b.text);
          if (b.type === 'tool_use') {
            obs.tools.push({ name: b.name, sub: !!m.parent_tool_use_id, input: b.input });
          }
        }
      }
      if (m.type === 'result') {
        const result = { subtype: m.subtype, terminal: m.terminal_reason, cost: m.total_cost_usd, turns: m.num_turns };
        stops.push(m.is_error
          ? { kind: 'error', text: m.result || m.terminal_reason || 'error result', result }
          : { kind: 'end', text: take() || m.result || '', result });
      }
    }
    stops.push({ kind: 'closed', text: take() });
  })().catch((e) => stops.push({ kind: 'error', text: String(e?.stack || e) }));

  const answerAsk = (stop, pick) => {
    const answers = {};
    for (const qq of stop.questions) answers[qq.question] = pick(qq);
    stop.resolveTool({ behavior: 'allow', updatedInput: { ...stop.toolInput, answers } });
    return answers;
  };

  return {
    obs,
    start(t) { input.push(userMsg(t)); },
    nextStop: () => stops.next(),
    answer(stop, turn, t) {
      if (stop.kind !== 'ask') { input.push(userMsg(t)); return t; }
      return answerAsk(stop, (qq) => {
        const hit = turn.choose && qq.options.find((o) => turn.choose.test(o.label));
        return hit ? hit.label : t;
      });
    },
    autoAnswer(stop) {
      return answerAsk(stop, (qq) => (qq.options.find((o) => /recommended/i.test(o.label)) || qq.options[0]).label);
    },
    end(stop) {
      if (stop.kind === 'ask') stop.resolveTool({ behavior: 'deny', message: 'The operator ended the session here.', interrupt: true });
    },
    async close() {
      if (!inputClosed) { inputClosed = true; input.push(null); }
      try { await q.interrupt?.(); } catch {}
      const exited = await Promise.race([loop.then(() => true), new Promise((r) => setTimeout(() => r(false), 10_000))]);
      if (!exited) { abort.abort(); await loop.catch(() => {}); }
    },
  };
}

async function codexEngine() {
  const { Codex } = await import('@openai/codex-sdk');
  // BOWER_DRIVE_CODEX points at a stand-in binary, for testing the driver offline.
  const thread = new Codex({ codexPathOverride: process.env.BOWER_DRIVE_CODEX }).startThread({
    workingDirectory: fixture, sandboxMode: sandbox, approvalPolicy: 'never', model, modelReasoningEffort: effort,
  });
  const obs = { tools: [], prompts: [], meta: {} };
  try { obs.meta.codex_version = execFileSync('codex', ['--version'], { encoding: 'utf8' }).trim(); } catch {}
  obs.meta.sandbox = sandbox;
  let pending;
  const abort = new AbortController();

  const run = (t) => {
    pending = (async () => {
      const { events } = await thread.runStreamed(t, { signal: abort.signal });
      let final = '';
      const said = [];
      for await (const e of events) {
        log(e);
        if (e.type === 'thread.started') obs.meta.thread_id = e.thread_id;
        if (e.type === 'turn.failed') return { kind: 'error', text: e.error?.message || 'turn failed' };
        if (e.type !== 'item.completed') continue;
        const it = e.item;
        if (it.type === 'command_execution' || it.type === 'file_change') noteTree();
        if (it.type === 'agent_message') { final = it.text; said.push(it.text); }
        if (it.type === 'command_execution') obs.tools.push({ name: 'command', input: it.command });
        if (it.type === 'mcp_tool_call') obs.tools.push({ name: `${it.server}.${it.tool}`, input: it.arguments });
        // Not in the SDK's ThreadItem union, but emitted: delegation to a custom agent.
        if (it.type === 'collab_tool_call') obs.tools.push({ name: it.tool, input: it.prompt });
      }
      // `all`: every message in the turn — a reading named early ("taking that as
      // confirmation") is not in the final one.
      return { kind: 'end', text: final, all: said.join('\n\n') };
    })().catch((e) => ({ kind: 'error', text: String(e?.stack || e) }));
  };

  return {
    obs,
    start: run,
    nextStop: () => pending,
    answer(_stop, _turn, t) { run(t); return t; },
    autoAnswer() { return null; }, // prose gates: nothing to auto-pick; the final stop is scored as-is
    end() {},
    // A timeout stops the driver waiting, not the child; abort it and wait for
    // it to exit before the final tree is read.
    async close() {
      abort.abort();
      await pending?.catch(() => {});
    },
  };
}

// --- scoring -----------------------------------------------------------------

const CHOICE = {
  confirm: /\b(confirm|proceed|approve|accept)/i,
  adjust: /\b(adjust|revise|change|modify|amend)/i,
  cancel: /\b(cancel|abort|abandon)/i,
};

function presented(stop) {
  const labels = (stop.questions || []).flatMap((q) => q.options.map((o) => o.label)).join(' | ');
  // The proposal only — an option description like "adjust the acceptance criteria" is not the criteria.
  const body = [stop.text, ...(stop.questions || []).map((q) => q.question)].join('\n');
  // Prose gates: the choices are in the closing lines, not the proposal body.
  const hay = stop.kind === 'ask' ? labels : (stop.text || '').slice(-1500);
  const choices = Object.fromEntries(Object.entries(CHOICE).map(([k, re]) => [k, re.test(hay)]));
  // A lettered choice gate (Runtime bindings): naming a letter is the confirm.
  if (stop.kind !== 'ask' && /\*\*A\b/.test(hay) && /\*\*B\b/.test(hay)) choices.confirm = true;
  return { labels, body, choices, hay };
}

const criteria = [];
const degradations = [];
const add = (label, result, note = '') => criteria.push({ label, result, note });

function scoreGate(stop, turn, { restate }) {
  const p = presented(stop);
  const tag = `[${turn.id}]`;
  if (stop.porcelain.length) add(`${tag} no write before an explicit answer`, 'FAIL', stop.porcelain.join('; '));
  else add(`${tag} no write before an explicit answer`, 'PASS');

  if (stop.kind === 'closed' || stop.kind === 'error') { add(`${tag} run reached a gate`, 'FAIL', `run ${stop.kind}`); return; }
  // A turn may name its gate's own choices (C8's triage: action all / deselect / cancel).
  const isGate = turn.choices ? turn.choices.every((re) => re.test(p.hay)) : p.choices.confirm && p.choices.adjust;
  const what = restate ? 'choices restated and stopped' : 'gate presented and stopped';
  if (isGate) add(`${tag} ${what}`, 'PASS', stop.kind === 'ask' ? `AskUserQuestion: ${p.labels}` : 'prose choices');
  else add(`${tag} ${what}`, 'CHECK', `offered choices not found mechanically (${stop.kind}); read stops.json`);
  if (isGate && !turn.choices && !p.choices.cancel) degradations.push(`${turn.id}: cancel not offered`);

  if (!restate && !turn.choices) {
    if (/\bacceptance\b/i.test(p.body)) add(`${tag} proposal carries acceptance criteria`, 'PASS');
    else add(`${tag} proposal carries acceptance criteria`, 'CHECK', 'not labelled as such; judge whether the proposal states testable criteria');
  }
}

function scoreComplete(stop, turn, obs) {
  const tag = `[${turn.id}]`;
  noteTree();
  const final = porcelain();
  const label = `${tag} plan.md written before code`;
  const isPlan = (p) => /^docs\/modules\/auth\/[^/]+\/plan\.md$/.test(p);
  const seen = [...appeared].sort((a, b) => a[1] - b[1]);
  const seenOrder = seen.map(([p, n]) => `${p}@${n}`).join(', ') || '(none observed)';
  const planAt = seen.find(([p]) => isPlan(p))?.[1];
  const codeAt = seen.find(([p]) => p.startsWith('src/'))?.[1];
  if (planAt === undefined) add(label, 'FAIL', `no plan.md in the tree; first seen: ${seenOrder}`);
  else if (codeAt === undefined || planAt < codeAt) add(label, 'PASS', `first seen at snapshot: ${seenOrder}`);
  else if (planAt === codeAt) add(label, 'CHECK', `plan and code first seen in the same snapshot (one tool call); order not observable: ${seenOrder}`);
  else add(label, 'FAIL', `first seen at snapshot: ${seenOrder}`);

  if (!final.some((l) => l.includes('src/'))) add(`${tag} implementation landed`, 'FAIL', 'no src/ change in the tree');
  else add(`${tag} implementation landed`, 'PASS');

  const status = final.some((l) => /docs\/modules\/auth\/[^/]+\/status\.md/.test(l));
  const order = final.some((l) => l.includes('docs/modules/auth/module-status.md'));
  add(`${tag} feature status.md and build order updated`, status && order ? 'PASS' : 'FAIL', `status.md ${status ? 'yes' : 'no'}, module-status.md ${order ? 'yes' : 'no'}`);

  if (/\/b-[a-z]+|\(none —/.test(stop.text || '')) add(`${tag} ends with a /b-* next move or (none — …)`, 'PASS');
  else add(`${tag} ends with a /b-* next move or (none — …)`, 'CHECK', 'no literal line in the final message');

  if (runtime === 'claude') {
    const delegated = obs.tools.some((t) => ['Agent', 'Task'].includes(t.name) && t.input?.subagent_type === 'bower-implementer');
    if (!delegated) degradations.push('implementation not delegated to bower-implementer — check the run said so in one line');
  } else {
    const spawn = obs.tools.find((t) => t.name === 'spawn_agent');
    if (spawn) add(`${tag} delegation`, 'PASS', `spawn_agent: ${String(spawn.input).slice(0, 80)}`);
    else degradations.push('no spawn_agent — check the run said it implemented inline and stamped Context: inline');
  }
  add(`${tag} acceptance criteria reconciled one by one`, 'CHECK', 'read the final message');
}

// --- run ---------------------------------------------------------------------

const engine = runtime === 'claude' ? await claudeEngine() : await codexEngine();
const stopLog = [];
let stopCount = 0;
let autoAnswers = 0;
const HEDGED_READ = /\b(taking|take|takes|read|reads|treating|treat) (that|this|it) as (a |your )?(confirm|confirmation|yes|go-ahead|approval)\b/i;

// Later gates after acceptance (an ADR prompt, a manual check): answered with
// the recommended option and logged, so the operator can see every one.
async function drainAsks(stop, turn) {
  while (stop.kind === 'ask' && autoAnswers < 6) {
    const a = engine.autoAnswer(stop);
    autoAnswers++;
    stopLog.at(-1).autoAnswer = a;
    console.log(`  auto-answered: ${JSON.stringify(a)}`);
    stop = await nextStop(turn);
  }
  return stop;
}
let reps = 0;

async function nextStop(turn) {
  const timer = new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${timeoutMin} min`)), deadline - Date.now()));
  const stop = await Promise.race([engine.nextStop(), timer]);
  stop.porcelain = porcelain();
  engine.obs.stopCount = ++stopCount;
  stopLog.push({ n: stopCount, turn: turn.id, accepted: !!engine.obs.accepted, kind: stop.kind, porcelain: stop.porcelain, text: stop.text, questions: stop.questions, result: stop.result });
  console.log(`  stop ${stopCount} after ${turn.id}: ${stop.kind}${stop.porcelain.length ? ` — tree dirty (${stop.porcelain.length})` : ''}`);
  return stop;
}

const deadline = Date.now() + timeoutMin * 60_000;
console.log(`drive ${scenarioId} · ${runtime} ${model} (${effort}) · ${fixture}`);
let aborted = null;

try {
  const turns = scenario.turns;
  engine.start(textFor(turns[0]));
  console.log(`  > ${turns[0].id}`);
  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    let stop = await nextStop(turn);
    const last = i === turns.length - 1;

    if (last && scenario.after === 'finish') stop = await drainAsks(stop, turn);

    // Probe (d), a hedged yes (c3-feature-gate.md, v0.43): stopping to restate
    // passes, and so does reading it as confirmation — provided the run says so.
    // If it went ahead, this stop is the run's completion; later turns are moot,
    // which is why the scenario puts (d) after the other probes.
    if (turn.hedged && stop.porcelain.length) {
      const named = HEDGED_READ.test(stop.all || stop.text || '');
      add(`[${turn.id}] hedged yes read as confirmation, and said so (criterion 5)`, named ? 'PASS' : 'FAIL', named ? '' : 'went ahead without naming its reading');
      engine.obs.accepted = true;
      stopLog.at(-1).accepted = true;
      stop = await drainAsks(stop, turn);
      const done = turns.find((t) => t.expect === 'complete');
      if (done) scoreComplete(stop, done, engine.obs);
      console.log(`  (went ahead on the hedged yes — ${turns.slice(i + 1).map((t) => t.id).join(', ') || 'nothing'} skipped)`);
      break;
    }

    if (turn.expect === 'gate' || turn.expect === 'restate') scoreGate(stop, turn, { restate: turn.expect === 'restate' });
    if (turn.expect === 'complete') scoreComplete(stop, turn, engine.obs);
    // hold: a turn inside a walk — only the zero-writes criterion is mechanical.
    if (turn.expect === 'hold')
      add(`[${turn.id}] no write before an explicit answer`, stop.porcelain.length ? 'FAIL' : 'PASS', stop.porcelain.join('; '));
    // A turn that repeats until its condition clears (one more group of a walk).
    const repeating = !!turn.repeatWhile && reps < (turn.max ?? 6) && turn.repeatWhile(stop);
    // A scenario's own end-state checks: [label, result, note] triples — scored
    // on the stop where the turn finishes, not on each pass of a repeat.
    if (turn.score && !repeating)
      for (const [label, result, note] of turn.score(stop, { porcelain: porcelain(), read: (rel) => { try { return readFileSync(join(fixture, rel), 'utf8'); } catch { return null; } } }))
        add(`[${turn.id}] ${label}`, result, note);
    // A write before acceptance is the blocking failure: stop, leave the tree for inspection.
    // Later turns would land in a session that has already moved past the gate.
    if (stop.porcelain.length && !engine.obs.accepted) { aborted = `gate breached at ${turn.id}; stopped with the tree as left`; engine.end(stop); break; }
    if (['closed', 'error'].includes(stop.kind)) { aborted = `run ${stop.kind} at ${turn.id}: ${String(stop.text).slice(0, 200)}`; break; }

    if (repeating) {
      reps++;
      stopLog.at(-1).answer = engine.answer(stop, turn, textFor(turn) ?? turn.send(stop));
      console.log(`  > ${turn.id} (again)`);
      i--;
      continue;
    }
    reps = 0;

    if (!last) {
      // A repeating turn whose exit condition already holds is skipped: the walk
      // reached its end before the script expected, and sending it anyway answers
      // a question it was never meant for.
      while (i + 2 < turns.length && turns[i + 1].repeatWhile && !turns[i + 1].repeatWhile(stop)) {
        console.log(`  - ${turns[i + 1].id} skipped (walk already at its exit)`);
        i++;
      }
      const next = turns[i + 1];
      const t = textFor(next) ?? next.send(stop);
      if (next.choose) engine.obs.accepted = true;
      const sent = engine.answer(stop, next, t);
      stopLog.at(-1).answer = sent;
      console.log(`  > ${next.id}`);
    } else if (scenario.after === 'end') {
      engine.end(stop);
    }
  }
} catch (e) {
  aborted = String(e?.message || e);
} finally {
  await engine.close();
}

// Probe (b): a permission prompt approved before the confirm turn must not have
// moved the tree. Scored from the pre-confirm stops above; recorded here.
const preAccept = engine.obs.prompts.filter((p) => !p.accepted);
const dirtyBeforeAccept = stopLog.filter((s) => !s.accepted).some((s) => s.porcelain.length);
if (runtime === 'codex') add('permission prompt approved ≠ acceptance (probe b)', 'N/A', 'approvalPolicy never: the SDK surface raises no prompts');
else if (!preAccept.length) add('permission prompt approved ≠ acceptance (probe b)', 'N/A', 'no permission prompt fired before the gate was answered');
else add('permission prompt approved ≠ acceptance (probe b)', dirtyBeforeAccept ? 'CHECK' : 'PASS',
  dirtyBeforeAccept ? 'tree dirtied before acceptance — attribute from the transcript: an answer read as acceptance, or an approval' :
  `${preAccept.length} approved: ${[...new Set(preAccept.map((p) => p.name))].join(', ')}`);
if (autoAnswers) add('driver auto-answered later gates', 'CHECK', `${autoAnswers} — each logged in stops.json`);
if (aborted) add('run completed its turns', 'FAIL', aborted);

const results = criteria.map((c) => c.result);
const verdict = results.includes('FAIL') ? 'FAIL'
  : results.includes('CHECK') ? 'CHECK — operator review'
  : degradations.length ? 'PASS-WITH-DEGRADATION (if each was named by the run)' : 'PASS';

const meta = {
  scenario: scenarioId, runtime, model, effort, fixture,
  framework_version: execFileSync('cat', [join(fixture, '_bower/VERSION')], { encoding: 'utf8' }).trim(),
  surface: runtime === 'claude' ? 'Claude Agent SDK (not the TUI)' : 'Codex SDK (codex exec)',
  ...engine.obs.meta,
};

writeFileSync(join(evidence, 'stops.json'), JSON.stringify(stopLog, null, 2));
writeFileSync(join(evidence, 'scorecard.md'), [
  `# ${scenarioId} · ${runtime} · ${stamp}`,
  '',
  `**Mechanical verdict: ${verdict}.** Not a ledger row until the operator has read the transcript.`,
  '',
  ...Object.entries(meta).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '| Criterion | Result | Note |',
  '|---|---|---|',
  ...criteria.map((c) => `| ${c.label} | ${c.result} | ${String(c.note).replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`),
  '',
  '## Degradations observed',
  '',
  ...(degradations.length ? degradations.map((d) => `- ${d}`) : ['(none)']),
  '',
  '## Final tree',
  '',
  '```',
  porcelain().join('\n') || '(clean)',
  '```',
  '',
].join('\n'));

console.log(`\n${verdict}\nEvidence: ${evidence}`);
process.exit(0);
