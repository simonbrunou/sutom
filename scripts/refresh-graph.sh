#!/usr/bin/env bash
# Refresh the tracked graphify graph in graphify-out/ (#172), from any
# checkout of sutom, a T3 worktree included.
#
#   scripts/refresh-graph.sh [--force] [<checkout>]
#
# <checkout> defaults to the one holding this script. Run it only on a branch
# about the graph, once every other change is committed, and commit its output
# alone, last on the branch: graph.json's built_at_commit then names the
# commit before it. Feature and fix PRs leave graphify-out/ out of their diff
# (AGENTS.md, `## graphify`).
#
# graphify titles GRAPH_REPORT.md with the name of the directory it updates,
# so `graphify update .` in a worktree named t3-issue-172-... writes that
# name. This script hands graphify an absolute path through a symlink named
# sutom that points at the checkout, which writes the same graph as a run in a
# clone named sutom. --force goes on to graphify, which otherwise refuses to
# replace graph.json with a rebuild that has fewer nodes.
#
# Next to the graph, graphify writes per-clone files that .gitignore keeps out
# of git: cache/, .graphify_build_state.json, .graphify_labels.pending.json
# and .graphify_root. The script deletes .graphify_build_state.json first:
# when it matches the checkout, as it does after a stray `graphify update .`,
# graphify skips the rebuild and keeps that run's report and title. It deletes
# .graphify_root last: it names the symlink, which is gone once the script
# exits, and a bare `graphify update` would read that path and fail.
#
# Exit 0: the report is titled sutom and graphify-out/ holds no file that git
# neither tracks nor ignores. Exit 1: a file outside graphify-out/ has
# uncommitted changes, graphify failed, the report has another title, or
# graphify wrote a file git neither tracks nor ignores (track it, or add it to
# the graphify block of .gitignore). Exit 2: a wrong call, a <checkout> that
# is not the top of a git checkout, or no graphify on PATH.
# scripts/refresh-graph.test.ts runs it against a stub graphify.
set -uo pipefail

NAME=sutom
OUT=graphify-out
REPORT="$OUT/GRAPH_REPORT.md"

usage() {
  echo "usage: scripts/refresh-graph.sh [--force] [<checkout>]" >&2
  exit 2
}

force=
if [ "${1:-}" = --force ]; then
  force=--force
  shift
fi
case "${1:-}" in -*) usage ;; esac
[ $# -le 1 ] || usage

dir="${1:-$(dirname "$0")/..}"
ROOT=$(cd "$dir" 2>/dev/null && pwd -P) || {
  echo "refresh-graph: no directory $dir" >&2
  exit 2
}
top=$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null)
if [ "$top" != "$ROOT" ]; then
  echo "refresh-graph: $ROOT is not the top of a git checkout" >&2
  exit 2
fi
if ! command -v graphify >/dev/null 2>&1; then
  echo "refresh-graph: needs graphify on PATH" >&2
  exit 2
fi
cd "$ROOT" || exit 2

# graph.json records HEAD as the commit it was built from.
dirty=$(git status --porcelain --untracked-files=all -- . ":(exclude)$OUT")
if [ -n "$dirty" ]; then
  echo "refresh-graph: commit these changes first, so the graph is built from HEAD:" >&2
  printf '%s\n' "$dirty" | sed 's/^/  /' >&2
  exit 1
fi

tmp=$(mktemp -d) || exit 1
cleanup() {
  rm -f "$tmp/$NAME"
  rmdir "$tmp"
}
trap cleanup EXIT
ln -s "$ROOT" "$tmp/$NAME" || exit 1

rm -f "$OUT/.graphify_build_state.json"
if ! graphify update $force "$tmp/$NAME"; then
  echo "refresh-graph: graphify update failed" >&2
  exit 1
fi
rm -f "$OUT/.graphify_root"

status=0
title=$(head -n 1 "$REPORT" 2>/dev/null)
case "$title" in
  "# Graph Report - $NAME "*) ;;
  *)
    echo "refresh-graph: $REPORT starts with \"$title\", not \"# Graph Report - $NAME\"" >&2
    status=1
    ;;
esac
untracked=$(git status --porcelain --untracked-files=all -- "$OUT" | sed -n 's/^?? //p')
if [ -n "$untracked" ]; then
  echo "refresh-graph: graphify wrote files git neither tracks nor ignores; track each one, or add it to the graphify block of .gitignore:" >&2
  printf '%s\n' "$untracked" | sed 's/^/  /' >&2
  status=1
fi
[ "$status" -eq 0 ] || exit 1

echo "refresh-graph: $OUT/ rebuilt from $(git rev-parse --short HEAD) and titled $NAME. Commit it alone, last on the branch."
