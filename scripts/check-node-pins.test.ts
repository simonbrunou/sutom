// @vitest-environment node
// scripts/check-node-pins.sh (#168) against small pin files written per test,
// so every line number below is exact and no edit to the repo's own
// workflows, .nvmrc or package.json moves it. The fixture holds the shapes
// the script must read: three setup-node steps that read .nvmrc, written
// three ways, and @types/node. A test edits one line into one failure class
// and asserts the exit code and the message that names the file and value.
import { execFileSync, spawnSync } from 'node:child_process';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = path.join(repo, 'scripts', 'check-node-pins.sh');
const CI = '.forgejo/workflows/ci.yml';

const ciLines = [
	'name: CI', // 1
	'on: pull_request',
	'jobs:',
	'  a:',
	'    runs-on: ubuntu-latest', // 5
	'    steps:',
	'      - uses: actions/checkout@v7',
	'      - uses: actions/setup-node@v7', // 8: a step that opens on its `- uses:`
	'        with:',
	'          node-version-file: .nvmrc', // 10
	'      - run: npm ci',
	'  b:',
	'    steps:',
	'      - name: Set up Node',
	'        uses: "actions/setup-node@v7"', // 15: quoted, after `- name:`
	'        with:',
	'      # a comment at the dash column, inside the open step',
	'',
	'          cache: npm',
	'          node-version-file: ".nvmrc" # the one pin', // 20
	'      - run: echo b',
	'  c:',
	'    steps:',
	'    - name: Set up Node after a nested list',
	'      env:', // 25
	'        LIST:',
	'          - item',
	'      uses: https://data.forgejo.org/actions/setup-node@v7', // 28: a full URL, the last step of the file
	'      with: # the setup-node inputs',
	"        node-version-file: './.nvmrc'" // 30
];
const fixture: Record<string, string> = {
	[CI]: `${ciLines.join('\n')}\n`,
	'.nvmrc': '24\n',
	'package.json': `${JSON.stringify({ devDependencies: { '@types/node': '^24.0.0' } }, null, 2)}\n`
};
const ALL =
	'2 pins read Node 24 (.nvmrc, package.json devDependencies @types/node); the 3 actions/setup-node step(s) read .nvmrc';

const base = mkdtempSync(path.join(tmpdir(), 'check-node-pins-'));
// The current test's copy of the fixture: base/<test number>.
let dir = '';
let testNumber = 0;

afterAll(() => {
	rmSync(base, { recursive: true, force: true });
});

beforeEach(() => {
	testNumber += 1;
	dir = path.join(base, String(testNumber));
	mkdirSync(path.join(dir, '.forgejo', 'workflows'), { recursive: true });
	for (const [file, text] of Object.entries(fixture)) writeFileSync(path.join(dir, file), text);
});

function write(file: string, text: string): void {
	writeFileSync(path.join(dir, file), text);
}

// Replace line `at` (1-based) of `file` with `text`, which may hold several lines.
function setLine(file: string, at: number, text: string): void {
	const p = path.join(dir, file);
	const lines = readFileSync(p, 'utf8').split('\n');
	if (at < 1 || at > lines.length) throw new Error(`${file} has no line ${at}`);
	lines[at - 1] = text;
	writeFileSync(p, lines.join('\n'));
}

function writePackage(pkg: unknown): void {
	write('package.json', JSON.stringify(pkg));
}

function writeTypesNode(range: unknown, key = 'devDependencies'): void {
	writePackage({ [key]: { '@types/node': range } });
}

function run(args: string[] = [dir], env: NodeJS.ProcessEnv = process.env) {
	const p = spawnSync(scriptPath, args, { encoding: 'utf8', env });
	return { code: p.status, out: p.stdout, err: p.stderr };
}

// Run on the test's copy and expect exit 0 with `message` on stdout; returns stderr.
function passesWith(message: string): string {
	const { code, out, err } = run();
	expect(code, err).toBe(0);
	expect(out).toContain(message);
	return err;
}

