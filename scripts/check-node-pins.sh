#!/usr/bin/env bash
# Check that CI and the production build read one Node version (#168): the
# Node of both comes from .nvmrc, and the Node types name the same major. CI
# runs this script before `npm ci`, so a local run runs the same check.
#
#   scripts/check-node-pins.sh [<repo dir>]
#
# It reads:
#   .nvmrc  the one pin. CI's actions/setup-node reads it through
#     `node-version-file`, and railpack, which builds production on Coolify,
#     reads it when package.json sets no engines.node or devEngines.runtime.
#     It must hold one version line (24, v24, 24.12.0) and nothing else: an
#     alias such as lts/*, a comment or a second line fails, since setup-node
#     and railpack could read those differently.
#   .forgejo/workflows/*.yml and *.yaml  every actions/setup-node step must
#     read `node-version-file: .nvmrc` and set no `node-version`, which
#     setup-node prefers over the file. A `node-version` anywhere else in a
#     workflow (a matrix, an env:) fails too. The step and its `with:` must
#     be block mappings, `uses:` before `with:`, as in this repo's ci.yml (an
#     anchor or a tag may name the `with:`); the inputs are the keys at the
#     indentation of the first line under `with:`, and the body of a block
#     scalar (run: |) is skipped. A step or `with:` in flow style
#     (with: { node-version-file: .nvmrc }) fails, and so does any line that
#     names actions/setup-node@ outside its comment and outside a `uses:`
#     this reader opens a step on. So does, anywhere in a workflow, an
#     escape in a double-quoted string ("node\x2dversion"), an alias
#     (*name), an explicit key (? ) or a quoted string that runs onto the
#     next line, which can spell a key or a value as other text: reading
#     those would take a YAML parser.
#   package.json  the major of each `@types/node` range (24 out of ^24.0.0),
#     in devDependencies or dependencies; one of them must list it. Railpack
#     reads `engines.node` and `devEngines.runtime` before .nvmrc, so an
#     engines.node is read as one more pin, and a devEngines.runtime fails.
# Railpack also reads a RAILPACK_NODE_VERSION variable before all of these,
# set on the Coolify app, which this check cannot see. The Node.js group in
# renovate.json moves .nvmrc and @types/node together. The dev shell's Node
# comes from flake.nix, which Renovate does not update, so a `node --version`
# with another major prints a warning only.
# Exit 0: every setup-node step reads .nvmrc and every pin reads the same
# major. Exit 1: a workflow hardcodes node-version, the pins differ, or one
# cannot be read, and the output names each file, line and value. Exit 2: a
# wrong call, a <repo dir> that does not exist, or no node on PATH.
# scripts/check-node-pins.test.ts runs it on edited copies of these files,
# one failure class per test: add a test there when the parsing changes.
set -uo pipefail

