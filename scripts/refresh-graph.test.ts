// @vitest-environment node
// scripts/refresh-graph.sh (#172) against a stub graphify, in a git checkout
// named like a T3 worktree that each test builds afresh. The stub writes what
// graphify 0.9.97 writes that the script checks: the report titled with the
// name of the path it was given, the two tracked label files and the three
// per-clone files the repo's own .gitignore must keep out of git. A test
// changes the stub or the checkout into one failure and asserts the exit code
// and the message.
import { execFileSync, spawnSync } from 'node:child_process';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = path.join(repo, 'scripts', 'refresh-graph.sh');
const REPORT = 'graphify-out/GRAPH_REPORT.md';

// STUB_MODE: ok, cwd-title (titles the report after the cwd, as `graphify
// update .` does), sidecar (also writes a file the .gitignore does not know),
// fail. Every call appends its arguments to $STUB_LOG and the physical path
// its path argument leads to to $STUB_LOG.where.
const stub = `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_LOG"
[ "$1" = update ] || exit 2
shift
[ "$1" = --force ] && shift
(cd "$1" && pwd -P) >> "$STUB_LOG.where"
out="$1/graphify-out"
if [ -e "$out/.graphify_build_state.json" ]; then
  echo "stub: a build stamp makes graphify skip the rebuild" >&2
  exit 0
fi
[ "$STUB_MODE" = fail ] && exit 1
mkdir -p "$out"
label=$(basename "$1")
[ "$STUB_MODE" = cwd-title ] && label=$(basename "$PWD")
printf '# Graph Report - %s  (2026-10-30)\\n' "$label" > "$out/GRAPH_REPORT.md"
echo '{"0": "new"}' > "$out/.graphify_labels.json.sig"
echo '{}' > "$out/.graphify_labels.json"
echo '{}' > "$out/.graphify_build_state.json"
echo '{}' > "$out/.graphify_labels.pending.json"
printf '%s' "$1" > "$out/.graphify_root"
[ "$STUB_MODE" = sidecar ] && echo '{}' > "$out/.graphify_new.json"
exit 0
`;

const base = mkdtempSync(path.join(tmpdir(), 'refresh-graph-'));
const bin = path.join(base, 'bin');
mkdirSync(bin);
writeFileSync(path.join(bin, 'graphify'), stub);
chmodSync(path.join(bin, 'graphify'), 0o755);

// The current test's checkout, the TMPDIR the script makes its symlink in, and
// the stub's log: base/<test number>/...
let checkout = '';
let tmp = '';
let log = '';
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
		{ cwd: checkout, encoding: 'utf8' }
	);
}

function write(file: string, text: string): void {
	mkdirSync(path.dirname(path.join(checkout, file)), { recursive: true });
	writeFileSync(path.join(checkout, file), text);
}

beforeEach(() => {
	testNumber += 1;
	const dir = path.join(base, String(testNumber));
	checkout = path.join(dir, 't3-issue-172-graphify');
	tmp = path.join(dir, 'tmp');
	log = path.join(dir, 'graphify.log');
	mkdirSync(checkout, { recursive: true });
	mkdirSync(tmp);
	git('init', '-q');
	write('.gitignore', readFileSync(path.join(repo, '.gitignore'), 'utf8'));
	write('src/lib/game.ts', 'export const x = 1;\n');
	write(REPORT, '# Graph Report - sutom  (2026-10-13)\n');
	write('graphify-out/.graphify_labels.json', '{}\n');
	write('graphify-out/.graphify_labels.json.sig', '{"0": "old"}\n');
	git('add', '-A');
	git('commit', '-q', '-m', 'fixture');
});