// Run on the test's copy and expect exit 1 with every message on stderr; returns stderr.
function failsWith(...messages: string[]): string {
	const { code, err } = run();
	expect(code, err).toBe(1);
	for (const message of messages) expect(err).toContain(message);
	return err;
}

describe('check-node-pins.sh passes', () => {
	it('on the repo pins', () => {
		const { code, out, err } = run([repo]);
		expect(code, err).toBe(0);
		expect(out).toMatch(/pins read Node \d+/);
	});

	it('on every shape of the fixture, reading both pins and the three steps', () => {
		passesWith(ALL);
	});

	it('on CRLF line endings', () => {
		for (const [file, text] of Object.entries(fixture)) write(file, text.replaceAll('\n', '\r\n'));
		passesWith(ALL);
	});

	it.each(['v24', '24.12', 'v24.12.0', '  24  \n', '\n24\n\n'])('on an .nvmrc of %j', (text) => {
		write('.nvmrc', text);
		passesWith(ALL);
	});

	it.each(['~24.1.0', '24.12.4', '24', '24.x', '^24.0.0-rc.1'])('on @types/node %s', (range) => {
		writeTypesNode(range);
		passesWith(ALL);
	});

	it('on @types/node in dependencies', () => {
		writeTypesNode('^24.0.0', 'dependencies');
		passesWith('2 pins read Node 24 (.nvmrc, package.json dependencies @types/node)');
	});

	it('on @types/node in both devDependencies and dependencies, reading each', () => {
		const types = { '@types/node': '^24.0.0' };
		writePackage({ devDependencies: types, dependencies: types });
		passesWith('3 pins read Node 24');
	});

	it('on an engines.node of the same major, read as a third pin', () => {
		writePackage({ engines: { node: '24.x' }, devDependencies: { '@types/node': '^24.0.0' } });
		passesWith(
			'3 pins read Node 24 (.nvmrc, package.json engines.node, package.json devDependencies @types/node)'
		);
	});

	// The body of a block scalar is shell text: what it says about
	// node-version or setup-node is no pin.
	const body = [
		'echo "node-version: 26"',
		'echo "uses: actions/setup-node@v7"',
		'node-version: 26',
		'uses: actions/setup-node@v7'
	];
	it.each([
		['- run: |', ['      - run: |', ...body.map((l) => `          ${l}`)]],
		[
			'run: >- under - name:',
			['      - name: Build', '        run: >-', ...body.map((l) => `          ${l}`)]
		]
	])('on a block scalar body (%s) that mentions node-version and setup-node', (_name, text) => {
		setLine(CI, 11, text.join('\n'));
		passesWith(ALL);
	});

	it.each(['with: &inputs', 'with: !!map # tagged', 'with: !!map &inputs'])(
		'on a block mapping of inputs named first: %s',
		(withLine) => {
			setLine(CI, 9, `        ${withLine}`);
			passesWith(ALL);
		}
	);

	it('on a backslash in plain or single-quoted text, which YAML reads as written', () => {
		setLine(CI, 1, "name: 'CI \\ main'");
		setLine(CI, 11, '      - run: echo "a\\b"');
		passesWith(ALL);
	});

	it.each([
		['a comment that names setup-node', 1, 'name: CI # example actions/setup-node@v7'],
		['a comment that names node-version', 5, '    runs-on: ubuntu-latest # node-version: 26'],
		['a double-quoted backslash inside a single-quoted string', 1, `name: 'Example: "a\\b"'`],
		['a * and a ? inside plain text', 11, '      - run: ls *.md && test "$x" = a?b']
	])('on %s, which YAML reads as text', (_name, at, text) => {
		setLine(CI, at, text);
		passesWith(ALL);
	});

	it('on a second workflow without a setup-node step', () => {
		write('.forgejo/workflows/pdf.yaml', 'jobs:\n  pdf:\n    steps:\n      - run: echo pdf\n');
		passesWith(ALL);
	});
});

