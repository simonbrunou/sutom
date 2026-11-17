// @vitest-environment node
// scripts/lint-shell.sh (#214) on a throwaway git repo that each test builds
// afresh: a copy of the repo's own .shellcheckrc and one clean bash script,
// both staged. A test adds or changes one file and asserts the exit code and
// the message, so a rule removed from the script or a check removed from
// .shellcheckrc turns its own test red. The cases run the real shellcheck:
// without it on PATH they fail, naming the dev shell, rather than skip.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = path.join(repo, 'scripts', 'lint-shell.sh');

// The tests' git and the script read no GIT_* variable of a hook that runs
// them.
const cleanEnv = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))
);

const CLEAN = '#!/usr/bin/env bash\nset -eu\necho "$1"\n';
// SC2086, a check ShellCheck runs by default: $1 unquoted, on line 3.
const UNQUOTED = '#!/usr/bin/env bash\nset -eu\necho $1\n';
// SC2312, which only .shellcheckrc's enable=check-extra-masked-returns turns
// on: the loop never sees the exit status of the command it reads from.
const MASKED = '#!/usr/bin/env bash\nwhile read -r l; do echo "$l"; done < <(false)\n';

const base = mkdtempSync(path.join(tmpdir(), 'lint-shell-'));
// The current test's checkout: base/<test number>/sutom.
let checkout = '';
let testNumber = 0;

// Checked in beforeEach, not beforeAll: a beforeAll that throws makes vitest
// report every case as skipped.
const hasShellcheck = spawnSync('shellcheck', ['--version']).error === undefined;

afterAll(() => {
	rmSync(base, { recursive: true, force: true });
});

function git(...args: string[]): string {
	return execFileSync('git', args, { cwd: checkout, encoding: 'utf8', env: cleanEnv }).trim();
}

// Write each file and stage everything: the lint reads what git ls-files
// lists, which a staged file is.
function stage(files: Record<string, string>): void {
	write(files);
	git('add', '-A');
}

function write(files: Record<string, string>): void {
	for (const [file, text] of Object.entries(files)) {
		const p = path.join(checkout, file);
		mkdirSync(path.dirname(p), { recursive: true });
		writeFileSync(p, text);
	}
}

beforeEach(() => {
	if (!hasShellcheck) {
		throw new Error(
			'shellcheck is not on PATH: run the tests in the dev shell (`nix develop`, or direnv), which provides it'
		);
	}
	testNumber += 1;
	checkout = path.join(base, String(testNumber), 'sutom');
	mkdirSync(checkout, { recursive: true });
	git('init', '-q');
	copyFileSync(path.join(repo, '.shellcheckrc'), path.join(checkout, '.shellcheckrc'));
	stage({ 'scripts/ok.sh': CLEAN });
});

function run(args: string[] = [checkout], env: NodeJS.ProcessEnv = cleanEnv) {
	const p = spawnSync(scriptPath, args, { encoding: 'utf8', env });
	return { code: p.status, out: p.stdout, err: p.stderr };
}

function passes(count: number): void {
	const { code, out, err } = run();
	expect(code, `${out}${err}`).toBe(0);
	expect(out).toBe(`lint-shell: ${count} bash scripts pass ShellCheck with .shellcheckrc\n`);
	expect(err).toBe('');
}

function finds(...lines: string[]): void {
	const { code, out, err } = run();
	expect(code, `${out}${err}`).toBe(1);
	for (const line of lines) expect(out).toContain(line);
}

function refuses(...messages: string[]): void {
	const { code, out, err } = run();
	expect(code, `${out}${err}`).toBe(2);
	expect(out).toBe('');
	for (const message of messages) expect(err).toContain(message);
}

