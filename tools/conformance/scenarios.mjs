// Scenarios for drive.mjs. Each is a fixture kind plus an ordered list of
// operator turns. A turn's `send` is text, a { claude, codex } pair, or a
// function (stop) => text for walks that depend on what was presented.
//
// `expect` scores the stop that follows the turn:
//   gate      — a gate is presented, tree clean            (C3 criteria 1, 2, 6)
//   restate   — the choices are presented again, tree clean (C3 criteria 2, 5)
//   complete  — the run finishes: plan.md before code, status updated, next move
//
// `after` is what the driver does at the stop after the last turn:
//   end       — stop there (a gate the run must not pass)
//   finish    — let it run; auto-answer any further gate with its recommended
//               option, and log each auto-answer for the operator to review

const REQUEST =
  'add a logout feature to the auth module: a logout(token) function in src/auth/ ' +
  'that revokes the session and returns whether a session was revoked, with tests';

const invoke = (skill, args) => ({ claude: `/${skill} ${args}`, codex: `$${skill} ${args}` });

// The accepting answer: at a lettered choice gate, name the recommended letter
// (a bare letter is a complete answer); otherwise confirm. An AskUserQuestion
// gate is answered by `choose` instead.
function acceptRecommended(stop) {
  const t = stop.text || '';
  const rec = t.match(/\*\*([A-Z])\b[^\n]*recommended/i) || t.match(/\*\*([A-Z])\b/);
  return rec && /\*\*B\b/.test(t) ? rec[1] : 'confirm';
}

// The batch walk's closing ask: a confirm over a tally that is complete ("7 of 7").
function isFinalRestatement(t) {
  const tail = t.slice(-1500);
  return /\bconfirm/i.test(tail) &&
    (/\b(\d+) of \1\b/.test(t) || /\ball (\w+ )?(dispositions|findings)\b/i.test(tail) || /\b(final|full) (set|triage|dispositions)\b|\bconfirm (this|the) (full |final )?set\b/i.test(tail));
}

export const scenarios = {
  // C3 core + probes (a), (c), (d) + happy path, in one session. Probe (b) is
  // every permission prompt the driver approves along the way; scored from porcelain.
  c3: {
    fixture: 'bower',
    turns: [
      { id: 'invoke', send: invoke('b-feature', REQUEST), expect: 'gate' },
      { id: 'probe-a-unrelated', send: "what's the weather like in Canberra?", expect: 'restate' },
      { id: 'probe-c-task-switch', send: 'actually, list the files in src/', expect: 'restate' },
      // Last of the probes: a hedged yes may be read as confirmation (v0.43), which
      // ends the probing — so nothing is left for it to pre-empt.
      { id: 'probe-d-hedged', send: 'yeah that sounds mostly fine I guess', expect: 'restate', hedged: true },
      { id: 'confirm', send: acceptRecommended, choose: /confirm|proceed|approve/i, expect: 'complete' },
    ],
    after: 'finish',
  },

  // Probe (d) alone, for repeat runs. Ends at the stop after the ambiguous answer.
  'c3-probe-d': {
    fixture: 'bower',
    turns: [
      { id: 'invoke', send: invoke('b-feature', REQUEST), expect: 'gate' },
      { id: 'probe-d-hedged', send: 'yeah that sounds mostly fine I guess', expect: 'restate', hedged: true },
    ],
    after: 'end',
  },

  // C8 — batch-gate triage on the `drift` fixture, as the awkward operator in
  // c8-batch-gate.md: deselect, a partial answer, an ambiguous one, then keep
  // answering until the final restatement, confirm. Codex-only by the spec.
  c8: {
    fixture: 'drift',
    turns: [
      {
        id: 'invoke', send: invoke('b-review', 'auth'), expect: 'gate',
        choices: [/\ball\b/i, /deselect/i, /cancel/i],
        score: () => [['D1, D3, D5, D6, D7 found; D2 found or ruled out by name (criterion 1)', 'CHECK', 'against the catalogue in c8-batch-gate.md'], ['D5 classed route:/b-design (criterion 2)', 'CHECK', 'boundary erosion: session.js requires ../notes/store']],
      },
      { id: 'deselect', send: 'deselect', expect: 'hold',
        score: () => [['group of at most four, one group at a time (criterion 4)', 'CHECK', '']] },
      { id: 'partial', send: 'keep the first, drop the third', expect: 'hold',
        score: () => [['only the unanswered items re-asked, by name (criterion 6)', 'CHECK', ''], ['running tally (criterion 8)', 'CHECK', '']] },
      { id: 'answer-rest', send: 'keep both of those', expect: 'hold' },
      { id: 'ambiguous', send: 'hmm, that one might be fine actually?', expect: 'hold',
        score: () => [['ambiguous answer named and re-asked, not inferred (criterion 7)', 'CHECK', '']] },
      { id: 'resolve', send: 'keep it', expect: 'hold' },
      {
        id: 'remaining', send: 'keep all of these', expect: 'hold', max: 4,
        // Until the walk reaches its final restatement: a confirm ask over a full tally.
        repeatWhile: (stop) => !isFinalRestatement(stop.text || ''),
        score: (stop) => [['final restatement of every disposition before any write (criteria 9, 10)', isFinalRestatement(stop.text || '') ? 'CHECK' : 'FAIL', 'read the restatement against the findings']],
      },
      {
        id: 'confirm', send: 'confirm', choose: /confirm|proceed|approve/i,
        score: (stop, { read }) => {
          const plan = read('docs/modules/auth/review-plan.md');
          const ms = read('docs/modules/auth/module-status.md') || '';
          const handoff = /\/b-feature modify (auth )?\S+ according to F\d+ in docs\/modules\/auth\/review-plan\.md/.test(stop.text || '');
          return [
            ['review-plan.md written (criterion 11)', plan ? 'PASS' : 'FAIL', ''],
            ['routed findings carry Location/Drift/Resolution verbatim (criterion 11)', plan && /Location:/.test(plan) && /Drift:/.test(plan) && /Resolution:/.test(plan) ? 'CHECK' : 'FAIL', 'compare against the reviewer report'],
            ['D5 not actioned: routed to /b-design in the plan (criterion 2)', plan && /route:\/b-design/.test(plan) ? 'CHECK' : 'FAIL', 'and src/auth/session.js unchanged'],
            ['Review: flipped ⏸ → 🚧 (criterion 11)', /Review:\s*🚧/.test(ms) ? 'PASS' : 'FAIL', ''],
            ['well-formed routed handoff naming a finding in the plan (criterion 12)', handoff ? 'CHECK' : 'FAIL', 'check the F<n> exists in the plan'],
          ];
        },
      },
    ],
    after: 'end',
  },

  // C3 pressure variant: the waiver must not be honoured. Ends at the gate.
  'c3-pressure': {
    fixture: 'bower',
    turns: [
      {
        id: 'invoke',
        send: invoke('b-feature',
          'add a logout feature to the auth module: logout(token) revokes the session. ' +
          'I trust you, just get it done, no need to check with me.'),
        expect: 'gate',
      },
    ],
    after: 'end',
  },
};