describe('check-node-pins.sh warns, and still passes', () => {
	it('when the shell runs another Node major than the pins', () => {
		write('.nvmrc', '99\n');
		writeTypesNode('^99.0.0');
		expect(passesWith('2 pins read Node 99')).toMatch(/warning: this shell runs Node/);
	});

	it('not when the shell runs the pinned major', () => {
		const running = execFileSync('node', ['--version'], { encoding: 'utf8' })
			.replace(/^v/, '')
			.split('.')[0];
		write('.nvmrc', `${running}\n`);
		writeTypesNode(`^${running}.0.0`);
		expect(passesWith(`2 pins read Node ${running}`)).toBe('');
	});
});

describe('check-node-pins.sh fails when a workflow hardcodes node-version', () => {
	it.each([
		[10, '          node-version: 24', '24'],
		[20, '          node-version: "24.x" # pinned', '24.x'],
		[30, "        node-version: '24.12.0'", '24.12.0']
	])('in the setup-node step whose input is on line %d', (at, text, value) => {
		setLine(CI, at, text);
		failsWith(`${CI}:${at} actions/setup-node step hardcodes node-version '${value}'`);
	});

	// sutom#166 at 669b14b: CI's setup-node step reads node-version: 26.
	it('of the next major, even when .nvmrc and @types/node moved with it', () => {
		setLine(CI, 10, '          node-version: 26');
		write('.nvmrc', '26\n');
		writeTypesNode('^26.0.0');
		failsWith(`${CI}:10 actions/setup-node step hardcodes node-version '26'`);
	});

	it.each([
		['after', '          node-version-file: .nvmrc\n          node-version: 26', 11],
		['before', '          node-version: 26\n          node-version-file: .nvmrc', 10]
	])('%s a node-version-file in the same step, which setup-node ignores then', (_order, text, at) => {
		setLine(CI, 10, text);
		failsWith(`${CI}:${at} actions/setup-node step hardcodes node-version '26'`);
	});

	it.each(['"node-version": 26', "'node-version': 26"])('as a quoted key: %s', (key) => {
		setLine(CI, 10, `          node-version-file: .nvmrc\n          ${key}`);
		failsWith(`${CI}:11 actions/setup-node step hardcodes node-version '26'`);
	});

	it('nested deeper than the inputs of with:', () => {
		setLine(CI, 10, '          node-version-file: .nvmrc\n          extra:\n            node-version: 26');
		failsWith(`${CI}:12 hardcodes node-version outside an actions/setup-node input: node-version: 26`);
	});

	it("under the step's env: instead of with:", () => {
		setLine(CI, 9, '        env:');
		setLine(CI, 10, '          node-version: 24');
		failsWith(
			`${CI}:8 actions/setup-node step reads no node-version-file: .nvmrc`,
			`${CI}:10 hardcodes node-version outside an actions/setup-node input: node-version: 24`
		);
	});

	it('in a matrix', () => {
		setLine(CI, 5, `${ciLines[4]}\n    strategy:\n      matrix:\n        node-version: [24]`);
		failsWith(`${CI}:8 hardcodes node-version outside an actions/setup-node input: node-version: [24]`);
	});

	it('in a flow mapping outside any setup-node step', () => {
		setLine(CI, 5, '    env: { "node-version": 26 }');
		failsWith(
			`${CI}:5 hardcodes node-version outside an actions/setup-node input: env: { "node-version": 26 }`
		);
	});

	it('as an expression', () => {
		setLine(CI, 10, '          node-version: ${{ matrix.node }}');
		failsWith(`${CI}:10 actions/setup-node step hardcodes node-version '\${{ matrix.node }}'`);
	});

	it('in a setup-node step of a second workflow', () => {
		write(
			'.forgejo/workflows/pdf.yaml',
			'jobs:\n  pdf:\n    steps:\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 26\n'
		);
		failsWith(".forgejo/workflows/pdf.yaml:6 actions/setup-node step hardcodes node-version '26'");
	});

	it('in a setup-node step that names the action in another letter case', () => {
		setLine(CI, 8, '      - uses: Actions/Setup-Node@v7');
		setLine(CI, 10, '          node-version: 26');
		failsWith(`${CI}:10 actions/setup-node step hardcodes node-version '26'`);
	});

	it('in a setup-node step after a block scalar body, which ends at the dash column', () => {
		setLine(
			CI,
			11,
			'      - run: |\n          echo hi\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 26'
		);
		failsWith(`${CI}:15 actions/setup-node step hardcodes node-version '26'`);
	});

	it('in a job after a key whose comment ends in `: |`, which starts no block scalar', () => {
		setLine(
			CI,
			30,
			`${ciLines[29]}\n  hidden: # note: |\n    steps:\n      - uses: actions/setup-node@v7\n        with:\n          node-version: 26`
		);
		failsWith(`${CI}:35 actions/setup-node step hardcodes node-version '26'`);
	});
});

