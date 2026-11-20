// @vitest-environment node
// scripts/check-push-repeats-pr.ts (#239) against a small git repo written per test. The base
// repo holds the shapes the script must pass, as this repo's CI has them: a workflow on `push`
// and `pull_request` to `main`, and a runner variable name in Markdown. Each other case edits one file into one
// difference and asserts exit 1 and the line that names it, so removing any rule from the script
// turns a case red. The runner variable names are built from parts here, as in the script, so
// neither file holds one and the script reads both.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const SCRIPT = fileURLToPath(new URL('check-push-repeats-pr.ts', import.meta.url));
const CI = '.forgejo/workflows/ci.yml';
const [GH, FJ, FG] = ['GITHUB', 'FORGEJO', 'FORGE'].map((name) => `${name}_`);
const LIB = ['@actions', 'github'].join('/');
const EV = ['event', 'Name'].join('');

// The repos below see neither the caller's git config, nor a GIT_* variable a hook set, nor a
// NODE_PATH that could find the yaml package for the copy that must lack it.
const ENV: Record<string, string | undefined> = {
	...Object.fromEntries(
		Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_') && key !== 'NODE_PATH')
	),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	LC_ALL: 'C'
};

const root = mkdtempSync(path.join(tmpdir(), 'check-push-repeats-pr-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const baseCi = [
	'name: CI',
	'on:',
	'  pull_request:',
	'    branches: [main]',
	'  push:',
	'    branches: [main]',
	'jobs:',
	'  test:',
	'    runs-on: ubuntu-latest',
	'    steps:',
	'      - uses: actions/checkout@v7',
	'        with:',
	'          fetch-depth: 0',
	'      - run: npm run test',
	''
].join('\n');
const base: Record<string, string> = {
	[CI]: baseCi,
	'README.md': `CI reads ${GH}TOKEN; Markdown is not run.\n`,
	'scripts/build.sh': 'echo build\n'
};

let count = 0;
// Commits `files` over the base repo (a null value leaves a base file out) in a new repo and
// returns its directory and the commit's SHA.
function commitRepo(files: Record<string, string | null>) {
	const dir = path.join(root, String(count++));
	for (const [file, content] of Object.entries({ ...base, ...files })) {
		if (content === null) continue;
		mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
		writeFileSync(path.join(dir, file), content);
	}
	const git = (...args: string[]) =>
		execFileSync('git', args, { cwd: dir, env: ENV, encoding: 'utf8' });
	git('init', '-q', '-b', 'main');
	git('add', '-A');
	git(
		'-c',
		'user.name=test',
		'-c',
		'user.email=test@example.com',
		'-c',
		'commit.gpgsign=false',
		'-c',
		'core.hooksPath=/dev/null',
		'commit',
		'-qm',
		'c'
	);
	return { dir, sha: git('rev-parse', 'HEAD').trim() };
}

function run(cwd: string, args: string[], script = SCRIPT) {
	const proc = spawnSync(process.execPath, [script, ...args], { cwd, env: ENV, encoding: 'utf8' });
	return { status: proc.status, out: proc.stdout + proc.stderr };
}

// Commits `files` over the base repo and runs `script` on that commit from `subdir` of the repo.
function check(files: Record<string, string | null> = {}, { script = SCRIPT, subdir = '' } = {}) {
	const { dir, sha } = commitRepo(files);
	return run(path.join(dir, subdir), [sha], script);
}

// Replaces `from` in `text`, failing the test when `from` is not there, so a case never runs on
// the unedited base by mistake.
function edit(text: string, from: string | RegExp, to: string) {
	const out = text.replace(from, to);
	expect(out).not.toBe(text);
	return out;
}

const ciWith = (...extraLines: string[]) => `${baseCi}${extraLines.join('\n')}\n`;

function expectPass(files: Record<string, string | null>, options?: { subdir?: string }) {
	const { status, out } = check(files, options);
	expect(out).toMatch(/the push run repeats the PR run/);
	expect(status).toBe(0);
}

function expectDifference(
	files: Record<string, string | null>,
	pattern: RegExp,
	options?: { subdir?: string }
) {
	const { status, out } = check(files, options);
	expect(out).toMatch(pattern);
	expect(out).toMatch(/wait on main's run/);
	expect(status).toBe(1);
}

describe('check-push-repeats-pr passes', () => {
	it("the base repo: this repo's triggers", () => {
		const { status, out } = check();
		expect(out).toMatch(
			/the push run repeats the PR run \(1 workflow file\(s\), 1 file\(s\) scanned\)/
		);
		expect(status).toBe(0);
	});
	it('triggers written as a list', () => {
		const ci = edit(
			baseCi,
			/on:\n {2}pull_request:\n {4}branches: \[main\]\n {2}push:\n {4}branches: \[main\]/,
			'on: [push, pull_request]'
		);
		expectPass({ [CI]: ci });
	});
	it('push and pull_request with no filter, and workflow_dispatch and schedule beside them', () => {
		const ci = edit(
			baseCi,
			'  pull_request:\n    branches: [main]\n  push:\n    branches: [main]\n',
			"  pull_request:\n  push:\n  workflow_dispatch:\n  schedule:\n    - cron: '0 3 * * *'\n"
		);
		expectPass({ [CI]: ci });
	});
	it('branches written as a string under both triggers', () => {
		expectPass({ [CI]: baseCi.replaceAll('branches: [main]', 'branches: main') });
	});
	it('an expression and an if in a comment, which the runner never reads', () => {
		expectPass({ [CI]: ciWith('      # if: ${{ github.event_name }}', '      - run: echo hi') });
	});
	it('run from a subfolder of the repo', () => {
		expectPass({}, { subdir: 'scripts' });
	});
});

describe('check-push-repeats-pr finds a difference in the triggers', () => {
	it('no workflow at all', () => {
		expectDifference({ [CI]: null }, /\.forgejo\/workflows\/: no workflow file/);
	});
	it('a workflow with no on:', () => {
		expectDifference(
			{ '.forgejo/workflows/empty.yml': 'jobs: {}\n' },
			/empty\.yml: no on: triggers/
		);
	});
	it('a workflow that runs only on push', () => {
		expectDifference(
			{ '.forgejo/workflows/deploy.yml': 'on: push\njobs: {}\n' },
			/deploy\.yml: no pull_request trigger/
		);
	});
	it('a push-only workflow in a subfolder of .forgejo/workflows', () => {
		expectDifference(
			{ '.forgejo/workflows/sub/deploy.yaml': 'on: push\njobs: {}\n' },
			/sub\/deploy\.yaml: no pull_request trigger/
		);
	});
	it('a push-only workflow, run from a subfolder of the repo', () => {
		expectDifference(
			{ '.forgejo/workflows/deploy.yml': 'on: push\njobs: {}\n' },
			/deploy\.yml: no pull_request trigger/,
			{ subdir: 'scripts' }
		);
	});
	it('a workflow that runs only on pull_request', () => {
		expectDifference(
			{ '.forgejo/workflows/lint.yml': 'on:\n  pull_request:\njobs: {}\n' },
			/lint\.yml: no push trigger/
		);
	});
	it('a trigger other than push, pull_request, schedule and workflow_dispatch', () => {
		const ci = edit(baseCi, 'jobs:', '  workflow_run:\n    workflows: [Build]\njobs:');
		expectDifference({ [CI]: ci }, /ci\.yml: trigger workflow_run/);
	});
	for (const [what, filter] of [
		['a paths filter', "    paths: ['src/**']"],
		['a types filter beside branches: [main]', '    branches: [main]\n    types: [opened]'],
		['main and another branch', '    branches: [main, dev]'],
		['another branch only', '    branches: dev']
	]) {
		it(`pull_request with ${what}`, () => {
			const ci = edit(baseCi, '    branches: [main]\n  push:', `${filter}\n  push:`);
			expectDifference(
				{ [CI]: ci },
				/ci\.yml: pull_request has a filter beyond branches: \[main\]/
			);
		});
		it(`push with ${what}`, () => {
			const ci = edit(baseCi, '    branches: [main]\njobs:', `${filter}\njobs:`);
			expectDifference({ [CI]: ci }, /ci\.yml: push has a filter beyond branches: \[main\]/);
		});
	}
	it("push with no filter beside pull_request's branches: [main]", () => {
		const ci = edit(baseCi, '  push:\n    branches: [main]\n', '  push:\n');
		expectDifference({ [CI]: ci }, /ci\.yml: only pull_request has a filter/);
	});
	it("pull_request with no filter beside push's branches: [main]", () => {
		const ci = edit(baseCi, '  pull_request:\n    branches: [main]\n', '  pull_request:\n');
		expectDifference({ [CI]: ci }, /ci\.yml: only push has a filter/);
	});
	it('a job that calls a reusable workflow', () => {
		const ci = `${baseCi}  deploy:\n    uses: owner/repo/.forgejo/workflows/deploy.yml@main\n`;
		expectDifference(
			{ [CI]: ci },
			/ci\.yml: job deploy calls a reusable workflow: owner\/repo\/\.forgejo\/workflows\/deploy\.yml@main/
		);
	});
});

describe('check-push-repeats-pr finds a YAML form it does not read', () => {
	it('a workflow that is not YAML', () => {
		expectDifference(
			{ '.forgejo/workflows/broken.yml': 'on: [push\n' },
			/broken\.yml: not readable as YAML/
		);
	});
	it('a duplicate key, which would hide the first if:', () => {
		const ci = ciWith('      - run: echo push', '        if: github.ref', '        if: github.ref');
		expectDifference({ [CI]: ci }, /ci\.yml: not readable as YAML \(Map keys must be unique/);
	});
	it('an unknown tag, which YAML reads with a warning', () => {
		expectDifference(
			{ [CI]: ciWith('      - run: !event echo hi') },
			/ci\.yml: not readable as YAML \(Unresolved tag: !event/
		);
	});
	it('a !!binary value, which YAML decodes into an expression', () => {
		const encoded = Buffer.from('echo ${{ github.event_name }}').toString('base64');
		expectDifference(
			{ [CI]: ciWith(`      - run: !!binary ${encoded}`) },
			/ci\.yml:15: \.jobs\.test\.steps\[2\]\.run: a tag \(tag:yaml\.org,2002:binary\)/
		);
	});
	it('an if: that is an alias', () => {
		const ci = ciWith(
			'      - run: echo a',
			'        env: { C: &cond "github.event_name == \'push\'" }',
			'      - run: echo b',
			'        if: *cond'
		);
		expectDifference({ [CI]: ci }, /ci\.yml:18: \.jobs\.test\.steps\[3\]\.if: an alias \(\*cond\)/);
	});
	it('a merge key that pulls in an alias', () => {
		const ci = ciWith('      - &step { run: echo a }', '      - <<: *step', '        name: b');
		expectDifference({ [CI]: ci }, /steps\[3\]\.<<: an alias \(\*step\)/);
	});
	it('a merge key with a mapping of its own', () => {
		const ci = ciWith('      - <<: { run: echo a }', '        name: b');
		expectDifference(
			{ [CI]: ci },
			/ci\.yml:15: \.jobs\.test\.steps\[2\]\.<<: a merge key, which this script does not follow/
		);
	});
	it('aliases that expand past what the yaml package resolves', () => {
		const ten = (item: string) => `[${Array(10).fill(item).join(', ')}]`;
		const ci = `${baseCi}x-a: &a ${ten('x')}\nx-b: &b ${ten('*a')}\nx-c: ${ten('*b')}\n`;
		expectDifference({ [CI]: ci }, /ci\.yml: not readable as YAML \(Excessive alias count/);
	});
});

describe('check-push-repeats-pr finds an if', () => {
	it('an if: on github.event_name', () => {
		const ci = ciWith('      - run: echo push', "        if: github.event_name == 'push'");
		expectDifference(
			{ [CI]: ci },
			/ci\.yml:16: \.jobs\.test\.steps\[2\]\.if: an if: github\.event_name == 'push'/
		);
	});
	it('a PR-only step that reads the base ref and head sha of the PR', () => {
		const ci = ciWith(
			'      - run: scripts/pr-only.sh',
			"        if: github.event_name == 'pull_request'",
			'        env:',
			'          BASE: origin/${{ github.base_ref }}',
			'          HEAD: ${{ github.event.pull_request.head.sha }}'
		);
		expectDifference(
			{ [CI]: ci },
			/steps\[2\]\.if: an if: github\.event_name == 'pull_request'[\s\S]*steps\[2\]\.env\.BASE: an expression: \$\{\{ github\.base_ref \}\}[\s\S]*steps\[2\]\.env\.HEAD: an expression: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/
		);
	});
	it('an if: that reads no event', () => {
		const ci = ciWith('      - run: npm ci', "        if: steps.cache.outputs.cache-hit != 'true'");
		expectDifference({ [CI]: ci }, /steps\[2\]\.if: an if: steps\.cache/);
	});
	it('an if: always()', () => {
		expectDifference(
			{ [CI]: ciWith('      - run: echo done', '        if: always()') },
			/steps\[2\]\.if: an if: always\(\)/
		);
	});
	it('an if: on the job', () => {
		const ci = edit(
			baseCi,
			'    runs-on:',
			"    if: github.ref == 'refs/heads/main'\n    runs-on:"
		);
		expectDifference({ [CI]: ci }, /ci\.yml:9: \.jobs\.test\.if: an if: github\.ref/);
	});
	it('an if key written in quotes', () => {
		const ci = ciWith('      - run: echo push', '        "if": github.ref == \'refs/heads/main\'');
		expectDifference({ [CI]: ci }, /steps\[2\]\.if: an if:/);
	});
	it('an if key with a space before its colon', () => {
		const ci = ciWith('      - run: echo push', "        if : github.ref == 'refs/heads/main'");
		expectDifference({ [CI]: ci }, /steps\[2\]\.if: an if:/);
	});
	it('an if written as an explicit key', () => {
		const ci = ciWith(
			'      - run: echo push',
			'        ? if',
			"        : github.ref == 'refs/heads/main'"
		);
		expectDifference({ [CI]: ci }, /ci\.yml:16: \.jobs\.test\.steps\[2\]\.if: an if:/);
	});
	it('an if in a flow mapping left open at the end of its line', () => {
		const ci = ciWith(
			'      - { run: echo a,',
			'          if: "github.ref == \'refs/heads/main\'" }'
		);
		expectDifference({ [CI]: ci }, /ci\.yml:16: \.jobs\.test\.steps\[2\]\.if: an if:/);
	});
});

describe('check-push-repeats-pr finds an expression', () => {
	it('github.ref in an env', () => {
		const ci = ciWith('      - run: echo ref', '        env:', '          REF: ${{ github.ref }}');
		expectDifference(
			{ [CI]: ci },
			/ci\.yml:17: \.jobs\.test\.steps\[2\]\.env\.REF: an expression: \$\{\{ github\.ref \}\}/
		);
	});
	it("the index form github['event_name']", () => {
		expectDifference(
			{ [CI]: ciWith("      - run: echo ${{ github['event_name'] }}") },
			/ci\.yml:15: .*an expression/
		);
	});
	it('an expression on a step output that follows the event', () => {
		const ci = ciWith(
			'      - run: npm run e2e',
			"        continue-on-error: ${{ steps.co.outputs.ref != 'refs/heads/main' }}"
		);
		expectDifference({ [CI]: ci }, /ci\.yml:16: .*continue-on-error: an expression/);
	});
	it('the forgejo and forge contexts', () => {
		const ci = ciWith(
			'      - run: echo ${{ forgejo.event_name }}',
			'      - run: echo ${{ forge.ref }}'
		);
		expectDifference({ [CI]: ci }, /ci\.yml:15: .*an expression[\s\S]*ci\.yml:16: .*an expression/);
	});
	it('an expression split over lines of a folded block', () => {
		const ci = ciWith('      - run: >-', '          echo ${{', '          github.event_name }}');
		expectDifference({ [CI]: ci }, /ci\.yml:15: .*an expression: \$\{\{ github\.event_name \}\}/);
	});
	it('an expression split over lines of a literal block, which keeps the line break', () => {
		const ci = ciWith('      - run: |', '          echo ${{', '          github.event_name }}');
		expectDifference({ [CI]: ci }, /ci\.yml:15: .*an expression: \$\{\{\ngithub\.event_name \}\}/);
	});
	it('an expression in a quoted string that runs onto the next line', () => {
		const ci = ciWith('      - run: "echo ${{', '          github.event_name }}"');
		expectDifference({ [CI]: ci }, /ci\.yml:15: .*an expression: \$\{\{ github\.event_name \}\}/);
	});
	it('an expression spelled with a YAML escape', () => {
		const ci = ciWith('      - run: "echo \\x24{{ github.event_name }}"');
		expectDifference({ [CI]: ci }, /ci\.yml:15: .*an expression: \$\{\{ github\.event_name \}\}/);
	});
	it('an expression in a key', () => {
		const ci = ciWith('      - run: echo key', '        env:', '          ${{ github.ref }}: x');
		expectDifference({ [CI]: ci }, /\(key\): an expression: \$\{\{ github\.ref \}\}/);
	});
	it('an expression in another YAML file under .forgejo', () => {
		expectDifference(
			{ '.forgejo/shared/env.yml': 'REF: ${{ github.ref }}\n' },
			/\.forgejo\/shared\/env\.yml:1: \.REF: an expression/
		);
	});
	it('an if: in a local action under .forgejo', () => {
		const action =
			"runs:\n  using: composite\n  steps:\n    - run: echo x\n      if: env.X == '1'\n";
		expectDifference(
			{ '.forgejo/actions/setup/action.yml': action },
			/\.forgejo\/actions\/setup\/action\.yml:5: \.runs\.steps\[0\]\.if: an if:/
		);
	});
	it('an expression in an action.yaml outside .forgejo', () => {
		const action =
			'runs:\n  using: composite\n  steps:\n    - run: echo ${{ github.event_name }}\n';
		expectDifference(
			{ 'actions/setup/action.yaml': action },
			/actions\/setup\/action\.yaml:4: .*an expression/
		);
	});
	it('an if: in an action.yml outside .forgejo', () => {
		const action =
			"runs:\n  using: composite\n  steps:\n    - run: echo x\n      if: env.X == '1'\n";
		expectDifference(
			{ 'actions/build/action.yml': action },
			/actions\/build\/action\.yml:5: \.runs\.steps\[0\]\.if: an if:/
		);
	});
	it('a step that uses actions/github-script', () => {
		const ci = ciWith(
			'      - uses: actions/github-script@v7',
			'        with:',
			"          script: core.info('hi')"
		);
		expectDifference(
			{ [CI]: ci },
			/ci\.yml:15: \.jobs\.test\.steps\[2\]\.uses: runs code that gets the event: actions\/github-script@v7/
		);
	});
});

describe('check-push-repeats-pr finds a file that reads the event', () => {
	it('a script that reads the ref from the runner', () => {
		expectDifference(
			{ 'scripts/build.sh': `echo build\necho "$${GH}REF"\n` },
			/scripts\/build\.sh:2:.*names a runner variable/
		);
	});
	it('a test that reads the event from the runner', () => {
		expectDifference(
			{ 'src/e2e.test.ts': `if (process.env.${GH}EVENT_NAME === 'push') run();\n` },
			/src\/e2e\.test\.ts:1:.*names a runner variable/
		);
	});
	it('a module that reads the forgejo and forge variable names', () => {
		const env = `export const ref = process.env.${FJ}REF;\nexport const e = process.env.${FG}EVENT_NAME;\n`;
		expectDifference(
			{ 'src/env.ts': env },
			/src\/env\.ts:1:.*names a runner variable[\s\S]*src\/env\.ts:2:.*names a runner variable/
		);
	});
	it('a binary file that holds a runner variable name', () => {
		expectDifference(
			{ 'bin/tool': `\0\x01${GH}REF\0` },
			/bin\/tool matches: reads the event or names a runner variable/
		);
	});
	it("a script under .forgejo that loads the actions toolkit's github module", () => {
		expectDifference(
			{ '.forgejo/scripts/gate.js': `const { context } = require('${LIB}');\n` },
			/\.forgejo\/scripts\/gate\.js:1:.*reads the event/
		);
	});
	it("a module that reads the toolkit context's event property", () => {
		expectDifference(
			{ 'src/gate.ts': `export const onPush = (c: { ${EV}: string }) => c.${EV} === 'push';\n` },
			/src\/gate\.ts:1:.*reads the event/
		);
	});
});

it('the script and this test hold none of the names they search for, so the script reads both', () => {
	const names = new RegExp([GH, FJ, FG, LIB, EV].join('|'));
	for (const file of [SCRIPT, fileURLToPath(import.meta.url)]) {
		expect(readFileSync(file, 'utf8')).not.toMatch(names);
	}
});

describe('check-push-repeats-pr exits 2', () => {
	it('with no argument', () => {
		const { dir } = commitRepo({});
		const { status, out } = run(dir, []);
		expect(out).toMatch(/usage: node scripts\/check-push-repeats-pr\.ts <pushed SHA>/);
		expect(status).toBe(2);
	});
	it('with two arguments', () => {
		const { dir, sha } = commitRepo({});
		const { status, out } = run(dir, [sha, sha]);
		expect(out).toMatch(/usage:/);
		expect(status).toBe(2);
	});
	it('on a SHA the repo lacks', () => {
		const { dir } = commitRepo({});
		const { status, out } = run(dir, ['0123456789abcdef0123456789abcdef01234567']);
		expect(out).toMatch(/unknown commit: 0123456789abcdef/);
		expect(status).toBe(2);
	});
	it('outside a git repo', () => {
		const dir = path.join(root, 'nogit');
		mkdirSync(dir);
		const proc = spawnSync(process.execPath, [SCRIPT, 'HEAD'], {
			cwd: dir,
			env: { ...ENV, GIT_CEILING_DIRECTORIES: root },
			encoding: 'utf8'
		});
		expect(proc.stderr).toMatch(/git rev-parse --show-toplevel failed/);
		expect(proc.status).toBe(2);
	});
	it('when the yaml package is missing', () => {
		const copyDir = path.join(root, 'noyaml');
		mkdirSync(copyDir);
		const copy = path.join(copyDir, 'check.ts');
		copyFileSync(SCRIPT, copy);
		const { status, out } = check({}, { script: copy });
		expect(out).toMatch(/cannot load the yaml package; run npm ci first/);
		expect(status).toBe(2);
	});
});
