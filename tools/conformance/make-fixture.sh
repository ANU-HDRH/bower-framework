#!/usr/bin/env bash
#
# make-fixture.sh — build a disposable fixture project for a conformance scenario.
#
# Usage: bash tools/conformance/make-fixture.sh <kind> <target-dir> [--force]
#
# Kinds:
#   empty       Git repo with nothing but the scaffolded Bower footprint.      (C1)
#   brownfield  Toy codebase, no docs/, scaffolded.                            (C2)
#   bower       Toy codebase + conformant docs/, scaffolded.              (C3/C4/C6/C7)
#   drift       bower + seven seeded drifts in module auth, Review: reset.     (C8)
#   pinned      bower, but carrying the v0.32 footprint and VERSION=0.32.      (C5)
#
# Every kind ends with a clean working tree (one commit, `git status --porcelain`
# empty) because the zero-writes assertion in most scenarios is a porcelain
# diff, and /b-upgrade refuses to run on a dirty tree.
#
# The fixture is disposable by design. Build it outside the framework repo —
# ~/scratch/bower-conformance/<scenario>/ is the convention. Delete it after the
# run; nothing here is meant to be kept.
#
# Zero dependencies beyond bash, git, and this repo's scaffold.sh. `pinned` also
# needs the v0.32 tag reachable in the framework repo.

set -euo pipefail

FRAMEWORK="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

usage() { sed -n '3,28p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 1; }

[ $# -ge 2 ] || usage
KIND="$1"; TARGET="$2"; FORCE="${3:-}"

case "$KIND" in
  empty|brownfield|bower|drift|pinned) ;;
  *) echo "make-fixture: unknown kind '$KIND'" >&2; usage ;;
esac

# --- target guard ------------------------------------------------------------
# Refuse to overwrite anything that is not obviously a previous fixture.
if [ -e "$TARGET" ]; then
  if [ "$FORCE" = "--force" ] && [ -f "$TARGET/.bower-fixture" ]; then
    rm -rf "$TARGET"
  elif [ "$FORCE" = "--force" ]; then
    echo "make-fixture: $TARGET exists but carries no .bower-fixture marker — refusing to delete it." >&2
    exit 1
  else
    echo "make-fixture: $TARGET exists. Delete it, or pass --force to rebuild a previous fixture." >&2
    exit 1
  fi
fi

mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"
echo "$KIND fixture, built from $FRAMEWORK" > "$TARGET/.bower-fixture"

git -C "$TARGET" init -q
git -C "$TARGET" config user.email conformance@example.invalid
git -C "$TARGET" config user.name "Bower Conformance"

# --- the toy codebase --------------------------------------------------------
# A notes app: `auth` owns credentials and sessions, `notes` owns note storage
# and consumes only auth's public surface. Two modules is the smallest shape
# that gives the skills a real boundary to reason about.
write_code() {
  mkdir -p "$TARGET/src/auth" "$TARGET/src/notes"

  cat > "$TARGET/package.json" <<'EOF'
{
  "name": "notes-fixture",
  "version": "0.1.0",
  "private": true,
  "scripts": { "test": "node src/auth/login.test.js" }
}
EOF

  cat > "$TARGET/src/auth/login.js" <<'EOF'
const { createSession } = require('./session');

// Returns a session token for valid credentials, null otherwise.
function login(users, username, password) {
  const user = users.find((u) => u.username === username);
  if (!user || user.password !== password) return null;
  return createSession(user.id);
}

module.exports = { login };
EOF

  cat > "$TARGET/src/auth/session.js" <<'EOF'
const crypto = require('crypto');

const sessions = new Map();

function createSession(userId) {
  const token = crypto.randomBytes(16).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  return sessions.get(token) || null;
}

function revokeSession(token) {
  return sessions.delete(token);
}

module.exports = { createSession, getSession, revokeSession };
EOF

  cat > "$TARGET/src/auth/login.test.js" <<'EOF'
const assert = require('assert');
const { login } = require('./login');

const users = [{ id: 1, username: 'ada', password: 'pw' }];

assert.ok(login(users, 'ada', 'pw'), 'valid credentials return a token');
assert.strictEqual(login(users, 'ada', 'wrong'), null, 'bad password returns null');
assert.strictEqual(login(users, 'ghost', 'pw'), null, 'unknown user returns null');
console.log('login tests pass');
EOF

  cat > "$TARGET/src/notes/store.js" <<'EOF'
const notes = new Map();
let nextId = 1;

function addNote(userId, text) {
  const id = nextId++;
  notes.set(id, { id, userId, text });
  return id;
}

function getNote(userId, id) {
  const note = notes.get(id);
  return note && note.userId === userId ? note : null;
}

module.exports = { addNote, getNote };
EOF

  cat > "$TARGET/src/notes/notes.js" <<'EOF'
const { getSession } = require('../auth/session');
const store = require('./store');

// All note operations require a valid session token.
function createNote(token, text) {
  const session = getSession(token);
  if (!session) return { error: 'unauthorised' };
  return { id: store.addNote(session.userId, text) };
}

function readNote(token, id) {
  const session = getSession(token);
  if (!session) return { error: 'unauthorised' };
  const note = store.getNote(session.userId, id);
  return note ? { note } : { error: 'not found' };
}

module.exports = { createNote, readNote };
EOF
}