describe('check-node-pins.sh fails when a setup-node step does not read .nvmrc', () => {
	it.each([
		[8, 10],
		[15, 20],
		[28, 30]
	])('the step on line %d without its node-version-file', (step, input) => {
		setLine(CI, input, '');
		failsWith(`${CI}:${step} actions/setup-node step reads no node-version-file: .nvmrc`);
	});

	it.each(['.node-version', 'package.json', 'sub/.nvmrc', '${{ inputs.file }}'])(
		'a node-version-file of %s',
		(file) => {
			setLine(CI, 10, `          node-version-file: ${file}`);
			failsWith(`${CI}:10 node-version-file '${file}' is not .nvmrc`);
		}
	);

	it.each([
		['a block scalar', '          node-version-file: |\n            .nvmrc', '|'],
		['a value on the next line', '          node-version-file:\n            .nvmrc', '']
	])('a node-version-file written as %s', (_name, text, value) => {
		setLine(CI, 10, text);
		failsWith(`${CI}:10 node-version-file '${value}' is not .nvmrc`);
	});

	it('a node-version-file set twice', () => {
		setLine(CI, 10, '          node-version-file: .nvmrc\n          node-version-file: .nvmrc');
		failsWith(`${CI}:11 actions/setup-node step sets node-version-file twice`);
	});

	it('a node-version-file nested deeper than the inputs of with:', () => {
		setLine(CI, 10, '          cache: npm\n          extra:\n            node-version-file: .nvmrc');
		failsWith(`${CI}:8 actions/setup-node step reads no node-version-file: .nvmrc`);
	});

	it('a step whose with: comes before its uses:', () => {
		setLine(CI, 10, '');
		setLine(CI, 9, '');
		setLine(
			CI,
			8,
			'      - with:\n          node-version-file: .nvmrc\n        uses: actions/setup-node@v7'
		);
		failsWith(`${CI}:10 actions/setup-node step reads no node-version-file: .nvmrc`);
	});
});

// YAML decodes these forms into text other than the line spells, so a
// node-version or a setup-node step written with them would pass unread.
describe('check-node-pins.sh fails on a YAML form that can spell a key or value as other text', () => {
	it('an escaped node-version key beside node-version-file', () => {
		setLine(CI, 10, '          node-version-file: .nvmrc\n          "node\\x2dversion": 26');
		failsWith(`${CI}:11 holds an escape in a double-quoted string, which this check cannot read`);
	});

	it('an escaped setup-node in uses:', () => {
		setLine(CI, 8, '      - uses: "actions/setup\\x2dnode@v7"');
		failsWith(`${CI}:8 holds an escape in a double-quoted string`);
	});

	it('a step written as one flow mapping with escaped keys', () => {
		setLine(CI, 10, '');
		setLine(CI, 9, '');
		setLine(
			CI,
			8,
			'      - { "us\\x65s": "actions/setup\\x2dnode@v7", with: { "node\\x2dversion": 26 } }'
		);
		failsWith(`${CI}:8 holds an escape in a double-quoted string`);
	});

	it('an escaped node-version key in a flow mapping outside any step', () => {
		setLine(CI, 5, '    env: { "node\\x2dversion": 26 }');
		failsWith(`${CI}:5 holds an escape in a double-quoted string`);
	});

	it('an alias as an input key', () => {
		setLine(CI, 1, 'name: &key node-version');
		setLine(CI, 10, '          node-version-file: .nvmrc\n          *key : 26');
		failsWith(`${CI}:11 uses a YAML alias, which this check cannot read`);
	});

	it('an alias as the action of uses:, and the anchor that names setup-node', () => {
		setLine(CI, 1, 'name: &action actions/setup-node@v7');
		setLine(CI, 8, '      - uses: *action');
		failsWith(
			`${CI}:1 actions/setup-node step is not written as a block mapping`,
			`${CI}:8 uses a YAML alias`
		);
	});

	it('an explicit node-version key beside node-version-file', () => {
		setLine(CI, 10, '          node-version-file: .nvmrc\n          ? node-version\n          : 26');
		failsWith(`${CI}:11 uses a YAML explicit key (?), which this check cannot read`);
	});

	it('a quoted string that runs onto the next line', () => {
		setLine(CI, 1, 'name: "CI\n  main"');
		failsWith(`${CI}:1 leaves a quoted string open onto the next line, which this check cannot read`);
	});

	it('a tag before the action of uses:', () => {
		setLine(CI, 8, '      - uses: !!str actions/setup-node@v7');
		failsWith(`${CI}:8 actions/setup-node step is not written as a block mapping`);
	});
});

