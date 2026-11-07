// @vitest-environment node
// scripts/check-graph-diff.sh (#178) on a throwaway git repo that each test
// builds afresh: a first commit holding code and a graph, which
// refs/remotes/origin/main names, then a branch the test adds commits to. A
// test shapes the branch into one pass or failure class and asserts the exit
// code and the message. Each failing fixture breaks one condition only, so a
// check removed from the script turns its own test red.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = path.join(repo, 'scripts', 'check-graph-diff.sh');
const GRAPH = 'graphify-out/graph.json';
const REPORT = 'graphify-out/GRAPH_REPORT.md';
const OLD_BUILD = 'a'.repeat(40);

// The tests' git and the script read no GIT_* variable of a hook that runs
// them, nor a GRAPH_CHECK_* of the shell.
const cleanEnv = Object.fromEntries(
	Object.entries(process.env).filter(
		([key]) => !key.startsWith('GIT_') && !key.startsWith('GRAPH_CHECK_')
	)
);

const base = mkdtempSync(path.join(tmpdir(), 'check-graph-diff-'));
// The current test's checkout: base/<test number>/sutom.
let checkout = '';
let testNumber = 0;

afterAll(() => {
	rmSync(base, { recursive: true, force: true });
});

function git(...args: string[]): string {
	return execFileSync(
		'git',
		[
			'-c',
			'user.name=test',
			'-c',
			'user.email=test@example.com',
			'-c',
			'commit.gpgsign=false',
			'-c',
			'core.hooksPath=/dev/null',
			...args
		],
		{ cwd: checkout, encoding: 'utf8', env: cleanEnv }
	).trim();
}

function graph(builtAt: string): string {
	return `{"directed":false,"nodes":[],"built_at_commit":"${builtAt}"}`;
}

function title(name: string): string {
	return `# Graph Report - ${name}  (2026-11-07)\n\n## Summary\n`;
}

// Write each file (null deletes it), stage everything, commit and return the
// new commit's id.
function commit(files: Record<string, string | null>, message = 'change'): string {
	for (const [file, text] of Object.entries(files)) {
		const p = path.join(checkout, file);
		if (text === null) {
			rmSync(p);
		} else {
			mkdirSync(path.dirname(p), { recursive: true });
			writeFileSync(p, text);
		}
	}
	git('add', '-A');
	git('commit', '-q', '--allow-empty', '-m', message);
	return git('rev-parse', 'HEAD');
}

// What scripts/refresh-graph.sh commits: the graph built from HEAD, the
// report titled sutom.
function refresh(builtAt = git('rev-parse', 'HEAD'), name = 'sutom'): string {
	return commit({ [GRAPH]: graph(builtAt), [REPORT]: title(name) }, 'chore: refresh the graph');
}

beforeEach(() => {
	testNumber += 1;
	checkout = path.join(base, String(testNumber), 'sutom');
	mkdirSync(checkout, { recursive: true });
	git('init', '-q');
	commit({
		'src/lib/game.ts': 'export const x = 1;\n',
		'package.json': '{"devDependencies": {"vite": "^8.0.0"}}\n',
		'package-lock.json': '{"lockfileVersion": 3}\n',
		[GRAPH]: graph(OLD_BUILD),
		[REPORT]: title('sutom'),
		'graphify-out/manifest.json': '{}\n'
	});
	git('update-ref', 'refs/remotes/origin/main', 'HEAD');
	git('checkout', '-q', '-b', 'feature');
});

function run(env: Record<string, string> = {}, args: string[] = [checkout]) {
	const p = spawnSync(scriptPath, args, { encoding: 'utf8', env: { ...cleanEnv, ...env } });
	return { code: p.status, out: p.stdout, err: p.stderr };
}

function passesWith(message: string, env: Record<string, string> = {}): void {
	const { code, out, err } = run(env);
	expect(code, err).toBe(0);
	expect(out).toContain(message);
}