# --- conformant docs/ --------------------------------------------------------
write_docs() {
  mkdir -p "$TARGET/docs/modules/auth/login" "$TARGET/docs/modules/notes"

  cat > "$TARGET/docs/scope.md" <<'EOF'
# Scope

A minimal notes application: users log in and keep private text notes.

## In scope

- Credential login producing a session token
- Session-guarded note create/read
- Per-user note isolation

## Non-goals

- Persistence beyond process memory
- Password hashing (fixture only)
- Any UI

## Success criteria

- A user can log in and create a note
- A user cannot read another user's note
EOF

  cat > "$TARGET/docs/architecture.md" <<'EOF'
# Architecture

Two modules, in-process, no persistence.

## System overview

`auth` owns credentials and sessions. `notes` owns note storage and exposes
session-guarded operations. `notes` consumes only `auth`'s public surface
(`getSession`).

## Software architecture

### auth

Purpose: authenticate users, issue and resolve session tokens.
Data concern: users (caller-supplied), sessions (in-memory map).
Dependencies: none.

### notes

Purpose: session-guarded per-user note CRUD (create/read implemented).
Data concern: notes (in-memory map).
Dependencies: auth (getSession only).
EOF

  cat > "$TARGET/docs/index.md" <<'EOF'
# Project Index

Notes app fixture — two modules.

## Modules

| Module | Status | Integration |
|---|---|---|
| auth | 🚧 | ⏸ |
| notes | 🚧 | ⏸ |

## Build order

See each module's `module-status.md`.
EOF

  cat > "$TARGET/docs/modules/auth/module-status.md" <<'EOF'
# Module: auth

## Build order

1. login — ✓
2. session-revoke — ⏸

## Module integration

Integration: ⏸
Notes: boundary test should assert notes can resolve sessions issued here.

## Module review

Review: ⏸
EOF

  cat > "$TARGET/docs/modules/auth/login/plan.md" <<'EOF'
# Plan: login

## Purpose

Authenticate a username/password pair against a caller-supplied user list and
issue a session token. Does not hash passwords (fixture-scoped non-goal).

## Components

| File | Purpose |
|---|---|
| src/auth/login.js | credential check, delegates token issue |
| src/auth/session.js | session create/get/revoke |

## Testing

- valid credentials → token
- bad password → null
- unknown user → null

Confirmed 2026-08-01
EOF

  cat > "$TARGET/docs/modules/auth/login/status.md" <<'EOF'
# Status: login

✓

## Verification

2026-08-01: node src/auth/login.test.js — 3 assertions pass.

## Next move

(none — complete)
EOF

  cat > "$TARGET/docs/modules/notes/module-status.md" <<'EOF'
# Module: notes

## Build order

1. note-crud — 🚧 (create/read done; update/delete pending)

## Module integration

Integration: ⏸
Notes: boundary test should assert unauthorised tokens are rejected.

## Module review

Review: ⏸
EOF
}