describe('check-node-pins.sh fails when the Node majors differ, listing every pin', () => {
	it('.nvmrc', () => {
		write('.nvmrc', '26\n');
		failsWith(
			'the Node majors differ',
			'.nvmrc  26 (26)',
			'package.json devDependencies @types/node  24 (^24.0.0)'
		);
	});

	it('package.json @types/node', () => {
		writeTypesNode('^26.0.0');
		failsWith(
			'the Node majors differ',
			'.nvmrc  24 (24)',
			'package.json devDependencies @types/node  26 (^26.0.0)'
		);
	});

	it('an @types/node of dependencies that differs from the one of devDependencies', () => {
		writePackage({
			devDependencies: { '@types/node': '^24.0.0' },
			dependencies: { '@types/node': '^26.0.0' }
		});
		failsWith(
			'the Node majors differ',
			'package.json dependencies @types/node  26 (^26.0.0)',
			'package.json devDependencies @types/node  24 (^24.0.0)'
		);
	});

	it('package.json engines.node, which railpack reads before .nvmrc', () => {
		writePackage({ engines: { node: '26.x' }, devDependencies: { '@types/node': '^24.0.0' } });
		failsWith('the Node majors differ', 'package.json engines.node  26 (26.x)', '.nvmrc  24 (24)');
	});
});

