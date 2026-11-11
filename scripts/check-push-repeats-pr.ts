// Tells the merging agent whether the CI run that a merge starts on `main` repeats the PR run's
// jobs and steps (AGENTS.md, "Merge authority"). It ports simonbrunou.bzh's
// scripts/check-push-repeats-pr.js (simonbrunou.bzh#162) to this repo (#239), with the
// parsed-YAML walk of garde-manger's port (garde-manger#116). Run it from a checkout with its
// dependencies installed (`npm ci`), after `git fetch origin`, with the SHA the PR's CI passed:
//
//   node scripts/check-push-repeats-pr.ts <pushed SHA>
//
// It reads the files at that SHA through git, not the working tree, and prints each difference
// it finds:
//
// - no workflow file under .forgejo/workflows/, or a workflow anywhere under it that has no
//   `on:`, lacks a `push` or a `pull_request` trigger, filters either one beyond
//   `branches: [main]`, filters one of them and not the other, or has a trigger other than those
//   two, `schedule` and `workflow_dispatch`;
// - a job that calls a reusable workflow (`jobs.<id>.uses`), whose steps this script cannot read;
// - in a workflow, in any other YAML file under .forgejo/, or in an action.yml or action.yaml
//   anywhere: a file the `yaml` package reads with an error or a warning (a duplicate key, an
//   unknown tag, a second document), a tag (`!!binary`, whose value YAML decodes), an alias
//   (`*name`), a merge key (`<<`), an `if` key, a `${{ }}` expression in a key or a value as YAML
//   reads it (escapes such as \x24 included), and a step that uses actions/github-script, whose
//   code gets the event;
// - in any file outside Markdown and graphify-out/, a name made of GITHUB, FORGEJO or FORGE and
//   an underscore, which a script could read the event through, and the names of the actions
//   toolkit's github module and its event property. Neither this script nor its test holds one,
//   so both are read.
//
// It allows the two differences this repo's CI keeps on purpose:
//
// - `branches: [main]` under `pull_request`, matching the same filter under `push`. It limits the
//   PR runs to PRs into main, the ones whose merge starts a push run on main.
// - CI's graphify-out guard (#178), one step that runs `scripts/check-graph-diff.sh` with
//   `if: github.event_name == 'pull_request'`, so the push run skips it. The step may hold that
//   `if`, `${{ github.base_ref }}` in the value of GRAPH_CHECK_BASE and
//   `${{ github.event.pull_request.head.sha }}` in the value of GRAPH_CHECK_HEAD, when its keys
//   are only `name`, `if`, `env` and `run`, its `env` sets those two variables alone, its job has
//   no keys but `name`, `runs-on` and `steps`, and its workflow none but `name`, `on` and `jobs`.
//   Every step inherits the workflow's `defaults` and `env` and the job's `defaults`, `env` and
//   `container`, where a `shell`, a `working-directory` or a variable such as BASH_ENV could run
//   other code on the PR run only. Any other key on the step, its job or its workflow keeps the
//   step from counting as the guard, so its `if` and its expressions are reported. A second step
//   in the guard's shape, in any workflow, is reported too: the allowance covers one.
//   scripts/check-graph-diff.sh reads git and writes nothing (its header says so), so the steps
//   after the guard see the same files on both runs.
//
// The `schedule` and `workflow_dispatch` triggers, carried over from the scripts this one ports,
// are not a third allowed difference: each starts runs of its own and changes no step of the push
// run, and an `if` or an expression that reads them is reported.
//
// It cannot see code that branches on commit metadata (the push run checks out `main` at the
// merge commit, whose subject, SHA and parents differ from the pushed SHA's), a step before the
// guard that changes what the guard runs (one that edits scripts/check-graph-diff.sh, say), a
// change to scripts/check-graph-diff.sh that writes files later steps read, code that the runner
// or its image runs in every step, or code that reads the event by a route the list above leaves
// out. Such code passes.
//
// Exit 0: no difference, so the push run repeats the PR run. Exit 1: it printed each difference,
// so wait on main's run. Exit 2: a wrong call, git failed, the SHA names no commit or the `yaml`
// devDependency is missing; wait too. scripts/check-push-repeats-pr.test.ts holds one case per
// difference.
import { spawnSync } from 'node:child_process';
import type { Document, LineCounter, Node, YAMLMap } from 'yaml';