if [ $# -gt 1 ]; then
  echo "usage: scripts/check-node-pins.sh [<repo dir>]" >&2
  exit 2
fi
ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
if [ ! -d "$ROOT" ]; then
  echo "check-node-pins: no directory $ROOT" >&2
  exit 2
fi
# It parses package.json with node, so in CI it runs after setup-node.
if ! command -v node >/dev/null 2>&1; then
  echo "check-node-pins: needs node on PATH" >&2
  exit 2
fi

NVMRC=.nvmrc
WORKFLOWS=.forgejo/workflows
PACKAGE=package.json

# One major, as a Node version or an npm range: 24, v24, 24.x, 24.12.0,
# ^24.12.4, ~24.1.0. A range that spans majors (>=24, ^24 || ^26) or names
# none (lts/*, *, latest) does not match. The pattern sits in a variable
# because bash drops the backslash of a `[\^~]` written inline, which turns
# the class into "not ~".
ONE_MAJOR='^[~^]?v?([0-9]+)(\.([0-9]+|x|\*)){0,2}(-[0-9A-Za-z.-]+)?$'

# One entry per pin: where it is, the major it reads, and the text it read.
where=()
major=()
shown=()
status=0

pin() {
  where+=("$1")
  major+=("$2")
  shown+=("$3")
}

fail() {
  echo "check-node-pins: $1" >&2
  status=1
}

read_nvmrc() {
  local file="$ROOT/$NVMRC" value
  if [ ! -f "$file" ]; then
    fail "$NVMRC not found"
    return
  fi
  value=$(sed -e 's/\r$//' "$file")
  # Trim the blanks around the version, newlines included.
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [ -z "$value" ]; then
    fail "$NVMRC is empty"
  elif [[ "$value" == *$'\n'* ]]; then
    fail "$NVMRC holds more than one line, which setup-node and railpack may read differently"
  elif [[ "$value" =~ ^v?([0-9]+)(\.[0-9]+){0,2}$ ]]; then
    pin "$NVMRC" "${BASH_REMATCH[1]}" "$value"
  else
    fail "$NVMRC '$value' is not a Node version such as 24 or 24.12.0"
  fi
}

# Check the actions/setup-node steps of one workflow file.
read_workflow() {
  local rel="$1" kind line value
  while read -r kind line value; do
    case "$kind" in
      step) steps=$((steps + 1)) ;;
      file)
        if [ "$value" != "$NVMRC" ] && [ "$value" != "./$NVMRC" ]; then
          fail "$rel:$line node-version-file '$value' is not $NVMRC"
        fi
        ;;
      pin) fail "$rel:$line actions/setup-node step hardcodes node-version '$value': read $NVMRC with node-version-file instead" ;;
      nopin) fail "$rel:$line actions/setup-node step reads no node-version-file: $NVMRC" ;;
      twice) fail "$rel:$line actions/setup-node step sets $value twice" ;;
      stray) fail "$rel:$line hardcodes node-version outside an actions/setup-node input: $value" ;;
      escape) fail "$rel:$line holds an escape in a double-quoted string, which this check cannot read" ;;
      alias) fail "$rel:$line uses a YAML alias, which this check cannot read" ;;
      explicit) fail "$rel:$line uses a YAML explicit key (?), which this check cannot read" ;;
      unclosed) fail "$rel:$line leaves a quoted string open onto the next line, which this check cannot read" ;;
      unread)
        steps=$((steps + 1))
        fail "$rel:$line actions/setup-node step is not written as a block mapping, which this check cannot read"
        ;;
      flow)
        steps=$((steps + 1))
        fail "$rel:$line actions/setup-node step does not write with: as a block mapping, which this check cannot read"
        ;;
    esac
  done < <(awk -v q="'" '
    BEGIN {
      body = -1
      # The two input keys, plain or quoted. `node-version` does not match
      # the start of `node-version-file`, since the colon must follow.
      NV = "^[ \t]*(node-version|\"node-version\"|" q "node-version" q ")[ \t]*:"
      NVF = "^[ \t]*(node-version-file|\"node-version-file\"|" q "node-version-file" q ")[ \t]*:"
    }
    function indent(s) { match(s, /^ */); return RLENGTH }
    # A step reports once it ends, so an input read later in its with:
    # block still counts: `step`, then `pin` for a node-version, which
    # setup-node prefers over the file, `file` for a node-version-file, and
    # `nopin` for neither.
    function close_step() {
      if (open) {
        print "step", open
        if (nv) print "pin", nv, nvval
        if (nvf) print "file", nvf, nvfval
        else if (!nv) print "nopin", open
      }
      open = 0; inwith = 0; nv = 0; nvf = 0
    }
    # The value of a YAML scalar: the text inside its quotes, or a plain
    # scalar up to a comment (a # after a blank). A quote that never closes,
    # or text after the closing quote, comes back as written, so it fails.
    function scalar(s,   c, i, rest) {
      sub(/^[ \t]+/, "", s)
      c = substr(s, 1, 1)
      if (c == "\"" || c == q) {
        i = index(substr(s, 2), c)
        if (!i) return s
        rest = substr(s, i + 2)
        if (rest !~ /^[ \t]*(#.*)?$/) return s
        return substr(s, 2, i - 1)
      }
      if (s ~ /^#/) return ""
      sub(/[ \t]+#.*$/, "", s)
      sub(/[ \t]+$/, "", s)
      return s
    }
    function value(s) {
      sub(/^[^:]*:/, "", s)
      return scalar(s)
    }
    function trimmed(s) {
      sub(/^[ \t]+/, "", s)
      return s
    }
    # Read one line as YAML does, far enough to drop its comment and to see
    # the forms that spell a key or a value as other text than the line
    # shows: an escape in a double-quoted string ("node\x2dversion"), an
    # alias (*name) and an explicit key (? ). A quote, a * or a ? is syntax
    # only where a node starts: at the line start, after `- `, `? ` or `: `,
    # after a tag or an anchor, and in a flow collection after [, { or ,.
    # Anywhere else, as in run: echo "a\b" or a double quote inside a
    # single-quoted string, it is text. Sets code (the line without its
    # comment), escape, alias, explicit, and unclosed for a quoted string
    # still open at the line end.
    function scan(s,   n, i, c, nx, start, depth, inq) {
      escape = 0; alias = 0; explicit = 0; unclosed = 0
      n = length(s); start = 1; depth = 0; inq = ""
      for (i = 1; i <= n; i++) {
        c = substr(s, i, 1)
        nx = substr(s, i + 1, 1)
        if (inq != "") {
          if (inq == "\"" && c == "\\") { escape = 1; i++ }
          else if (c == inq && inq == q && nx == q) i++
          else if (c == inq) inq = ""
          continue
        }
        if (c == " " || c == "\t") continue
        if (c == "#" && (i == 1 || substr(s, i - 1, 1) ~ /[ \t]/)) {
          code = substr(s, 1, i - 1)
          sub(/[ \t]+$/, "", code)
          return
        }
        if (start) {
          if (c == "\"" || c == q) { inq = c; start = 0; continue }
          if ((c == "-" || c == "?") && (nx == "" || nx ~ /[ \t]/)) {
            if (c == "?") explicit = 1
            continue
          }
          if (c == "[" || c == "{") { depth++; continue }
          if (depth && (c == "]" || c == "}")) { depth--; start = 0; continue }
          if (c == "!" || c == "&" || c == "*") {
            while (i < n && substr(s, i + 1, 1) !~ /[] \t,{}[]/) i++
            if (c == "*") { alias = 1; start = 0 }
            continue
          }
          # A plain scalar starts here.
          start = 0
        }
        if (c == ":" && (nx == "" || nx ~ /[ \t]/ || (depth && nx ~ /[],{}[]/))) start = 1
        else if (depth && c == ",") start = 1
        else if (depth && (c == "]" || c == "}")) depth--
      }
      code = s
      unclosed = (inq != "")
    }
    { sub(/\r$/, "") }
    /^[ \t]*(#|$)/ { next }
    {
      ind = indent($0)
      # The body of a block scalar (run: |) is text, not YAML keys: it runs
      # until a line indented no deeper than its key.
      if (body >= 0) {
        if (ind > body) next
        body = -1
      }
      # A step ends at the next line indented no deeper than its `-`, and
      # its `with:` block at the next line indented no deeper than `with:`.
      if (open && ind <= step) close_step()
      if (inwith && ind <= withind) inwith = 0
      # A list item: remember its dash by the column its keys start at.
      if (match($0, /^ *- +/)) dash[RLENGTH] = ind
      # A key whose value is a block scalar (| or >) starts a body on the
      # next line. The key is matched from the start of the line, so a `: |`
      # inside a comment (hidden: # note: |) starts none.
      if ($0 ~ /^ *(- +)*[^ \t#:]+[ \t]*:[ \t]*[|>][-+0-9]*[ \t]*(#.*)?$/) {
        match($0, /^ *(- +)*/)
        body = RLENGTH
      }
      scan($0)
      low = tolower(code)
    }
    # actions/setup-node@<ref>, or a full URL to it.
    low ~ ("^[ \t-]*[\"" q "]?uses[\"" q "]?[ \t]*:[ \t]*[\"" q "]?([^ \t\"" q "]*/)?actions/setup-node@") {
      open = NR
      # `- uses:` opens the step; a bare `uses:` belongs to the item whose
      # keys start at its column.
      if ($0 ~ /^ *- /) step = ind
      else step = (ind in dash) ? dash[ind] : ind - 2
      next
    }
    # Any other line that names setup-node outside its comment prints
    # `unread`: a step written as one flow mapping (- { uses:
    # actions/setup-node@v7, ... }), a tag before the action (uses: !!str
    # actions/setup-node@v7), an anchor that an alias reuses. A step this
    # reader does not open is never read, so it fails rather than pass
    # unread.
    low ~ /actions\/setup-node@/ {
      print "unread", NR
      next
    }
    # A block mapping of inputs, which an anchor (&inputs) or the mapping
    # tag (!!map) may name first.
    open && /^[ \t]*with[ \t]*:[ \t]*((&[^ \t#]+|!!map)([ \t]+(&[^ \t#]+|!!map))*)?[ \t]*(#.*)?$/ {
      inwith = 1; withind = ind; inputind = -1
      next
    }
    # Any other with: of a setup-node step ({ ... }, an alias, another tag)
    # prints `flow`: reading those forms would take a YAML parser.
    open && /^[ \t]*with[ \t]*:/ { print "flow", NR; open = 0; inwith = 0; next }
    # The patterns here would miss a node-version or a setup-node step
    # written with a form scan() flags, so each prints its kind, wherever in
    # the file it is. So does a quoted string that runs onto the next line,
    # whose next line this reader would read as keys.
    escape { print "escape", NR; next }
    alias { print "alias", NR; next }
    explicit { print "explicit", NR; next }
    unclosed { print "unclosed", NR; next }
    # The inputs are the keys at the indentation of the first line under
    # with:. A node-version nested deeper is no input, and fails as stray.
    inwith {
      if (inputind < 0) inputind = ind
      if (ind == inputind && $0 ~ NV) {
        if (nv) print "twice", NR, "node-version"
        else { nv = NR; nvval = value($0) }
        next
      }
      if (ind == inputind && $0 ~ NVF) {
        if (nvf) print "twice", NR, "node-version-file"
        else { nvf = NR; nvfval = value($0) }
        next
      }
    }
    # A node-version key on any other line, a flow mapping included.
    code ~ ("node-version[\"" q "]?[ \t]*:") { print "stray", NR, trimmed(code) }
    END { close_step() }
  ' "$ROOT/$rel")
}

read_workflows() {
  local file found=0
  steps=0
  if [ ! -d "$ROOT/$WORKFLOWS" ]; then
    fail "$WORKFLOWS not found"
    return
  fi
  for file in "$ROOT/$WORKFLOWS"/*.yml "$ROOT/$WORKFLOWS"/*.yaml; do
    [ -f "$file" ] || continue
    found=1
    read_workflow "$WORKFLOWS/${file##*/}"
  done
  if [ "$found" -eq 0 ]; then
    fail "$WORKFLOWS has no workflow file"
  elif [ "$steps" -eq 0 ]; then
    fail "$WORKFLOWS has no actions/setup-node step"
  fi
}

read_package() {
  local file="$ROOT/$PACKAGE" values field key types=0 i
  local -a lines
  if [ ! -f "$file" ]; then
    fail "$PACKAGE not found"
    return
  fi
  # Four lines, each `-` when the field is absent, `s <text>` for a string
  # and `x` for any other value: engines.node, the @types/node of
  # devDependencies and of dependencies, devEngines.runtime.
  values=$(PIN_FILE="$file" node -e '
    let pkg;
    try {
      pkg = JSON.parse(require("fs").readFileSync(process.env.PIN_FILE, "utf8"));
    } catch {
      process.exit(1);
    }
    const field = (v) => (v === undefined ? "-" : typeof v === "string" ? `s ${v.replace(/\n/g, " ")}` : "x");
    console.log(field(pkg?.engines?.node));
    console.log(field(pkg?.devDependencies?.["@types/node"]));
    console.log(field(pkg?.dependencies?.["@types/node"]));
    console.log(field(pkg?.devEngines?.runtime));
  ') || {
    fail "$PACKAGE is not valid JSON"
    return
  }
  mapfile -t lines <<<"$values"
  field=${lines[0]}
  case "$field" in
    -) ;;
    "s "*)
      if [[ "${field#s }" =~ $ONE_MAJOR ]]; then
        pin "$PACKAGE engines.node" "${BASH_REMATCH[1]}" "${field#s }"
      else
        fail "$PACKAGE engines.node '${field#s }' does not pin one Node major, and railpack reads it before $NVMRC"
      fi
      ;;
    *) fail "$PACKAGE engines.node is not a string, and railpack reads it before $NVMRC" ;;
  esac
  i=1
  for key in devDependencies dependencies; do
    field=${lines[i]}
    i=$((i + 1))
    case "$field" in
      -) continue ;;
      "s "*)
        types=1
        if [[ "${field#s }" =~ $ONE_MAJOR ]]; then
          pin "$PACKAGE $key @types/node" "${BASH_REMATCH[1]}" "${field#s }"
        else
          fail "$PACKAGE $key @types/node '${field#s }' does not pin one Node major"
        fi
        ;;
      *)
        types=1
        fail "$PACKAGE $key @types/node is not a string"
        ;;
    esac
  done
  if [ "$types" -eq 0 ]; then
    fail "$PACKAGE has no @types/node in devDependencies or dependencies"
  fi
  if [ "${lines[3]}" != "-" ]; then
    fail "$PACKAGE sets devEngines.runtime, which railpack reads before $NVMRC and this check does not read: pin Node in $NVMRC only"
  fi
}

read_nvmrc
read_workflows
read_package

expected="${major[0]:-}"
differ=0
for v in "${major[@]}"; do
  if [ "$v" != "$expected" ]; then differ=1; fi
done

if [ "$differ" -eq 1 ] || [ "$status" -ne 0 ]; then
  if [ "$differ" -eq 1 ]; then echo "check-node-pins: the Node majors differ" >&2; fi
  for i in "${!where[@]}"; do
    printf '  %s  %s (%s)\n' "${where[$i]}" "${major[$i]}" "${shown[$i]}" >&2
  done
  exit 1
fi

list=$(printf ', %s' "${where[@]}")
echo "check-node-pins: ${#major[@]} pins read Node $expected (${list#, }); the $steps actions/setup-node step(s) read $NVMRC"
running=$(node --version)
running=${running#v}
if [ "${running%%.*}" != "$expected" ]; then
  echo "check-node-pins: warning: this shell runs Node $running, not $expected." \
    "The dev shell's Node comes from flake.nix, which Renovate does not update." >&2
fi