function failsWith(...messages: string[]): string {
	const { code, out, err } = run();
	expect(code, out).toBe(1);
	for (const message of messages) expect(err).toContain(message);
	return err;
}

describe('check-graph-diff.sh passes', () => {
	it('when the diff changes nothing under graphify-out/', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n' });
		passesWith('no change under graphify-out/');
	});

	it('on a Renovate PR, which changes package.json and its lockfile', () => {
		commit({
			'package.json': '{"devDependencies": {"vite": "^8.1.0"}}\n',
			'package-lock.json': '{"lockfileVersion": 3, "packages": {}}\n'
		});
		passesWith('no change under graphify-out/');
	});

	it('when a later commit undoes an earlier graphify-out/ change', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n', [REPORT]: title('t3-issue-178') });
		commit({ [REPORT]: title('sutom') });
		passesWith('no change under graphify-out/');
	});

	it('on code commits, then a refresh built from its parent and titled sutom, last', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n' });
		const parent = commit({ 'src/lib/new.ts': 'export {};\n' });
		refresh();
		passesWith(`the last commit is a refresh, built from its parent ${parent.slice(0, 12)}`);
	});

	// Decision 2(a) on #178: the check reads the last commit only. #229 asks
	// whether to fail this shape too.
	it('when an earlier commit adds a file under graphify-out/ that the last refresh keeps', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n', 'graphify-out/stray.json': '{}\n' });
		refresh();
		const { code, out, err } = run();
		expect(code, err).toBe(0);
		expect(out).toContain('the diff changes graphify-out/ and the last commit is a refresh');
		expect(out).not.toContain('only in the last commit');
	});

	it('on a PR that is one refresh', () => {
		refresh();
		passesWith('titled sutom');
	});

	it('on a graph.json with a blank after the colon of built_at_commit', () => {
		const parent = git('rev-parse', 'HEAD');
		commit({ [GRAPH]: `{"nodes": [], "built_at_commit": "${parent}"}` });
		passesWith('titled sutom');
	});

	it("on #174's own commits: graphify setup work, then a refresh by scripts/refresh-graph.sh", () => {
		// The repo's own history: CI's checkout fetches all of it (fetch-depth: 0).
		const { code, out, err } = run(
			{ GRAPH_CHECK_BASE: '3c79a81^1', GRAPH_CHECK_HEAD: '3c79a81^2' },
			[repo]
		);
		expect(code, err).toBe(0);
		expect(out).toContain(
			'to 5974bed0fe54, the diff changes graphify-out/ and the last commit is a refresh'
		);
	});
});

describe('check-graph-diff.sh reads', () => {
	it('the base from GRAPH_CHECK_BASE', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n', [REPORT]: title('t3-issue-178') });
		expect(run().code).toBe(1);
		git('branch', 'other');
		passesWith('the merge base with other', { GRAPH_CHECK_BASE: 'other' });
	});

	it('the head from GRAPH_CHECK_HEAD', () => {
		const clean = commit({ 'src/lib/game.ts': 'export const x = 2;\n' });
		commit({ 'src/lib/game.ts': 'export const x = 3;\n', [REPORT]: title('t3-issue-178') });
		expect(run().code).toBe(1);
		passesWith(`to ${clean.slice(0, 12)}`, { GRAPH_CHECK_HEAD: clean });
	});

	it("origin/main and HEAD with neither variable set, giving CI's answer", () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n', [REPORT]: title('t3-issue-178') });
		const local = run();
		const ci = run({ GRAPH_CHECK_BASE: 'origin/main', GRAPH_CHECK_HEAD: git('rev-parse', 'HEAD') });
		expect(local.code).toBe(1);
		expect(local).toEqual(ci);
	});

	it('the committed files, not the working tree', () => {
		refresh();
		writeFileSync(path.join(checkout, REPORT), title('t3-issue-178'));
		writeFileSync(path.join(checkout, GRAPH), graph(OLD_BUILD));
		passesWith('titled sutom');
	});
});