const RUNNER_NAMES = ['GITHUB', 'FORGEJO', 'FORGE'].map((name) => `${name}_`);
// Built from parts, like RUNNER_NAMES, so this file does not match itself.
const EVENT_READS = [['@actions', 'github'].join('/'), ['event', 'Name'].join('')];
const ALLOWED_TRIGGERS = new Set(['push', 'pull_request', 'schedule', 'workflow_dispatch']);
const EXPRESSION = /\$\{\{([\s\S]*?)\}\}/g;
const GUARD_IF = "github.event_name == 'pull_request'";
const GUARD_RUN = 'scripts/check-graph-diff.sh';
// Each variable the guard's `env` sets, and the one expression its value may hold.
const GUARD_ENV = new Map([
	['GRAPH_CHECK_BASE', 'github.base_ref'],
	['GRAPH_CHECK_HEAD', 'github.event.pull_request.head.sha']
]);
const GUARD_KEYS = new Set(['name', 'if', 'env', 'run']);
const GUARD_JOB_KEYS = new Set(['name', 'runs-on', 'steps']);
const GUARD_WORKFLOW_KEYS = new Set(['name', 'on', 'jobs']);

function fail(message: string): never {
	console.error(`check-push-repeats-pr: ${message}`);
	process.exit(2);
}

const args = process.argv.slice(2);
if (args.length !== 1) fail('usage: node scripts/check-push-repeats-pr.ts <pushed SHA>');

const YAML = await import('yaml').catch(() =>
	fail('cannot load the yaml package; run npm ci first')
);