// A PATH holding a shim for `name` that runs `body` in sh, then the real PATH.
function shim(name: string, body: string): NodeJS.ProcessEnv {
	const bin = path.join(base, String(testNumber), 'shim');
	mkdirSync(bin, { recursive: true });
	writeFileSync(path.join(bin, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
	return { ...cleanEnv, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
}

function which(name: string): string {
	return execFileSync('sh', ['-c', `command -v ${name}`], { encoding: 'utf8' }).trim();
}

describe('lint-shell.sh passes', () => {
	it('on clean bash scripts, printing one line', () => {
		passes(1);
	});

	it("on this repo's own scripts, as CI runs it", () => {
		const { code, out, err } = run([repo]);
		expect(code, `${out}${err}`).toBe(0);
		expect(out).toMatch(/^lint-shell: \d+ bash scripts pass ShellCheck with \.shellcheckrc\n$/);
	});

	it('on a finding under a shellcheck disable directive', () => {
		stage({
			'scripts/quiet.sh': '#!/usr/bin/env bash\n# shellcheck disable=SC2086\necho $1\n'
		});
		passes(2);
	});

	it('skipping a script of another interpreter, and a file with no shebang outside .sh', () => {
		stage({
			'scripts/tool.mjs': '#!/usr/bin/env node\necho $1 < <(false)\n',
			'.envrc': 'use flake\necho $1\n'
		});
		passes(1);
	});

	it('skipping a shebang whose shell word starts after character 256, which Linux never reads', () => {
		stage({ 'bin/run': `#!/usr/bin/env${' '.repeat(242)}sh\necho $1\n` });
		passes(1);
	});

	it('skipping an untracked script', () => {
		write({ 'scripts/new.sh': UNQUOTED });
		passes(1);
	});
});

describe('lint-shell.sh fails with findings', () => {
	it('on a default check, naming the file, line and code', () => {
		stage({ 'scripts/bad.sh': UNQUOTED });
		finds('scripts/bad.sh:3:6: ', '[SC2086]');
	});

	it('on a masked exit status, which .shellcheckrc enables', () => {
		stage({ 'scripts/masked.sh': MASKED });
		finds('scripts/masked.sh:2:', '[SC2312]');
	});

	it('on a new script anywhere, with no list to edit, whatever its name', () => {
		stage({ 'tools/deep/new.sh': UNQUOTED, 'bin/tool': UNQUOTED });
		finds('tools/deep/new.sh:3:6: ', 'bin/tool:3:6: ');
	});
});

describe('lint-shell.sh reads the checks from .shellcheckrc', () => {
	it('so a masked exit status passes without enable=check-extra-masked-returns', () => {
		stage({ '.shellcheckrc': '', 'scripts/masked.sh': MASKED });
		passes(2);
	});

	it('and refuses to run without it', () => {
		rmSync(path.join(checkout, '.shellcheckrc'));
		stage({ 'scripts/bad.sh': UNQUOTED });
		refuses('no .shellcheckrc at the top of');
	});
});

describe('lint-shell.sh refuses a shell script it cannot classify', () => {
	it.each([
		['#!/bin/bash'],
		['#!/usr/bin/env -S bash -e'],
		['#!/usr/bin/env bash\r'],
		['#!/bin/sh'],
		['#!/usr/bin/env zsh'],
		['#! /bin/dash'],
		['#!/bin/ash'],
		['#!/bin/ksh'],
		['#!/bin/mksh'],
		['#!/bin/busybox'],
		// The shell word ends at character 256, the last the lint reads.
		[`#!/usr/bin/env${' '.repeat(240)}sh`]
	])('%j', (shebang) => {
		stage({ 'bin/run': `${shebang}\necho "$1"\n` });
		refuses('bin/run: a shell shebang this lint does not read', 'lints none');
	});

	it('a .sh file with no shebang', () => {
		stage({ 'scripts/lib.sh': 'echo "$1"\n' });
		refuses('scripts/lib.sh: a .sh file with no shebang');
	});

	it('naming each one', () => {
		stage({ 'a.sh': '#!/bin/sh\n', 'b.sh': '\n' });
		refuses('  a.sh: ', '  b.sh: ');
	});
});

describe('lint-shell.sh refuses to check', () => {
	it.each([[['-h']], [['a', 'b']]])('on %j', (args) => {
		const { code, err } = run(args);
		expect(code).toBe(2);
		expect(err).toContain('usage: scripts/lint-shell.sh [<checkout>]');
	});

	it('on a directory outside a git checkout', () => {
		const outside = path.join(base, String(testNumber), 'outside');
		mkdirSync(outside);
		const { code, err } = run([outside]);
		expect(code).toBe(2);
		expect(err).toContain('is not in a git checkout');
	});

	it('when no tracked file is a bash script', () => {
		git('rm', '-q', '--cached', 'scripts/ok.sh');
		refuses('no tracked file starts with `#!/usr/bin/env bash`');
	});

	it('when a tracked file is missing from the working tree', () => {
		stage({ 'scripts/gone.sh': CLEAN });
		rmSync(path.join(checkout, 'scripts/gone.sh'));
		refuses('cannot read scripts/gone.sh, which git ls-files lists');
	});

	it('without shellcheck on PATH, naming the dev shell', () => {
		// A PATH holding bash, for the script's `#!/usr/bin/env bash`, and git.
		const bin = path.join(base, String(testNumber), 'bin');
		mkdirSync(bin);
		symlinkSync(which('bash'), path.join(bin, 'bash'));
		symlinkSync(which('git'), path.join(bin, 'git'));
		const { code, err } = run([checkout], { ...cleanEnv, PATH: bin });
		expect(code).toBe(2);
		expect(err).toContain('no shellcheck on PATH: enter the dev shell (`nix develop`');
	});

	it('when git cannot list the tracked files', () => {
		const env = shim(
			'git',
			`[ "$1" = ls-files ] && { echo "git: shim fails" >&2; exit 128; }\nexec ${which('git')} "$@"`
		);
		const { code, out, err } = run([checkout], env);
		expect(code).toBe(2);
		expect(out).toBe('');
		expect(err).toContain('git ls-files cannot list the tracked files');
	});

	it('when mktemp cannot create the list file', () => {
		const { code, out, err } = run([checkout], shim('mktemp', 'exit 1'));
		expect(code).toBe(2);
		expect(out).toBe('');
		expect(err).toContain('mktemp cannot create a file');
	});

	it('when shellcheck fails other than with findings', () => {
		const env = shim('shellcheck', 'echo "shellcheck: shim fails" >&2; exit 3');
		const { code, out, err } = run([checkout], env);
		expect(code).toBe(2);
		expect(out).toBe('');
		expect(err).toContain('shellcheck failed with exit 3, not with findings');
	});
});
