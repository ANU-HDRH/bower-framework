#!/usr/bin/env bash
#
# run-codex.sh — run one scriptable conformance step through `codex exec` and
# record the evidence a runs.md row needs.
#
# Usage: bash tools/conformance/run-codex.sh <id> <fixture-dir> <sandbox> <prompt>
#
#   id        Evidence stem, e.g. c3-core. Files land in <fixture>/../evidence/.
#   sandbox   read-only | workspace-write | danger-full-access
#             (the *parent* permission mode — C7 varies it deliberately)
#   prompt    The invoking message, e.g. '$b-feature add a logout endpoint …'
#
# Environment:
#   CODEX_MODEL   model to run (default gpt-5.6-luna — the weakest supported
#                 model, which is the one worth testing gates against)
#   CODEX_EFFORT  reasoning effort (default medium)
#
# Writes, per run:
#   <id>.jsonl      full event stream (--json). This is where delegation is
#                   verifiable: grep for collab_tool_call / spawn_agent.
#   <id>.last.md    the final assistant message — the gate text, usually
#   <id>.err.log    stderr
#   <id>.verdict.txt  exit code, and the porcelain diff of the fixture tree
#
# The porcelain diff is the load-bearing artifact for every gate scenario: a
# clean diff at a gate is the zero-writes criterion. The script does NOT restore
# writes — a scenario that got as far as writing needs its tree inspected before
# anyone resets it. Reset with `git -C <fixture> checkout -- . && git -C
# <fixture> clean -fd` when you are done scoring.
#
# Non-interactive by construction: there is nobody to answer a gate, which is
# exactly the point. A run that ends at the gate with an empty porcelain diff is
# the strongest form of the gate evidence, because the model had every incentive
# to proceed and no way to get an answer.

set -uo pipefail

[ $# -eq 4 ] || { sed -n '3,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 1; }

ID="$1"; FIXTURE="$(cd "$2" && pwd)"; SANDBOX="$3"; PROMPT="$4"
MODEL="${CODEX_MODEL:-gpt-5.6-luna}"
EFFORT="${CODEX_EFFORT:-medium}"

EVIDENCE="$(dirname "$FIXTURE")/evidence"
mkdir -p "$EVIDENCE"

command -v codex >/dev/null || { echo "run-codex: codex CLI not on PATH" >&2; exit 1; }

echo "=== $ID"
echo "    fixture $FIXTURE"
echo "    model   $MODEL ($EFFORT), sandbox $SANDBOX"
echo "    prompt  $PROMPT"

BEFORE="$(git -C "$FIXTURE" status --porcelain)"

codex exec --json -s "$SANDBOX" -C "$FIXTURE" -m "$MODEL" -c "model_reasoning_effort=$EFFORT" \
  -o "$EVIDENCE/$ID.last.md" "$PROMPT" \
  > "$EVIDENCE/$ID.jsonl" 2> "$EVIDENCE/$ID.err.log"
RC=$?

AFTER="$(git -C "$FIXTURE" status --porcelain)"

{
  echo "id: $ID"
  echo "codex: $(codex --version 2>/dev/null)"
  echo "model: $MODEL ($EFFORT)"
  echo "sandbox: $SANDBOX"
  echo "prompt: $PROMPT"
  echo "exit: $RC"
  echo "tree-changed: $([ "$BEFORE" = "$AFTER" ] && echo no || echo YES)"
  if [ "$BEFORE" != "$AFTER" ]; then
    echo "--- porcelain diff ---"
    diff <(echo "$BEFORE") <(echo "$AFTER") || true
  fi
  echo "--- delegation events ---"
  grep -o '"[a-z_]*collab[a-z_]*"\|spawn_agent\|"wait"' "$EVIDENCE/$ID.jsonl" 2>/dev/null | sort | uniq -c || echo "(none)"
} > "$EVIDENCE/$ID.verdict.txt"

cat "$EVIDENCE/$ID.verdict.txt"
echo "--- final message (head) ---"
head -c 2000 "$EVIDENCE/$ID.last.md" 2>/dev/null; echo
echo
echo "Evidence: $EVIDENCE/$ID.*"