function run(args: string[] = [checkout], mode = 'ok') {
	const env = {
		...process.env,
		PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}`,
		TMPDIR: tmp,
		STUB_LOG: log,
		STUB_MODE: mode
	};
	const p = spawnSync(scriptPath, args, { encoding: 'utf8', env });
	return { code: p.status, out: p.stdout, err: p.stderr };
}

function stubCalls(): string[] {
	return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
}

function untracked(): string {
	return git('status', '--porcelain', '--untracked-files=all', '--', 'graphify-out')
		.split('\n')
		.filter((line) => line.startsWith('??'))
		.join('\n');
}

describe('refresh-graph.sh passes', () => {
	it('from a checkout named like a T3 worktree, titling the report sutom', () => {
		const { code, out, err } = run();
		expect(code, err).toBe(0);
		expect(out).toContain('titled sutom');
		expect(readFileSync(path.join(checkout, REPORT), 'utf8')).toMatch(
			/^# Graph Report - sutom {2}\(/
		);
		expect(stubCalls()).toEqual([expect.stringMatching(/^update \/\S+\/sutom$/)]);
		// The path graphify got leads to the checkout, through a symlink the script removed.
		expect(readFileSync(`${log}.where`, 'utf8')).toBe(`${realpathSync(checkout)}\n`);
		expect(readdirSync(tmp)).toEqual([]);
	});

	it('leaving no file under graphify-out/ that git neither tracks nor ignores', () => {
		expect(run().code).toBe(0);
		expect(untracked()).toBe('');
		expect(git('status', '--porcelain', '--', 'graphify-out')).toContain(
			'graphify-out/.graphify_labels.json.sig'
		);
	});

	it('deleting .graphify_root, which names the removed symlink', () => {
		expect(run().code).toBe(0);
		expect(existsSync(path.join(checkout, 'graphify-out/.graphify_root'))).toBe(false);
	});

	it('after a stray run, by deleting the build stamp that would make graphify skip', () => {
		write(REPORT, '# Graph Report - t3-issue-172-graphify  (2026-10-29)\n');
		write('graphify-out/.graphify_build_state.json', '{}\n');
		const { code, err } = run();
		expect(code, err).toBe(0);
		expect(readFileSync(path.join(checkout, REPORT), 'utf8')).toMatch(/^# Graph Report - sutom /);
	});

	it('with uncommitted changes under graphify-out/', () => {
		write(REPORT, 'stale\n');
		expect(run().code).toBe(0);
	});

	it('handing --force on to graphify', () => {
		expect(run(['--force', checkout]).code).toBe(0);
		expect(stubCalls()[0]).toMatch(/^update --force \S+\/sutom$/);
	});
});

describe('refresh-graph.sh fails', () => {
	it('before graphify runs, when a file outside graphify-out/ has uncommitted changes', () => {
		write('src/lib/game.ts', 'export const x = 2;\n');
		const { code, err } = run();
		expect(code).toBe(1);
		expect(err).toContain('commit these changes first');
		expect(err).toContain('src/lib/game.ts');
		expect(stubCalls()).toEqual([]);
	});

	it('before graphify runs, when an untracked file sits outside graphify-out/', () => {
		write('src/lib/new.ts', 'export {};\n');
		const { code, err } = run();
		expect(code).toBe(1);
		expect(err).toContain('src/lib/new.ts');
		expect(stubCalls()).toEqual([]);
	});

	it('when graphify fails, and still removes its symlink', () => {
		const { code, err } = run([checkout], 'fail');
		expect(code).toBe(1);
		expect(err).toContain('graphify update failed');
		expect(readdirSync(tmp)).toEqual([]);
	});

	it('when the report is titled after the worktree', () => {
		const { code, err } = run([checkout], 'cwd-title');
		expect(code).toBe(1);
		expect(err).toContain('starts with "# Graph Report - t3-issue-172-graphify  (2026-10-30)"');
	});

	it('when graphify writes a file git neither tracks nor ignores', () => {
		const { code, err } = run([checkout], 'sidecar');
		expect(code).toBe(1);
		expect(err).toContain('track each one, or add it to the graphify block of .gitignore');
		expect(err).toContain('graphify-out/.graphify_new.json');
	});

	it('on a directory that is not the top of a git checkout', () => {
		mkdirSync(path.join(checkout, 'sub'));
		const { code, err } = run([path.join(checkout, 'sub')]);
		expect(code).toBe(2);
		expect(err).toContain('is not the top of a git checkout');
	});

	it('on an unknown option', () => {
		const { code, err } = run(['--bogus']);
		expect(code).toBe(2);
		expect(err).toContain('usage:');
	});
});
