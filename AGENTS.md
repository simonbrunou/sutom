## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Leave `graphify-out/` out of feature and fix PRs. A graph refresh lands only in a PR about the graph (a `chore:` refresh, or work on the graphify setup), as its own commit, last on the branch. This overrides the "Run `graphify update .` after code changes" line that graphify rewrites into GRAPH_REPORT.md on every refresh. Undo a stray `graphify update` with `git restore graphify-out`: `.gitignore` already keeps the per-run files it leaves out of git
- Refresh with `scripts/refresh-graph.sh`, from any checkout, a T3 worktree included, once every other change on the branch is committed. graphify titles GRAPH_REPORT.md with the name of the directory it updates, so `graphify update .` in a worktree writes the worktree's name; the script hands graphify a path through a symlink named `sutom`, then fails when the report has another title or graphify wrote a file git neither tracks nor ignores. Commit what it wrote under `graphify-out/` and nothing else

## Agent skills

### Issue tracker

Forgejo issues on `git.sbrn.eu` via the `fj` CLI, with the REST API for JSON reads and blocking links. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Node version

`.nvmrc` is the one Node pin: CI's `actions/setup-node` reads it through `node-version-file`, and railpack builds production on it. `scripts/check-node-pins.sh` runs in CI before `npm ci` and fails when a workflow hardcodes `node-version` or when `.nvmrc` and `@types/node` name different majors; its header lists every rule. Renovate's `Node.js` group moves `.nvmrc` and `@types/node` in one PR.

Railpack reads `engines.node` and `devEngines.runtime` in `package.json`, and a `RAILPACK_NODE_VERSION` variable on the Coolify app, before `.nvmrc`, so set Node in `.nvmrc` only. The dev shell reads `.nvmrc` too: `flake.nix` takes `nodejs_<major>` from the locked nixpkgs, and `.envrc` watches `.nvmrc`, so direnv rebuilds the shell on the next entry. When the locked nixpkgs lacks a new major, the shell fails naming `nodejs_<major>`: run `nix flake update`. The check's warning that the shell runs another major means the shell has not reloaded (run `direnv reload`, or start a new `nix develop`), or that nix-direnv kept the previous shell after a failed evaluation, which it reports as `Falling back to previous environment`: fix that error first.

## Merge authority

Agents may merge their own PR without asking once all three hold:

- a code review ran on the diff (the `code-review` skill or the `pr-review-toolkit:code-reviewer` agent) and you fixed its real findings, nits aside (the global agent rules define a nit);
- CI is green on the pushed SHA;
- the pushed SHA has no conflict with `origin/main`. Run `git fetch origin` right before merging, then check that `git merge-tree --write-tree origin/main <pushed SHA>` exits 0.

When the branch is behind `main` but has no conflict, merge it as it is. The accepted risk is that two PRs that pass on their own can break `main` together. The CI run on the newest `main` commit shows such a break, so check it after the merge and fix a red one in a new PR.

On a conflict, merge `origin/main` into the branch, resolve it, run `npm ci && npm run lint && npm run check && npm run test && npm run build`, push, wait for CI on the new head, and check all three conditions again.

The user accepts the production deploy that the merge triggers. The site is a static SPA that stores no data on the server: game state and statistics live in the player's browser (`localStorage`), which replacing the server's files does not clear.

After the merge, check the deploy: `~/Projects/homelab-stacks/scripts/coolify-deploy-status.sh --no-health 33k9gghhdlx4kzdivylxuopr <merge sha>` exits 0 (`--no-health`: the container has no health check) (exit 3 means still deploying: run it again a few minutes later), then `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://sutom.sbrn.eu/` prints `200 text/html`.
