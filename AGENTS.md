## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:

- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- Leave `graphify-out/` out of feature and fix PRs. A graph refresh lands only in a PR about the graph (a `chore:` refresh, or work on the graphify setup), as its own commit, last on the branch. This overrides the "Run `graphify update .` after code changes" line that graphify rewrites into GRAPH_REPORT.md on every refresh. Undo a stray `graphify update` with `git restore graphify-out`: `.gitignore` already keeps the per-run files it leaves out of git
- Refresh with `scripts/refresh-graph.sh`, from any checkout, a T3 worktree included, once every other change on the branch is committed. graphify titles GRAPH_REPORT.md with the name of the directory it updates, so `graphify update .` in a worktree writes the worktree's name; the script hands graphify a path through a symlink named `sutom`, then fails when the report has another title or graphify wrote a file git neither tracks nor ignores. Commit what it wrote under `graphify-out/` and nothing else
- CI enforces that shape on every PR: `scripts/check-graph-diff.sh` fails a PR whose diff touches `graphify-out/` unless its last commit changes only `graphify-out/`, names its parent as `built_at_commit` in `graph.json` and titles the report `sutom`. A `scripts/refresh-graph.sh` run committed alone, last, passes. Run the check with `origin/main` fetched for CI's answer. It cannot tell a PR about the graph from a feature PR that ends in a refresh: review still has to catch that

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

CI and production share the `.nvmrc` major, and production can build on an older patch of it. CI's setup-node downloads the newest release of the major. Railpack's plan names that release too and writes it into the mise config it generates, a config that also holds back releases younger than 14 days (`minimum_release_age = "14d"` in the deploy log's `generated-mise-toml`). Mise prefers the bare major in `.nvmrc`, which railpack copies to `/app`, over that exact release, so `mise install` takes the newest release of the major that is at least 14 days old. BuildKit caches that install step. Coolify's forced Docker cleanup prunes the railpack builder's cache every night at 00:00 UTC, and skips the prune while a deploy is queued or running. That schedule is the sutom server's `docker_cleanup_frequency`, a Coolify setting outside this repo. The step reruns on the first deploy after a prune, and on a deploy that changes its inputs: the generated mise config (the release railpack's plan names, among other lines), `.nvmrc` or the builder image. So production misses each new release for its first 14 days, and then until the step next reruns, on the first deploy after the next prune at the latest. Production runs the image tagged with the commit of the newest finished deploy, and `~/Projects/homelab-stacks/scripts/coolify-deploy-status.sh` prints that tag (`image <uuid>:<commit>`). A deploy that finds an image for its commit skips the build and logs `Build step skipped`, unless the deploy forces a rebuild or Coolify's `should_skip_build()` finds a reason to rebuild, such as a changed build setting. So after a Coolify rollback, an older deploy can have built the running image. The deploy that built it is the newest deploy of that commit whose log holds two Coolify lines, counting no deploy newer than the newest finished one. `Building docker image with Railpack.` means the build started. `Rolling update started.` means the build succeeded, since a failed build stops before that line. A deploy that skips the build writes it too, so the query needs both. Coolify 4.6.0 writes both lines. It writes the second only on its rolling update path, which sutom takes while it maps no host port, keeps the consistent container name setting off and sets no custom IP. A Coolify upgrade can reword either line, and a reworded line makes the query print no row or an older build's row. After an upgrade, check that the newest deploy that built an image still logs both, and update the query's two patterns when it does not. The patch is the `mise node@<version>` of the newest deploy whose node step ran, counting deploys up to the one that built the image, a failed deploy included, since a failed build's finished steps stay in the cache:

```sh
ssh root@192.168.1.195 "pct exec 104 -- docker exec coolify-db psql -U coolify -d coolify -At -c \"select q.id, q.status, q.created_at, substring(q.logs from 'mise node@([0-9]+[.][0-9]+[.][0-9]+)') from application_deployment_queues q join applications a on a.id = q.application_id::int where a.uuid = '33k9gghhdlx4kzdivylxuopr' and q.logs ~ 'mise node@[0-9]' and q.id <= (select max(b.id) from application_deployment_queues b, (select r.id, r.commit from application_deployment_queues r where r.application_id = q.application_id and r.status = 'finished' order by r.id desc limit 1) r where b.application_id = q.application_id and b.commit = r.commit and b.id <= r.id and b.logs ~ 'Building docker image with Railpack' and b.logs ~ 'Rolling update started') order by q.id desc limit 1\""
```

Production installs with railpack's `npm install`, CI with `npm ci`. Both install the tree in `package-lock.json` while it matches `package.json`. `npm ci` fails on a lockfile out of sync with `package.json`, so CI goes red on a PR that brings one. Branch protection on `main` requires that CI run to pass before a PR merges, a rule that binds neither admins nor direct pushes.

## Formatting

Prettier formats the repo in the SvelteKit template's style: `.prettierrc` sets tabs, single quotes, no trailing commas and a print width of 100, and `prettier-plugin-svelte` formats `.svelte` files. `npm run lint` runs `prettier --check .` before ESLint, so CI's Lint step fails on any file Prettier would change and names it: run `npm run format` and commit the result. Prettier skips the paths in `.gitignore` and `.prettierignore`, `graphify-out/` included, so `npm run format` leaves the graph alone.

## Review

Paste this paragraph, as it stands, into the brief of every review sub-agent:

> Make a mutation check (a scratch edit to the code under test) only in a checkout of your own, so the author and the other reviewers keep seeing the files under review in the author's checkout. Create it in one shell call, `D=$(mktemp -d) && git worktree add --detach "$D" <head sha> && echo "$D"`, and copy the path it prints. Your next shell call starts back in the author's checkout without `$D`, so start each later call with `cd <that path> &&`: install with `nix develop . -c npm ci`, then run the test file with `nix develop . -c npx vitest run <file>`. Edit files there by that path. When done, delete the checkout with `git worktree remove --force <that path>`.

## Merge authority

Agents may merge their own PR without asking once all three hold:

- a code review ran on the diff (the `code-review` skill or the `pr-review-toolkit:code-reviewer` agent) and you fixed its real findings, nits aside (the global agent rules define a nit);
- CI is green on the pushed SHA;
- the pushed SHA has no conflict with `origin/main`. Run `git fetch origin` right before merging, then check that `git merge-tree --write-tree origin/main <pushed SHA>` exits 0.

When the branch is behind `main` but has no conflict, merge it as it is. The accepted risk is that two PRs that pass on their own can break `main` together. The CI run on the newest `main` commit shows such a break. After the merge, run `git fetch origin`, then `git rev-parse <merge sha>^{tree} <pushed SHA>^{tree}`. Two different hashes mean the merge commit holds files CI has not tested together, so wait for that run and fix a red one in a new PR. The same hash twice means the merge commit holds the files CI already passed on the pushed SHA, and the `push` run repeats that job on them, so skip the wait.

On a conflict, merge `origin/main` into the branch, resolve it, run `npm ci && npm run lint && npm run check && npm run test && npm run build`, push, wait for CI on the new head, and check all three conditions again.

The user accepts the production deploy that the merge triggers. The site is a static SPA that stores no data on the server: game state and statistics live in the player's browser (`localStorage`), which replacing the server's files does not clear.

After the merge, check the deploy: `~/Projects/homelab-stacks/scripts/coolify-deploy-status.sh --no-health 33k9gghhdlx4kzdivylxuopr <merge sha>` exits 0 (`--no-health`: the container has no health check) (exit 3 means still deploying: run it again a few minutes later), then `curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://sutom.sbrn.eu/` prints `200 text/html`.
