#!/usr/bin/env node
'use strict';
// Browser shell for the Bower docs viewer.
//
// Serves web/ plus a live graph.json, re-extracting on any change under docs/
// and pushing a reload over SSE. Zero dependencies; runs on node or bun.
//
//   node _bower/viewer/serve.cjs [--port 4173] [--host 127.0.0.1] [--root .]
//   node _bower/viewer/serve.cjs --build graph.json    (one-shot, no server)

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { extract, SCHEMA_VERSION } = require('./lib/extract.cjs');

// ---------------------------------------------------------------- args

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  return fallback;
};
const has = (name) => argv.includes(`--${name}`);

const ROOT = path.resolve(arg('root', process.cwd()));
const PORT = Number(arg('port', 4173));
// Loopback by default. The graph embeds every document body — including
// whatever docs/operations/ says about where credentials live — so exposing it
// to the subnet is opt-in, not the default.
const HOST = arg('host', '127.0.0.1');
const WEB = path.join(__dirname, 'web');

if (has('help')) {
  console.log(`Bower docs viewer — parses framework v${SCHEMA_VERSION} document schemas

  node _bower/viewer/serve.cjs                  serve on 127.0.0.1:4173
  node _bower/viewer/serve.cjs --port 8080      pick a port
  node _bower/viewer/serve.cjs --host 0.0.0.0   also reachable on your subnet
  node _bower/viewer/serve.cjs --root ../other  point at another Bower project
  node _bower/viewer/serve.cjs --build out.json emit graph.json and exit
`);
  process.exit(0);
}

// ---------------------------------------------------------------- graph cache

let graph = null;
let graphJson = '';
let rev = 0;
let lastError = null;

function rebuild(reason) {
  const t0 = Date.now();
  try {
    graph = extract(ROOT);
    graph.rev = ++rev;
    graphJson = JSON.stringify(graph);
    lastError = null;
    const { counts } = graph;
    const errs = counts.health.error || 0;
    const warns = counts.health.warn || 0;
    console.log(
      `[${new Date().toLocaleTimeString()}] ${reason} — ` +
        `${counts.modules} modules · ${counts.features} features · ${counts.adrs} ADRs · ` +
        `${counts.indexedFiles} indexed files · ${errs} error/${warns} warn ` +
        `(${Date.now() - t0}ms, ${(Buffer.byteLength(graphJson) / 1024).toFixed(0)}kB)`,
    );
  } catch (err) {
    lastError = err;
    console.error(`[extract failed] ${err.message}`);
  }
}

// ---------------------------------------------------------------- one-shot build

const buildTo = arg('build', null);
if (has('build')) {
  rebuild('build');
  if (lastError) process.exit(1);
  const out = buildTo && buildTo !== 'true' ? buildTo : 'graph.json';
  fs.writeFileSync(out, JSON.stringify(graph, null, 2));
  console.log(`wrote ${out}`);
  process.exit(0);
}

rebuild('initial extract');
if (lastError) process.exit(1);

// ---------------------------------------------------------------- watch

const DOCS = path.join(ROOT, 'docs');
const clients = new Set();
const dirWatchers = new Map();
let debounce = null;

// One non-recursive watch per directory, never per file. Node's recursive
// watch on Linux holds each file's inode, so a file an editor or agent
// replaces atomically goes deaf — its later edits and its deletion are never
// seen. A directory watch reports its children by name, whatever their inode.
// Every sync re-opens every watch: a watch is held on the directory's inode
// too, so a directory swapped out at the same path would keep a dead one.
function syncWatches() {
  for (const w of dirWatchers.values()) w.close();
  dirWatchers.clear();
  const walk = (dir) => {
    try {
      const w = fs.watch(dir, onDocsChange);
      w.on('error', () => {
        w.close();
        if (dirWatchers.get(dir) === w) dirWatchers.delete(dir);
      });
      dirWatchers.set(dir, w);
    } catch {
      return;
    }
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      /* removed mid-walk; the next sync drops it */
    }
    for (const e of entries) if (e.isDirectory()) walk(path.join(dir, e.name));
  };
  walk(DOCS);
}

function onDocsChange() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    // Before the rebuild, so a change made while the watches are re-opened,
    // or written into a new directory inside the debounce window, is read now.
    syncWatches();
    rebuild('docs changed');
    // A failed re-extract must not masquerade as a reload: the client would
    // re-fetch the last good graph and report success over stale data. Tell
    // it what happened instead; the next successful rebuild reloads as usual.
    const event = lastError
      ? `event: extract-error\ndata: ${JSON.stringify(lastError.message)}\n\n`
      : `event: reload\ndata: ${rev}\n\n`;
    for (const res of clients) {
      try {
        res.write(event);
      } catch {
        clients.delete(res);
      }
    }
  }, 150);
}

syncWatches();
if (dirWatchers.has(DOCS)) console.log(`watching ${DOCS} (${dirWatchers.size} directories)`);
else console.warn(`[watch unavailable on ${DOCS}] — reload the page manually after edits`);

// ---------------------------------------------------------------- static server

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/graph.json') {
    res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
    res.end(graphJson);
    return;
  }

  if (pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-store',
      connection: 'keep-alive',
    });
    res.write(`event: hello\ndata: ${rev}\n\n`);
    clients.add(res);
    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        /* closed */
      }
    }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  // Open a source file in the editor (used by the "open" affordance).
  // Resolve then verify containment: stripping leading `../` is not enough,
  // because `a/../../etc/passwd` has none to strip.
  if (pathname === '/open') {
    const target = url.searchParams.get('path') || '';
    const lineRaw = url.searchParams.get('line');
    const line = lineRaw && /^\d+$/.test(lineRaw) && Number(lineRaw) > 0 ? Number(lineRaw) : null;
    const abs = path.resolve(ROOT, target.replace(/^\/+/, ''));
    if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('outside the project root');
      return;
    }
    res.writeHead(302, { location: `vscode://file/${abs}${line ? `:${line}` : ''}` });
    res.end();
    return;
  }

  let rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let file = path.resolve(WEB, rel);
  if (file !== WEB && !file.startsWith(WEB + path.sep)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(WEB, 'index.html'); // SPA fallback
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  const nets = os.networkInterfaces();
  const lan = [];
  for (const list of Object.values(nets))
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
  const s = graph.schema;
  console.log(`\n  Bower docs viewer — ${graph.project.name}`);
  const port = server.address().port;
  console.log(`  local    http://localhost:${port}`);
  if (HOST === '0.0.0.0') {
    for (const ip of lan) console.log(`  network  http://${ip}:${port}`);
    if (lan.length)
      console.log(`\n  (bound to 0.0.0.0 — reachable on your subnet, and the graph embeds every doc body)`);
  }
  if (s.match === false)
    console.log(
      `\n  ! viewer parses v${s.viewerFor} schemas, project is on v${s.projectVersion} — drift checks may be stale`,
    );
  else if (s.match === null) console.log(`\n  (no _bower/VERSION — assuming v${s.viewerFor} document schemas)`);
  console.log('');
});
