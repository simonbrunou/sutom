#!/usr/bin/env bash
# Lint every tracked bash script with ShellCheck (#214). The checks come from
# .shellcheckrc at the top of the checkout, the one place to enable or disable
# one: it enables check-extra-masked-returns, which flags a command whose exit
# status the script never sees, such as the `done < <(awk ...)` of #211. CI
# runs this on every PR and push to main, after installing its pinned
# ShellCheck; the dev shell (`nix develop`) puts shellcheck on PATH for a
# local run, which then gives CI's answer for the committed and staged files.
#
#   scripts/lint-shell.sh [<checkout>]
#
# <checkout> defaults to the one holding this script; any directory inside a
# checkout works. The lint reads the first line of each file `git ls-files`
# lists, so a file it lints needs no list: a new script counts once it is
# staged, and an untracked one is never read. By that first line:
#   - `#!/usr/bin/env bash`, the one shebang the repo's scripts use: linted.
#   - any other `#!` line naming a shell (bash, sh, dash, ash, ksh, mksh, zsh,
#     busybox), such as `#!/bin/bash`, `#!/usr/bin/env -S bash -e`, a CRLF
#     line end or `#!/bin/sh`: refused, naming the file and its line. Give
#     the script the shebang above, or teach this lint the new form.
#   - any other `#!` line, such as `#!/usr/bin/env node`: skipped.
#   - no `#!` line: skipped, unless the name ends in .sh, which is refused.
#     .envrc, which direnv sources, has none and is skipped.
# It runs `shellcheck --rcfile .shellcheckrc -f gcc` on the linted files from
# the top of the checkout, so each finding prints as
# `<path>:<line>:<col>: <level>: <message> [SCxxxx]`. Silence one finding with
# a `# shellcheck disable=SCxxxx` directive on its command, with a comment
# saying why.
#
# Exit 0: no finding; it prints one line naming the number of scripts linted.
# Exit 1: ShellCheck reported findings, which it printed. Exit 2: a wrong
# call, a <checkout> outside a git checkout, no shellcheck on PATH, no
# .shellcheckrc, git failing to list the files, a listed file it cannot read,
# a refused file, no bash script to lint, or ShellCheck failing other than
# with findings. scripts/lint-shell.test.ts runs it on throwaway git repos,
# one failure class per test.
set -uo pipefail
export LC_ALL=C

NAME=lint-shell
SHEBANG='#!/usr/bin/env bash'
# A word naming a shell, between `/` or a blank and a blank or the line end.
SHELL_RE='(^|[/[:space:]])(bash|sh|dash|ash|ksh|mksh|zsh|busybox)([[:space:]]|$)'

usage() {
  echo "usage: scripts/lint-shell.sh [<checkout>]" >&2
  exit 2
}

fail() {
  echo "$NAME: $*" >&2
  exit 2
}

case "${1:-}" in -*) usage ;; esac
[ $# -le 1 ] || usage

dir="${1:-$(dirname "$0")/..}"
ROOT=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null) || fail "$dir is not in a git checkout"
cd "$ROOT" || exit 2

command -v shellcheck >/dev/null ||
  fail "no shellcheck on PATH: enter the dev shell (\`nix develop\`, or direnv), which provides it"
[ -f .shellcheckrc ] || fail "no .shellcheckrc at the top of $ROOT: the lint reads its checks from there"

# git ls-files -z goes through a file: a command substitution drops the NULs,
# and a process substitution would hide git's exit status.
list=$(mktemp) || fail "mktemp cannot create a file for the list of tracked files"
trap 'rm -f -- "$list"' EXIT
git ls-files -z >"$list" || fail "git ls-files cannot list the tracked files"
mapfile -d '' -t tracked <"$list"

scripts=()
refused=()
for f in "${tracked[@]}"; do
  line=
  # -n 256 bounds the read on a file whose first line is long, such as a
  # minified JSON file; Linux reads no more of a shebang line either.
  { IFS= read -r -n 256 line || :; } <"$f" || fail "cannot read $f, which git ls-files lists"
  if [ "$line" = "$SHEBANG" ]; then
    scripts+=("$f")
  elif [[ $line == '#!'* ]]; then
    if [[ ${line#'#!'} =~ $SHELL_RE ]]; then
      refused+=("$f: a shell shebang this lint does not read, $(printf %q "$line"): use \`$SHEBANG\`, or teach scripts/lint-shell.sh the new form")
    fi
  elif [[ $f == *.sh ]]; then
    refused+=("$f: a .sh file with no shebang: start it with \`$SHEBANG\`")
  fi
done

if [ "${#refused[@]}" -gt 0 ]; then
  {
    echo "$NAME: these tracked files are shell scripts it cannot classify, so it lints none:"
    printf '  %s\n' "${refused[@]}"
  } >&2
  exit 2
fi
[ "${#scripts[@]}" -gt 0 ] ||
  fail "no tracked file starts with \`$SHEBANG\`, so there is nothing to lint"

shellcheck --rcfile .shellcheckrc -f gcc -- "${scripts[@]}"
rc=$?
case $rc in
  0) echo "$NAME: ${#scripts[@]} bash scripts pass ShellCheck with .shellcheckrc" ;;
  1) exit 1 ;;
  *) fail "shellcheck failed with exit $rc, not with findings" ;;
esac
