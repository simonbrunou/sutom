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

`.nvmrc` is the one Node pin: CI's `actions/setup-node` reads it through `node-version-file`, and railpack builds production on its major. `scripts/check-node-pins.sh` runs in CI before `npm ci` and fails when a workflow hardcodes `node-version` or when `.nvmrc` and `@types/node` name different majors; its header lists every rule. Renovate's `Node.js` group moves `.nvmrc` and `@types/node` in one PR.

Railpack reads `engines.node` and `devEngines.runtime` in `package.json`, and a `RAILPACK_NODE_VERSION` variable on the Coolify app, before `.nvmrc`, so set Node in `.nvmrc` only. The dev shell reads `.nvmrc` too: `flake.nix` takes `nodejs_<major>` from the locked nixpkgs, and `.envrc` watches `.nvmrc`, so direnv rebuilds the shell on the next entry. When the locked nixpkgs lacks a new major, the shell fails naming `nodejs_<major>`: run `nix flake update`. The check's warning that the shell runs another major means the shell has not reloaded (run `direnv reload`, or start a new `nix develop`), or that nix-direnv kept the previous shell after a failed evaluation, which it reports as `Falling back to previous environment`: fix that error first.

CI and production share the `.nvmrc` major, not always its patch. CI's setup-node downloads the newest release of the major on every run. Railpack's plan names that release too, but the mise config it generates sets `minimum_release_age = "14d"`, and `mise install` installs the newest release of the major that is at least 14 days old. BuildKit caches that install step until Coolify's forced Docker cleanup prunes the railpack builder's cache, every night at 00:00 UTC (the sutom server's `docker_cleanup_frequency`, a Coolify setting outside this repo). The cleanup skips that prune while a deploy is queued or running. So only the first deploy after a prune reinstalls Node, and production misses each new release for its first 14 days, then until the next deploy that follows a prune. Production's patch is the `node@<version>` of the newest deploy that reinstalled Node (its log shows `mise ✓ node@<version>`):

```sh
ssh root@192.168.1.195 "pct exec 104 -- docker exec coolify-db psql -U coolify -d coolify -At -c \"select q.id, q.created_at, substring(q.logs from 'node@[0-9.]+  extracting') from application_deployment_queues q join applications a on a.id = q.application_id::int where a.uuid = '33k9gghhdlx4kzdivylxuopr' and q.logs ~ 'node@[0-9.]+  extracting' order by q.id desc limit 1\""
```

Production installs with railpack's `npm install`, CI with `npm ci`. Both install the tree in `package-lock.json` while it matches `package.json`. `npm ci` fails on a lockfile out of sync with `package.json`, and `main` takes a PR only once CI passes, so such a lockfile stops at its PR.

## Formatting

Prettier formats the repo in the SvelteKit template's style: `.prettierrc` sets tabs, single quotes, no trailing commas and a print width of 100, and `prettier-plugin-svelte` formats `.svelte` files. `npm run lint` runs `prettier --check .` before ESLint, so CI's Lint step fails on any file Prettier would change and names it: run `npm run format` and commit the result. Prettier skips the paths in `.gitignore` and `.prettierignore`, `graphify-out/` included, so `npm run format` leaves the graph alone.

## Merge authority

Agents may merge their own PR without asking once all three hold:

- a code review ran on the diff (the `code-review` skill or the `pr-review-toolkit:code-reviewer` agent) and you fixed its real findings, nits aside (the global agent rules define a nit);
- CI is green on the pushed SHA;
- the pushed SHA has no conflict with `origin/main`. Run `git fetch origin` right before merging, then check that `git merge-tree --write-tree origin/main <pushed SHA>` exits 0.

When the branch is behind `main` but has no conflict, merge it as it is. The accepted risk is that two PRs that pass on their own can break `main` together. The CI run on the newest `main` commit shows such a break. After the merge, run `git fetch origin`, then `git rev-parse <merge sha>^{tree} <pushed SHA>^{tree}`. Two different hashes mean the merge commit holds files CI has not tested together, so wait for that run and fix a red one in a new PR. The same hash twice means the merge commit holds the files CI already passed on the pushed SHA, and the `push` run repeats that job on them, so skip the wait.

On a conflict, merge `origin/main` into the branch, resolve it, run `npm ci && npm run lint && npm run check && npm run test && npm run build`, push, wait for CI on the new head, and check all three conditions again.

The user accepts the production deploy that the merge triggers. The site is a static SPA that stores no data on the server: game state and statistics live in the player's browser (`localStorage`), which replacing the server's files does not clear.

After the merge, check the deploy: `~/Projects/homelab-stacks/scripts/coolify-deploy-status.sh --no-health 33k9gghhdlx4kzdivylxuopr <merge sha>` exits 0 (`--no-health`: the container has no health check) (exit 3 means still deploying: run it again a few minutes later), then `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://sutom.sbrn.eu/` prints `200 text/html`.
