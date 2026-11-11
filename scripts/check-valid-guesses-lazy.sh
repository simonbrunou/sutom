#!/usr/bin/env bash
# Check that the home page loads no file holding the valid-guesses list
# (#232). src/lib/valid-guesses.txt (697 kB) loads through a dynamic import()
# in src/lib/words.ts (loadValidGuesses), as a chunk of its own that the home
# page fetches after its first render (#195). build.chunkSizeWarningLimit in
# vite.config.ts is 750 kB, so a static import of the list would put it back
# in the home page node chunk (about 741 kB) and the build would print no
# warning. CI runs this right after `npm run build`. The check reads no
# variable, so a local run after `npm run build` gives CI's answer.
#
#   scripts/check-valid-guesses-lazy.sh [<repo dir>]
#
# <repo dir> defaults to the checkout holding this script. The check reads
# <repo dir>/build/ and the two word lists in <repo dir>/src/lib/, and writes
# nothing. It reads only build/index.html, the home page: 404.html, the SPA
# fallback, loads no page node up front.
#
# The marker is ABACULE, a word found only in valid-guesses.txt. A file holds
# the list when its text contains the marker anywhere, not only as a line of
# its own, so a bundle that writes the list as a one-line string with \n
# escapes matches as well as one that writes a template literal with real
# newlines. Rules, in order:
#   1. The marker is a line of src/lib/valid-guesses.txt.
#   2. The marker appears nowhere in src/lib/dictionary.txt, not even inside
#      a longer word: the home page loads the answer words up front, so such
#      a word would put the marker in its chunk on a healthy build.
#   3. build/index.html exists.
#   4. Some file under build/ contains the marker. Otherwise the list is
#      missing from the build, and the check would pass by reading nothing.
#   5. The files the home page loads up front are build/index.html itself
#      and each path it mentions that starts at `_app/`, SvelteKit's default
#      appDir, and runs to the first quote, backtick, blank, > or ).
#      The check reads every such path wherever it sits in the file, whatever
#      precedes `_app/` (./, /, a base path) and whatever tag or call holds
#      it: today the <link rel="modulepreload"> hrefs, the two import() calls
#      of the inline script and the stylesheet links. index.html must name at
#      least one such path. A file it names outside `_app/` goes unread:
#      SvelteKit writes every chunk and stylesheet under its appDir, and the
#      other local files index.html links today are the three favicons,
#      images copied from static/.
#   6. Each of those paths names a regular file at build/<path>. A path that
#      names none fails; it is never skipped.
#   7. None of those files contains the marker.
# For 1, 2 and 7, a file the check cannot read fails too. The check reads no
# import inside a chunk: SvelteKit names in index.html every chunk of the
# static import graph of its entry and of the home page node, so a static
# import of the list puts it in a file index.html names (#232 proved it with
# a `?raw` import in words.ts, which index.html then named in nodes/2.*.js).
#
# Exit 0: rules 1 to 7 hold; it prints one line naming the number of files
# read. Exit 1: rule 7 fails; it names each file that contains the marker,
# even when grep could not read another. Exit 2: a wrong call, a <repo dir>
# that is no directory, rule 1 to 6 failing, or, with no file holding the
# marker, a file rule 7 reads that grep cannot read; the message names the
# cause. When rule 1 or 2 fails, pick another
# marker found only in valid-guesses.txt and set it as MARKER below.
# scripts/check-valid-guesses-lazy.test.ts runs it on throwaway trees, one
# failure class per test.
set -uo pipefail
export LC_ALL=C

MARKER=ABACULE
# A path in index.html runs from `_app/` to the first character of this set.
PATH_RE=$'_app/[^"\'`[:space:]>)]*'
NAME=check-valid-guesses-lazy

usage() {
  echo "usage: scripts/check-valid-guesses-lazy.sh [<repo dir>]" >&2
  exit 2
}

fail() {
  echo "$NAME: $*" >&2
  exit 2
}

case "${1:-}" in -*) usage ;; esac
[ $# -le 1 ] || usage

dir=$(cd "${1:-$(dirname "$0")/..}" 2>/dev/null && pwd) || fail "${1:-} is not a directory"
BUILD="$dir/build"
INDEX="$BUILD/index.html"
GUESSES="$dir/src/lib/valid-guesses.txt"
DICTIONARY="$dir/src/lib/dictionary.txt"
PICK="pick another word found only in src/lib/valid-guesses.txt, and in no word of src/lib/dictionary.txt, and set it as MARKER in scripts/check-valid-guesses-lazy.sh"

# 1.
grep -qxF -- "$MARKER" "$GUESSES" 2>/dev/null
case $? in
  0) ;;
  1) fail "the marker $MARKER is not a line of src/lib/valid-guesses.txt: $PICK" ;;
  *) fail "cannot read src/lib/valid-guesses.txt" ;;
esac

# 2.
grep -qF -- "$MARKER" "$DICTIONARY" 2>/dev/null
case $? in
  1) ;;
  0) fail "the marker $MARKER appears in src/lib/dictionary.txt, whose words the home page loads up front: $PICK" ;;
  *) fail "cannot read src/lib/dictionary.txt" ;;
esac

# 3.
[ -f "$INDEX" ] || fail "build/index.html is missing: run \`npm run build\` first"

# 4.
grep -rqF -- "$MARKER" "$BUILD" 2>/dev/null ||
  fail "no file under build/ contains the marker $MARKER, so the valid-guesses list is missing from the build: run \`npm run build\` first"

# 5.
mapfile -t paths < <(grep -oE -- "$PATH_RE" "$INDEX" | sort -u)
[ "${#paths[@]}" -gt 0 ] ||
  fail "build/index.html names no file under _app/ to load up front: if SvelteKit's appDir changed, change \`_app/\` in PATH_RE"

# 6.
files=("$INDEX")
missing=()
for p in "${paths[@]}"; do
  if [ -f "$BUILD/$p" ]; then
    files+=("$BUILD/$p")
  else
    missing+=("$p")
  fi
done
if [ "${#missing[@]}" -gt 0 ]; then
  {
    echo "$NAME: build/index.html names paths that name no file under build/:"
    printf '  %s\n' "${missing[@]}"
  } >&2
  exit 2
fi

# 7.
hits=$(grep -lF -- "$MARKER" "${files[@]}")
rc=$?
if [ -n "$hits" ]; then
  {
    echo "$NAME: the valid-guesses list is back on the home page's load path (#195). These files, which build/index.html loads up front, contain $MARKER, a word found only in src/lib/valid-guesses.txt:"
    while IFS= read -r f; do echo "  ${f#"$dir"/}"; done <<<"$hits"
    echo "Load the list only through loadValidGuesses in src/lib/words.ts, whose dynamic import() keeps it in a chunk of its own."
  } >&2
  exit 1
fi
# grep exits 1 when it read every file and found no marker, 2 when it could
# not read one.
[ "$rc" -eq 1 ] || fail "grep could not read every file build/index.html names (grep exit $rc)"
echo "$NAME: build/index.html and the ${#paths[@]} files it names under build/_app/ hold no $MARKER: the valid-guesses list stays off the home page's load path"
