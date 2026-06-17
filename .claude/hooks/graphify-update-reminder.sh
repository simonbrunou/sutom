#!/usr/bin/env bash
# PostToolUse(Edit|Write|MultiEdit): remind to refresh the graphify graph after src edits.
# CLAUDE.md's "run `graphify update .` after modifying code" rule is otherwise purely manual.
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$path" in
  */src/*|src/*)
    [ -f graphify-out/graph.json ] && jq -n '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:"graphify: src/ changed. Per CLAUDE.md, run `graphify update .` before finishing (AST-only, no API cost) to keep graphify-out/ current."}}'
    ;;
esac
exit 0