describe('check-graph-diff.sh fails', () => {
	it('when the last commit changes code and graphify-out/, as `git add -A` does', () => {
		const parent = git('rev-parse', 'HEAD');
		commit({
			'src/lib/game.ts': 'export const x = 2;\n',
			[GRAPH]: graph(parent),
			[REPORT]: `${title('sutom')}\n## God nodes\n`
		});
		const err = failsWith(
			'also changes files outside graphify-out/:\n     src/lib/game.ts',
			`graphify-out/ paths in the diff:\n     ${REPORT}\n     ${GRAPH}`,
			'run scripts/refresh-graph.sh once every other change is committed',
			`git restore --source=${parent}`
		);
		expect(err).not.toMatch(/^ {2}[23]\./m);
	});

	it('when an earlier commit refreshed the graph and the last commit changes code', () => {
		refresh();
		commit({ 'src/lib/game.ts': 'export const x = 2;\n' });
		failsWith('1. ', 'src/lib/game.ts');
	});

	it('when the last commit moves a file out of graphify-out/', () => {
		const parent = git('rev-parse', 'HEAD');
		mkdirSync(path.join(checkout, 'docs'));
		git('mv', 'graphify-out/manifest.json', 'docs/manifest.json');
		commit({ [GRAPH]: graph(parent) });
		failsWith(
			'also changes files outside graphify-out/:\n     docs/manifest.json',
			'paths in the diff:\n     graphify-out/graph.json\n     graphify-out/manifest.json'
		);
	});

	it('listing both paths of a file renamed inside graphify-out/', () => {
		git('mv', 'graphify-out/manifest.json', 'graphify-out/manifest.old.json');
		commit({});
		failsWith(
			'paths in the diff:\n     graphify-out/manifest.json\n     graphify-out/manifest.old.json\n'
		);
	});

	it('when a graph-only last commit was built from another commit', () => {
		const grandparent = git('rev-parse', 'HEAD');
		const parent = commit({ 'src/lib/game.ts': 'export const x = 2;\n' });
		refresh(grandparent);
		const err = failsWith(`names built_at_commit "${grandparent}", not its parent ${parent}`);
		expect(err).not.toMatch(/^ {2}[13]\./m);
	});

	it.each([
		['no built_at_commit', '{"directed":false,"nodes":[]}', '""'],
		['a short one', graph('abc1234'), '"abc1234"']
	])('when the graph names %s', (_, text, shown) => {
		commit({ [GRAPH]: text, [REPORT]: title('sutom') });
		failsWith(`2. ${GRAPH} in `, `names built_at_commit ${shown}, not its parent`);
	});

	it('when the last commit deletes graph.json', () => {
		commit({ [GRAPH]: null, [REPORT]: title('sutom') });
		failsWith(`has no ${GRAPH}, so it names no built_at_commit`);
	});

	it('when a stray `graphify update .` is committed alone, titled after the worktree', () => {
		refresh(undefined, 't3-issue-178-graphify-out-guard');
		const err = failsWith(
			`3. ${REPORT} in `,
			'starts with "# Graph Report - t3-issue-178-graphify-out-guard  (2026-11-07)", not "# Graph Report - sutom "'
		);
		expect(err).not.toMatch(/^ {2}[12]\./m);
	});

	it('when the report title only starts with sutom', () => {
		refresh(undefined, 'sutom-old');
		failsWith('starts with "# Graph Report - sutom-old  (2026-11-07)"');
	});

	it('when the last commit deletes the report', () => {
		const parent = git('rev-parse', 'HEAD');
		commit({ [GRAPH]: graph(parent), [REPORT]: null });
		failsWith(`3. `, `has no ${REPORT}`);
	});

	it('when the last commit is a merge whose first-parent diff looks like a refresh', () => {
		const first = git('rev-parse', 'HEAD');
		git('checkout', '-q', '-b', 'side');
		refresh(first);
		git('checkout', '-q', 'feature');
		git('merge', '-q', '--no-ff', '-m', 'merge side', 'side');
		const err = failsWith('has 2 parents, not one', 'after a merge run scripts/refresh-graph.sh');
		expect(err).not.toMatch(/^ {2}[23]\./m);
	});
});

