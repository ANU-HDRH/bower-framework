#!/usr/bin/env node
'use strict';
// Live-reload test for _bower/viewer/serve.cjs: every change under docs/ must
// trigger a rebuild, including an atomic replace followed by a delete — the
// way an agent edits and then closes a review-plan.md. Node's recursive watch
// on Linux missed both, so a closed review stayed on screen.
//
//   node tools/viewer-test/watch.cjs      (run.cjs runs it)

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SERVE = path.join(__dirname, '../../_bower/viewer/serve.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bower-watch-'));
fs.cpSync(path.join(__dirname, 'fixture'), root, { recursive: true });
const mod = path.join(root, 'docs', 'modules', fs.readdirSync(path.join(root, 'docs', 'modules'))[0]);
const probe = path.join(mod, 'zz-probe.md');
const newDir = path.join(mod, 'zz-new');
const atomic = (file, body) => {
  fs.writeFileSync(`${file}.tmp~`, body);
  fs.renameSync(`${file}.tmp~`, file);
};

const STEPS = [
  ['create a file', () => fs.writeFileSync(probe, '# probe\n')],
  ['atomic-replace it', () => atomic(probe, '# probe 2\n')],
  ['atomic-replace it again', () => atomic(probe, '# probe 3\n')],
  ['delete it', () => fs.unlinkSync(probe)],
  ['create a directory with a file', () => {
    fs.mkdirSync(newDir);
    fs.writeFileSync(path.join(newDir, 'plan.md'), '# x\n');
  }],
  ['edit the file in the new directory', () => fs.writeFileSync(path.join(newDir, 'plan.md'), '# y\n')],
  ['swap the directory for a new one at the same path', () => {
    fs.renameSync(newDir, `${newDir}-old`);
    fs.mkdirSync(newDir);
    fs.writeFileSync(path.join(newDir, 'plan.md'), '# z\n');
  }],
  ['edit the file in the swapped-in directory', () => fs.writeFileSync(path.join(newDir, 'plan.md'), '# w\n')],
  ['delete and recreate the directory', () => {
    fs.rmSync(newDir, { recursive: true });
    fs.mkdirSync(newDir);
  }],
  ['create a file in the recreated directory', () => fs.writeFileSync(path.join(newDir, 'plan.md'), '# v\n')],
  ['remove the directories', () => {
    fs.rmSync(newDir, { recursive: true });
    fs.rmSync(`${newDir}-old`, { recursive: true });
  }],
];

const srv = spawn(process.execPath, [SERVE, '--root', root, '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
let log = '';
srv.stdout.on('data', (d) => (log += d));
srv.stderr.on('data', (d) => (log += d));
const rebuilds = () => (log.match(/docs changed/g) || []).length;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (pred, ms) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(25)) if (pred()) return true;
  return pred();
};

(async () => {
  let failures = 0;
  try {
    if (!(await until(() => /watching /.test(log), 5000))) throw new Error(`server did not start:\n${log}`);
    for (const [name, act] of STEPS) {
      const before = rebuilds();
      act();
      const ok = await until(() => rebuilds() > before, 2000);
      if (!ok) failures++;
      console.log(`  ${ok ? '✓' : '✗'} ${name} triggers a rebuild`);
      await sleep(250); // past the debounce, so steps do not coalesce
    }
  } catch (err) {
    failures++;
    console.error(`  ✗ ${err.message}`);
  } finally {
    srv.kill();
    fs.rmSync(root, { recursive: true, force: true });
  }
  process.exit(failures ? 1 : 0);
})();
