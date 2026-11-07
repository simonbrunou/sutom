#!/usr/bin/env bash
# Check that a PR leaves graphify-out/ out of its diff, or changes it only in
# a refresh, committed alone and last on the branch (#178). AGENTS.md,
# `## graphify`, sets the rule: feature and fix PRs leave graphify-out/ out,
# and a refresh by scripts/refresh-graph.sh lands as the last commit of a PR
# about the graph. CI runs this on every pull_request to main, and a local
# run with neither variable set gives CI's answer once origin/main is fetched.
#
#   scripts/check-graph-diff.sh [<checkout>]
#
#   GRAPH_CHECK_BASE  the branch the PR merges into, default origin/main.
#     CI sets origin/<the PR's base branch>.
#   GRAPH_CHECK_HEAD  the PR's head commit, default HEAD. CI sets the
#     event's pull_request.head.sha, so the check never reads a merge
#     commit the runner made in place of the head.
#
# <checkout> defaults to the one holding this script; any directory inside a
# checkout works. The check lists the files that changed under graphify-out/
# from the merge base of the base and the head to the head, with rename
# detection off, so a renamed file lists its old path and its new one. A
# file moved out of graphify-out/ counts as a change to it. With none, it
# passes. Otherwise it passes only when the head commit is a refresh:
#   1. it has one parent and changes no file outside graphify-out/;
#   2. its graphify-out/graph.json names the full id of that parent as
#      built_at_commit;
#   3. the first line of its graphify-out/GRAPH_REPORT.md starts with
#      "# Graph Report - sutom ", the title scripts/refresh-graph.sh checks.
# It reads both files from the head commit, never from the working tree,
# and writes nothing. It cannot tell a PR about the graph from a feature PR
# whose last commit is a refresh (#134's shape): review has to catch that.
#
# Exit 0: nothing under graphify-out/ changed, or the head commit passes 1 to
# 3; it prints one line naming the merge base and the head. Exit 1: the head
# commit fails a condition; the check names each failed condition, lists the
# graphify-out/ paths in the diff and says how to fix the branch. Exit 2: a
# wrong call, a <checkout> outside a git checkout, a base or head that names
# no commit, a base and head with no merge base, or git failing to diff them.
# scripts/check-graph-diff.test.ts runs it on throwaway git repos, one
# failure class per test.
set -uo pipefail

OUT=graphify-out
GRAPH="$OUT/graph.json"
REPORT="$OUT/GRAPH_REPORT.md"
TITLE='# Graph Report - sutom '

usage() {
  echo "usage: [GRAPH_CHECK_BASE=<rev>] [GRAPH_CHECK_HEAD=<rev>] scripts/check-graph-diff.sh [<checkout>]" >&2
  exit 2
}

case "${1:-}" in -*) usage ;; esac
[ $# -le 1 ] || usage

dir="${1:-$(dirname "$0")/..}"
ROOT=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || {
  echo "check-graph-diff: $dir is not in a git checkout" >&2
  exit 2
}
# Pathspecs below are relative to the top of the checkout.
cd "$ROOT" || exit 2

base_ref="${GRAPH_CHECK_BASE:-origin/main}"
head_ref="${GRAPH_CHECK_HEAD:-HEAD}"

commit_of() {
  git rev-parse --verify --quiet --end-of-options "$1^{commit}"
}

base=$(commit_of "$base_ref") || {
  echo "check-graph-diff: the base $base_ref (GRAPH_CHECK_BASE) names no commit: run \`git fetch origin\`, or set GRAPH_CHECK_BASE" >&2
  exit 2
}
head=$(commit_of "$head_ref") || {
  echo "check-graph-diff: the head $head_ref (GRAPH_CHECK_HEAD) names no commit" >&2
  exit 2
}
mb=$(git merge-base "$base" "$head") || {
  echo "check-graph-diff: $base_ref and $head_ref have no merge base" >&2
  exit 2
}

# names <from> <to> <pathspec>...: the files that changed, one per line.
names() {
  local from=$1 to=$2
  shift 2
  git -c core.quotePath=false diff --name-only --no-renames "$from" "$to" -- "$@" || {
    echo "check-graph-diff: git diff ${from:0:12} ${to:0:12} failed" >&2
    exit 2
  }
}

paths=$(names "$mb" "$head" "$OUT") || exit 2
if [ -z "$paths" ]; then
  echo "check-graph-diff: no change under $OUT/ from ${mb:0:12} (the merge base with $base_ref) to ${head:0:12}"
  exit 0
fi

fails=()
read -r -a ids <<<"$(git rev-list --parents -n 1 "$head")"
parent=
if [ "${#ids[@]}" -eq 2 ]; then
  parent=${ids[1]}
else
  fails+=("1. ${head:0:12} has $((${#ids[@]} - 1)) parents, not one: a refresh is a commit of its own, so after a merge run scripts/refresh-graph.sh again and commit its output last")
fi

if [ -n "$parent" ]; then
  outside=$(names "$parent" "$head" . ":(exclude)$OUT") || exit 2
  if [ -n "$outside" ]; then
    fails+=("1. ${head:0:12} also changes files outside $OUT/:"$'\n'"$(printf '%s\n' "$outside" | sed 's/^/     /')")
  fi

  if git cat-file -e "$head:$GRAPH" 2>/dev/null; then
    built=$(git cat-file blob "$head:$GRAPH" | sed -n 's/.*"built_at_commit": *"\([0-9a-f]*\)".*/\1/p')
    if [ "$built" != "$parent" ]; then
      fails+=("2. $GRAPH in ${head:0:12} names built_at_commit \"$built\", not its parent $parent")
    fi
  else
    fails+=("2. ${head:0:12} has no $GRAPH, so it names no built_at_commit")
  fi
fi

if git cat-file -e "$head:$REPORT" 2>/dev/null; then
  title=$(git cat-file blob "$head:$REPORT" | sed -n 1p)
  case "$title" in
    "$TITLE"*) ;;
    *) fails+=("3. $REPORT in ${head:0:12} starts with \"$title\", not \"$TITLE\"") ;;
  esac
else
  fails+=("3. ${head:0:12} has no $REPORT")
fi

if [ "${#fails[@]}" -eq 0 ]; then
  echo "check-graph-diff: from ${mb:0:12} (the merge base with $base_ref) to ${head:0:12}, $OUT/ changes only in the last commit, a refresh built from its parent ${parent:0:12} and titled sutom"
  exit 0
fi

{
  echo "check-graph-diff: from ${mb:0:12} (the merge base with $base_ref) to ${head:0:12}, the diff changes $OUT/, and the last commit is no refresh by scripts/refresh-graph.sh:"
  printf '  %s\n' "${fails[@]}"
  echo "  $OUT/ paths in the diff:"
  printf '%s\n' "$paths" | sed 's/^/     /'
  echo "  Fix: drop them (git restore --source=$mb --staged --worktree -- $OUT, then commit), or, on a PR about the graph, run scripts/refresh-graph.sh once every other change is committed and commit its output alone, last on the branch (AGENTS.md, \`## graphify\`)."
} >&2
exit 1