describe('check-graph-diff.sh refuses a wrong call', () => {
	it.each([
		['an unknown option', ['--bogus']],
		['two arguments', ['a', 'b']]
	])('on %s', (_, args) => {
		const { code, err } = run({}, args);
		expect(code).toBe(2);
		expect(err).toContain('usage:');
	});

	it('on a directory outside a git checkout', () => {
		const outside = path.join(base, String(testNumber), 'outside');
		mkdirSync(outside);
		const { code, err } = run({}, [outside]);
		expect(code).toBe(2);
		expect(err).toContain('is not in a git checkout');
	});

	it('from a directory inside the checkout, reading pathspecs from its top', () => {
		commit({ 'src/lib/game.ts': 'export const x = 2;\n', [REPORT]: title('t3-issue-178') });
		const { code, err } = run({}, [path.join(checkout, 'src')]);
		expect(code).toBe(1);
		expect(err).toContain('src/lib/game.ts');
	});

	it('when origin/main is not fetched', () => {
		git('update-ref', '-d', 'refs/remotes/origin/main');
		const { code, err } = run();
		expect(code).toBe(2);
		expect(err).toContain('the base origin/main (GRAPH_CHECK_BASE) names no commit');
		expect(err).toContain('git fetch origin');
	});

	it('on a head that names no commit', () => {
		const { code, err } = run({ GRAPH_CHECK_HEAD: 'no-such-ref' });
		expect(code).toBe(2);
		expect(err).toContain('the head no-such-ref (GRAPH_CHECK_HEAD) names no commit');
	});

	it('on a head that names a tree, not a commit', () => {
		const { code, err } = run({ GRAPH_CHECK_HEAD: 'HEAD:src' });
		expect(code).toBe(2);
		expect(err).toContain('the head HEAD:src (GRAPH_CHECK_HEAD) names no commit');
	});

	it('when git cannot read the trees it diffs, instead of finding no change', () => {
		commit({ [REPORT]: title('t3-issue-178') });
		// Delete the loose object of the head's graphify-out/ tree: the commits
		// stay readable, so only the diff fails.
		const tree = git('rev-parse', 'HEAD:graphify-out');
		rmSync(path.join(checkout, '.git', 'objects', tree.slice(0, 2), tree.slice(2)));
		const { code, out, err } = run();
		expect(code).toBe(2);
		expect(err).toMatch(/git diff \w{12} \w{12} failed/);
		expect(out).toBe('');
	});

	it('when git cannot read the trees of the last commit, instead of finding nothing outside graphify-out/', () => {
		const parent = git('rev-parse', 'HEAD');
		commit({
			'src/lib/game.ts': 'export const x = 2;\n',
			[GRAPH]: graph(parent),
			[REPORT]: title('sutom')
		});
		// The diff under graphify-out/ never reads src/, so only the diff of
		// the last commit outside graphify-out/ fails.
		const tree = git('rev-parse', 'HEAD:src');
		rmSync(path.join(checkout, '.git', 'objects', tree.slice(0, 2), tree.slice(2)));
		const { code, out, err } = run();
		expect(code).toBe(2);
		expect(err).toContain(`git diff ${parent.slice(0, 12)} `);
		expect(out).toBe('');
	});

	it('on a base with no merge base with the head', () => {
		git('checkout', '-q', '--orphan', 'unrelated');
		commit({ 'other.txt': 'x\n' });
		const { code, err } = run({ GRAPH_CHECK_BASE: 'unrelated', GRAPH_CHECK_HEAD: 'feature' });
		expect(code).toBe(2);
		expect(err).toContain('unrelated and feature have no merge base');
	});
});