let cwd = process.cwd();
function git(gitArgs: string[], okCodes = [0]): string {
	const proc = spawnSync('git', gitArgs, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
	if (proc.status === null || !okCodes.includes(proc.status)) {
		fail(`git ${gitArgs.join(' ')} failed: ${(proc.stderr || String(proc.error)).trim()}`);
	}
	return proc.stdout;
}

cwd = git(['rev-parse', '--show-toplevel']).trim();
const commit = git(['rev-parse', '--verify', '--quiet', `${args[0]}^{commit}`], [0, 1]).trim();
if (!commit) fail(`unknown commit: ${args[0]}`);
const files = git(['ls-tree', '-r', '--name-only', '-z', commit]).split('\0').filter(Boolean);
const isYaml = (f: string) => /\.ya?ml$/.test(f);
const workflows = new Set(files.filter((f) => f.startsWith('.forgejo/workflows/') && isYaml(f)));
const scanned = files.filter(
	(f) => (f.startsWith('.forgejo/') && isYaml(f)) || /(^|\/)action\.ya?ml$/.test(f)
);
const differences: string[] = [];
let guardCount = 0;
if (!workflows.size) differences.push('.forgejo/workflows/: no workflow file');

const isEmpty = (value: unknown) =>
	value == null || (typeof value === 'object' && Object.keys(value).length === 0);

function isMainOnly(value: unknown): boolean {
	if (isEmpty(value)) return true;
	if (typeof value !== 'object' || value === null) return false;
	const filter = value as Record<string, unknown>;
	const branches = [filter.branches].flat();
	return (
		Object.keys(filter).join() === 'branches' && branches.length === 1 && branches[0] === 'main'
	);
}

function checkTriggers(file: string, doc: unknown) {
	const on = (doc as { on?: unknown } | null)?.on;
	let triggers: Record<string, unknown>;
	if (typeof on === 'string') triggers = { [on]: null };
	else if (Array.isArray(on)) triggers = Object.fromEntries(on.map((t) => [t, null]));
	else if (on && typeof on === 'object') triggers = on as Record<string, unknown>;
	else return differences.push(`${file}: no on: triggers`);
	for (const name of ['push', 'pull_request']) {
		if (!(name in triggers)) differences.push(`${file}: no ${name} trigger`);
		else if (!isMainOnly(triggers[name])) {
			differences.push(`${file}: ${name} has a filter beyond branches: [main]`);
		}
	}
	const filtered = ['push', 'pull_request'].filter((name) => !isEmpty(triggers[name]));
	if ('push' in triggers && 'pull_request' in triggers && filtered.length === 1) {
		differences.push(`${file}: only ${filtered[0]} has a filter`);
	}
	for (const name of Object.keys(triggers)) {
		if (!ALLOWED_TRIGGERS.has(name)) differences.push(`${file}: trigger ${name}`);
	}
}

function checkJobs(file: string, doc: unknown) {
	const jobs = (doc as { jobs?: unknown } | null)?.jobs;
	if (!jobs || typeof jobs !== 'object') return;
	for (const [id, job] of Object.entries(jobs)) {
		if (job && typeof job === 'object' && 'uses' in job) {
			differences.push(`${file}: job ${id} calls a reusable workflow: ${job.uses}`);
		}
	}
}

const keyName = (pair: { key: unknown }) =>
	YAML.isScalar(pair.key) ? String(pair.key.value) : '(not a plain key)';

function hasOnlyKeys(node: unknown, allowed: Set<string>): node is YAMLMap {
	return YAML.isMap(node) && node.items.every((pair) => allowed.has(keyName(pair)));
}

// CI's graphify-out guard steps in a workflow, and the value nodes of their `env` with the one
// expression each may hold. A step counts only in the shape the header gives.
function findGuards(doc: Document) {
	const steps = new Set<unknown>();
	const envValues = new Map<unknown, string | undefined>();
	const jobs = doc.get('jobs', true);
	if (!YAML.isMap(jobs) || !hasOnlyKeys(doc.contents, GUARD_WORKFLOW_KEYS)) {
		return { steps, envValues };
	}
	for (const { value: job } of jobs.items) {
		if (!hasOnlyKeys(job, GUARD_JOB_KEYS)) continue;
		const jobSteps = job.get('steps', true);
		if (!YAML.isSeq(jobSteps)) continue;
		for (const step of jobSteps.items) {
			if (!hasOnlyKeys(step, GUARD_KEYS)) continue;
			if (step.get('if') !== GUARD_IF || step.get('run') !== GUARD_RUN) continue;
			const env = step.get('env', true);
			// The yaml package rejects a duplicate key, so this many known keys are all of them.
			if (!hasOnlyKeys(env, new Set(GUARD_ENV.keys())) || env.items.length !== GUARD_ENV.size) {
				continue;
			}
			steps.add(step);
			for (const pair of env.items) envValues.set(pair.value, GUARD_ENV.get(keyName(pair)));
		}
	}
	return { steps, envValues };
}

for (const file of scanned) {
	const lines: LineCounter = new YAML.LineCounter();
	const doc = YAML.parseDocument(git(['show', `${commit}:${file}`]), { lineCounter: lines });
	const problem = doc.errors[0] ?? doc.warnings[0];
	if (problem) {
		differences.push(`${file}: not readable as YAML (${problem.message.split('\n')[0]})`);
		continue;
	}
	const guards = workflows.has(file)
		? findGuards(doc)
		: { steps: new Set<unknown>(), envValues: new Map<unknown, string | undefined>() };
	guardCount += guards.steps.size;
	const at = (node: unknown) => {
		const start = (node as Node | null)?.range?.[0];
		return start === undefined ? file : `${file}:${lines.linePos(start).line}`;
	};

	// Every node of the file, keys included, so a key spelled "if", `if :` or `? if` and an
	// expression in a key are found too.
	const walk = (node: unknown, where: string) => {
		const tag = (node as { tag?: string } | null)?.tag;
		if (tag)
			differences.push(`${at(node)}: ${where}: a tag (${tag}), which this script does not read`);
		if (YAML.isAlias(node)) {
			differences.push(
				`${at(node)}: ${where}: an alias (*${node.source}), which this script does not follow`
			);
		} else if (YAML.isScalar(node)) {
			if (typeof node.value !== 'string') return;
			const allowed = guards.envValues.get(node);
			for (const match of node.value.matchAll(EXPRESSION)) {
				if (match[1].trim() === allowed) continue;
				differences.push(`${at(node)}: ${where}: an expression: ${match[0]}`);
			}
		} else if (YAML.isSeq(node)) {
			node.items.forEach((item, i) => walk(item, `${where}[${i}]`));
		} else if (YAML.isMap(node)) {
			for (const pair of node.items) {
				const key = keyName(pair);
				const path = `${where}.${key}`;
				const value = YAML.isScalar(pair.value) ? String(pair.value.value) : '(not a plain value)';
				walk(pair.key, `${path} (key)`);
				if (key === '<<') {
					differences.push(
						`${at(pair.key)}: ${path}: a merge key, which this script does not follow`
					);
				}
				if (key === 'if' && !guards.steps.has(node)) {
					differences.push(`${at(pair.key)}: ${path}: an if: ${value}`);
				}
				if (key === 'uses' && value.includes('github-script')) {
					differences.push(`${at(pair.key)}: ${path}: runs code that gets the event: ${value}`);
				}
				walk(pair.value, path);
			}
		}
	};
	walk(doc.contents, '');

	if (workflows.has(file)) {
		let value: unknown;
		try {
			value = doc.toJS();
		} catch (err) {
			differences.push(`${file}: not readable as YAML (${(err as Error).message})`);
			continue;
		}
		checkTriggers(file, value);
		checkJobs(file, value);
	}
}
if (guardCount > 1) {
	differences.push(
		`.forgejo/workflows/: ${guardCount} steps in the graphify-out guard's shape; the allowance covers one`
	);
}

const pattern = [...RUNNER_NAMES, ...EVENT_READS].join('|');
const hits = git(['grep', '-nE', pattern, commit, '--', '.', ':!*.md', ':!graphify-out'], [0, 1]);
for (const hit of hits.split('\n').filter(Boolean)) {
	differences.push(`${hit.replace(`${commit}:`, '')}: reads the event or names a runner variable`);
}

const short = commit.slice(0, 8);
if (differences.length) {
	for (const d of differences) console.log(d);
	console.log(
		`check-push-repeats-pr: ${short}: ${differences.length} difference(s); wait on main's run`
	);
	process.exit(1);
}
console.log(
	`check-push-repeats-pr: ${short}: the push run repeats the PR run but for ${guardCount} ` +
		`PR-only graphify-out guard step(s) (${workflows.size} workflow file(s), ` +
		`${scanned.length} file(s) scanned)`
);