# --- seven seeded drifts in module auth (C8) ---------------------------------
# Each is a genuine inconsistency the reviewer has to find for itself; nothing
# here hands it a pre-written report. The catalogue with expected finding
# classes is in docs/conformance/c8-batch-gate.md.
seed_drift() {
  # D1 — plan claims username-format validation that login.js does not perform.
  #      (inline-reconcile: doc drift)
  # D6 — plan's Components table omits src/auth/tokens.js, which exists.
  #      (inline-reconcile: doc drift)
  cat > "$TARGET/docs/modules/auth/login/plan.md" <<'EOF'
# Plan: login

## Purpose

Validate the username format, authenticate a username/password pair against a
caller-supplied user list, and issue a session token. Does not hash passwords
(fixture-scoped non-goal).

## Components

| File | Purpose |
|---|---|
| src/auth/login.js | username format validation, credential check, delegates token issue |
| src/auth/session.js | session create/get/revoke |

## Testing

- valid credentials → token
- bad password → null
- unknown user → null

Confirmed 2026-08-01
EOF

  # D6 — the undocumented file itself.
  cat > "$TARGET/src/auth/tokens.js" <<'EOF'
// Token formatting helpers, used by session.js.
function format(raw) {
  return `sess_${raw}`;
}

function parse(token) {
  return token.startsWith('sess_') ? token.slice(5) : null;
}

module.exports = { format, parse };
EOF

  # D2 — three different failure shapes across the module surface: login returns
  #      null, revokeSession returns a boolean, renameUser throws.
  #      (route:/b-feature — behavioural change with an acceptance criterion)
  # D5 — session.js reaches into notes' data concern, contradicting
  #      architecture.md's "Dependencies: none" for auth.
  #      (boundary erosion — route:/b-design, never actioned by /b-review)
  cat > "$TARGET/src/auth/session.js" <<'EOF'
const crypto = require('crypto');
const { format, parse } = require('./tokens');
const store = require('../notes/store');

const sessions = new Map();

function createSession(userId) {
  const raw = crypto.randomBytes(16).toString('hex');
  sessions.set(raw, { userId, createdAt: Date.now() });
  return format(raw);
}

function getSession(token) {
  const raw = parse(token);
  return raw ? sessions.get(raw) || null : null;
}

function revokeSession(token) {
  const raw = parse(token);
  return raw ? sessions.delete(raw) : false;
}

// Renaming a user has to rewrite their notes' author label.
function renameUser(userId, name) {
  if (!name) throw new Error('name required');
  store.relabel(userId, name);
}

module.exports = { createSession, getSession, revokeSession, renameUser };
EOF

  cat > "$TARGET/src/notes/store.js" <<'EOF'
const notes = new Map();
const labels = new Map();
let nextId = 1;

function addNote(userId, text) {
  const id = nextId++;
  notes.set(id, { id, userId, text });
  return id;
}

function getNote(userId, id) {
  const note = notes.get(id);
  return note && note.userId === userId ? note : null;
}

function relabel(userId, name) {
  labels.set(userId, name);
}

module.exports = { addNote, getNote, relabel };
EOF

  # D3 — revokeSession, renameUser, and the token helpers have no test at all,
  #      while module-status claims the session lifecycle is covered.
  #      (test-backfill) — the test file stays at its original three assertions.

  # D7 — status.md's verification record is stale: the test file now carries five
  #      assertions, not the three it cites. (verification drift)
  cat >> "$TARGET/src/auth/login.test.js" <<'EOF'

assert.strictEqual(login([], 'ada', 'pw'), null, 'empty user list returns null');
assert.ok(login(users, 'ada', 'pw').startsWith('sess_'), 'tokens carry the sess_ prefix');
console.log('login extra assertions pass');
EOF

  # D4 — session-revoke is marked ⏸ in the build order although revokeSession is
  #      implemented and shipped. (status-fix)
  #      The Review: marker stays ⏸ so /b-review auth starts a fresh review.
  cat > "$TARGET/docs/modules/auth/module-status.md" <<'EOF'
# Module: auth

## Build order

1. login — ✓
2. session-revoke — ⏸

## Module integration

Integration: ⏸
Notes: boundary test should assert notes can resolve sessions issued here; the
session lifecycle (create, resolve, revoke) is covered by the module's tests.

## Module review

Review: ⏸
EOF
}

# --- assemble ----------------------------------------------------------------
case "$KIND" in
  empty)
    : ;;
  brownfield)
    write_code ;;
  bower|drift|pinned)
    write_code; write_docs ;;
esac

[ "$KIND" = "drift" ] && seed_drift

bash "$FRAMEWORK/scripts/scaffold.sh" "$TARGET"

# The scaffold seeds AGENTS.md and CLAUDE.md from the templates. For `pinned` we
# rewind to what a real pre-v0.33 project looks like: no AGENTS.md, no adapter
# trees, a CLAUDE.md the project has grown its own content into, and VERSION
# pinned so /b-upgrade has exactly one version to walk.
if [ "$KIND" = "pinned" ]; then
  rm -rf "$TARGET/_bower" "$TARGET/.claude" "$TARGET/.agents" "$TARGET/.codex" \
         "$TARGET/AGENTS.md" "$TARGET/CLAUDE.md"
  git -C "$FRAMEWORK" archive v0.32 _bower .claude | tar -x -C "$TARGET"
  rm -f "$TARGET"/_bower/project-*
  printf '0.32\n' > "$TARGET/_bower/VERSION"
  printf '%s\n' "$FRAMEWORK" > "$TARGET/_bower/SOURCE"
  cat > "$TARGET/CLAUDE.md" <<'EOF'
# Notes fixture

@_bower/framework.md

## Project-Specific Code Standards

- CommonJS only; no build step. `node src/auth/login.test.js` is the whole test suite.
- Errors are returned as `{ error: '<reason>' }`, never thrown across a module boundary.
- No dependencies outside the Node standard library.
EOF
fi

git -C "$TARGET" add -A
git -C "$TARGET" commit -q -m "$KIND fixture"

echo
echo "Fixture ready: $TARGET"
echo "  kind:      $KIND"
echo "  version:   $(cat "$TARGET/_bower/VERSION" 2>/dev/null || echo '(none)')"
echo "  tree:      $([ -z "$(git -C "$TARGET" status --porcelain)" ] && echo clean || echo DIRTY)"
if [ "$KIND" = "drift" ]; then
  echo "  drifts:    7 seeded in module auth — catalogue in docs/conformance/c8-batch-gate.md"
fi
if [ "$KIND" = "pinned" ]; then
  echo "  pinned to: v0.32 footprint, SOURCE=$FRAMEWORK (clone is local, no network)"
fi
echo
echo "Codex needs to trust this path before it can see anything Bower ships."
echo "Delete the fixture when the run is scored."