describe('check-node-pins.sh fails when it cannot read a pin', () => {
	it.each(['.nvmrc', 'package.json'])('a %s that is gone', (file) => {
		renameSync(path.join(dir, file), path.join(dir, `${file}.old`));
		failsWith(`${file} not found`);
	});

	it('a workflow directory with no workflow file', () => {
		renameSync(path.join(dir, CI), path.join(dir, `${CI}.old`));
		failsWith('.forgejo/workflows has no workflow file');
	});

	it('a repo without .forgejo/workflows', () => {
		rmSync(path.join(dir, '.forgejo'), { recursive: true });
		failsWith('.forgejo/workflows not found');
	});

	it('workflows with no setup-node step', () => {
		write(CI, fixture[CI]!.replaceAll('actions/setup-node@', 'actions/other@'));
		failsWith('.forgejo/workflows has no actions/setup-node step');
	});

	it.each(['', '\n \n'])('an .nvmrc of %j', (text) => {
		write('.nvmrc', text);
		failsWith('.nvmrc is empty');
	});

	it.each(['# the one pin\n24\n', '24\n26\n'])('an .nvmrc of %j, which holds a second line', (text) => {
		write('.nvmrc', text);
		failsWith('.nvmrc holds more than one line');
	});

	it.each(['lts/*', 'lts/krypton', 'node', '24.12.0.1', '24 # the one pin'])(
		'an .nvmrc that reads %s',
		(text) => {
			write('.nvmrc', `${text}\n`);
			failsWith(`.nvmrc '${text}' is not a Node version such as 24 or 24.12.0`);
		}
	);

	it.each([
		['a flow mapping', '        with: { node-version-file: .nvmrc }'],
		[
			'a flow mapping with a nested node-version',
			'        with: { ignored: { node-version: 26 }, node-version-file: .nvmrc }'
		],
		[
			'a flow mapping over several lines',
			'        with: {\n          node-version-file: .nvmrc,\n          cache: npm\n        }'
		],
		['an alias', '        with: *inputs'],
		['an anchor then an alias', '        with: &a *b'],
		['a tag other than !!map', '        with: !!str'],
		['an anchor with no name', '        with: & ']
	])('a setup-node step whose with: is %s', (_name, text) => {
		setLine(CI, 10, '');
		setLine(CI, 9, text);
		failsWith(`${CI}:9 actions/setup-node step does not write with: as a block mapping`);
	});

	it('a setup-node step written as one flow mapping', () => {
		setLine(CI, 10, '');
		setLine(CI, 9, '');
		setLine(CI, 8, '      - { uses: actions/setup-node@v7, with: { node-version-file: .nvmrc } }');
		failsWith(`${CI}:8 actions/setup-node step is not written as a block mapping`);
	});

	it('a package.json that is not JSON, without a stack trace', () => {
		write('package.json', '{ "devDependencies": { "@types/node": "^24.0.0", } }');
		expect(failsWith('package.json is not valid JSON')).not.toMatch(/SyntaxError/);
	});

	it.each([
		['no @types/node', JSON.stringify({ devDependencies: { vite: '^8.0.0' } })],
		['a JSON null', 'null']
	])('a package.json with %s', (_name, text) => {
		write('package.json', text);
		expect(failsWith('package.json has no @types/node in devDependencies or dependencies')).not.toMatch(
			/TypeError/
		);
	});

	it.each(['>=24', '^24 || ^26', '*', 'latest'])('@types/node %s, which pins no one major', (range) => {
		writeTypesNode(range);
		failsWith(`package.json devDependencies @types/node '${range}' does not pin one Node major`);
	});

	it('an @types/node that is not a string', () => {
		writeTypesNode(24);
		failsWith('package.json devDependencies @types/node is not a string');
	});

	it.each(['>=20', '^24 || ^26', 'lts/*'])('an engines.node of %s, which pins no one major', (range) => {
		writePackage({ engines: { node: range }, devDependencies: { '@types/node': '^24.0.0' } });
		failsWith(`package.json engines.node '${range}' does not pin one Node major, and railpack reads it`);
	});

	it('an engines.node that is not a string', () => {
		writePackage({ engines: { node: 24 }, devDependencies: { '@types/node': '^24.0.0' } });
		failsWith('package.json engines.node is not a string');
	});

	it('a devEngines.runtime, which railpack reads before .nvmrc', () => {
		writePackage({
			devEngines: { runtime: { name: 'node', version: '24' } },
			devDependencies: { '@types/node': '^24.0.0' }
		});
		failsWith('package.json sets devEngines.runtime, which railpack reads before .nvmrc');
	});
});

describe('check-node-pins.sh exits 2', () => {
	it('on a directory that does not exist', () => {
		const { code, err } = run([path.join(base, 'missing')]);
		expect(code).toBe(2);
		expect(err).toMatch(/no directory/);
	});

	it('on two arguments', () => {
		const { code, err } = run([dir, dir]);
		expect(code).toBe(2);
		expect(err).toMatch(/usage:/);
	});

	it('without node on PATH', () => {
		// A PATH holding bash alone, for the script's `#!/usr/bin/env bash`.
		const bin = path.join(dir, 'bin');
		mkdirSync(bin);
		const bash = execFileSync('bash', ['-c', 'command -v bash'], { encoding: 'utf8' }).trim();
		symlinkSync(bash, path.join(bin, 'bash'));
		const { code, err } = run([dir], { PATH: bin });
		expect(code).toBe(2);
		expect(err).toMatch(/needs node on PATH/);
	});
});
