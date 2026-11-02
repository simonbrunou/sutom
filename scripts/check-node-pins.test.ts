// @vitest-environment node
// scripts/check-node-pins.sh (#168) against small pin files written per test,
// so every line number below is exact and no edit to the repo's own
// workflows, .nvmrc or package.json moves it. The fixture holds the shapes
// the script must read: three setup-node steps that read .nvmrc, written
// three ways, and @types/node. A test edits one line into one failure class
// and asserts the exit code and the message that names the file and value.
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import {
	copyFileSync,
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
import { parseDocument } from 'yaml';

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

	// A with: in such a body is text too, whatever key or list item holds
	// the body (#197).
	const withBody = ['with:', '  node-version: 26', 'uses: actions/setup-node@v7'];
	it.each([
		[
			'- | under args:',
			['        args:', '          - |', ...withBody.map((l) => `            ${l}`)]
		],
		[
			'- &n | under args:',
			['        args:', '          - &n |', ...withBody.map((l) => `            ${l}`)]
		],
		['my key: |', ['        my key: |', ...withBody.map((l) => `          ${l}`)]],
		['notes: &n >-', ['        notes: &n >-', ...withBody.map((l) => `          ${l}`)]],
		['"my key": |', ['        "my key": |', ...withBody.map((l) => `          ${l}`)]]
	])('on a block scalar body (%s) in a setup-node step that mentions with:', (_name, text) => {
		setLine(CI, 10, `${ciLines[9]}\n${text.join('\n')}`);
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
		['a * and a ? inside plain text', 11, '      - run: ls *.md && test "$x" = a?b'],
		['a [ and a { left open in plain text', 5, `${ciLines[4]}\n    env:\n      X: echo [a, {b,`],
		['a [ and a { left open in a quoted string', 1, "name: 'CI [a, {b,'"],
		['a [ and a { left open in a comment', 19, '          cache: npm # {a, [b,'],
		['a [ and a { left open in a run: | body', 11, '      - run: |\n          echo [a, {b,'],
		[
			'a plain key with no blank after its colon in a flow mapping',
			5,
			`${ciLines[4]}\n    env: {A:"b\\x2d"}`
		]
	])('on %s, which YAML reads as text', (_name, at, text) => {
		setLine(CI, at, text);
		passesWith(ALL);
	});

	it.each([
		['echo "done!"', '      - run: echo "done!"'],
		['${{ !cancelled() }}', '      - if: ${{ !cancelled() }}\n        run: npm ci']
	])('on a ! inside the plain text %s, which is no tag', (_name, text) => {
		setLine(CI, 11, text);
		passesWith(ALL);
	});

	it.each([
		['after an anchor on the with: of a setup-node step', 9, '        with: &inputs !!map'],
		[
			'on the with: of another step',
			7,
			'      - uses: actions/checkout@v7\n        with: !!map\n          fetch-depth: 0'
		]
	])('on the !!map tag %s', (_name, at, text) => {
		setLine(CI, at, text);
		passesWith(ALL);
	});

	it('on a flow mapping opened and closed on one line, under the with: of a setup-node step', () => {
		setLine(CI, 10, `${ciLines[9]}\n          scope: {a: 1, b: 2}`);
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
	])(
		'%s a node-version-file in the same step, which setup-node ignores then',
		(_order, text, at) => {
			setLine(CI, 10, text);
			failsWith(`${CI}:${at} actions/setup-node step hardcodes node-version '26'`);
		}
	);

	it.each(['"node-version": 26', "'node-version': 26"])('as a quoted key: %s', (key) => {
		setLine(CI, 10, `          node-version-file: .nvmrc\n          ${key}`);
		failsWith(`${CI}:11 actions/setup-node step hardcodes node-version '26'`);
	});

	it('nested deeper than the inputs of with:', () => {
		setLine(
			CI,
			10,
			'          node-version-file: .nvmrc\n          extra:\n            node-version: 26'
		);
		failsWith(
			`${CI}:12 hardcodes node-version outside an actions/setup-node input: node-version: 26`
		);
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
		failsWith(
			`${CI}:8 hardcodes node-version outside an actions/setup-node input: node-version: [24]`
		);
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
		setLine(
			CI,
			10,
			'          cache: npm\n          extra:\n            node-version-file: .nvmrc'
		);
		failsWith(`${CI}:8 actions/setup-node step reads no node-version-file: .nvmrc`);
	});

	// YAML reads no with: in these steps: it is the key of another value, or
	// text in the body of a block scalar (#197).
	it.each([
		[
			'under another key of the step',
			['        env:', '          with:', '            node-version-file: .nvmrc']
		],
		[
			'in the body of a block scalar that is a list item',
			[
				'        args:',
				'          - |',
				'            with:',
				'              node-version-file: .nvmrc'
			]
		],
		[
			'in the body of a block scalar whose key holds a blank',
			['        my key: |', '          with:', '            node-version-file: .nvmrc']
		],
		[
			'in the body of a block scalar after an anchor',
			['        notes: &n |', '          with:', '            node-version-file: .nvmrc']
		],
		[
			'in the body of a block scalar whose quoted key holds a blank',
			['        "my key": |', '          with:', '            node-version-file: .nvmrc']
		]
	])('a with: %s', (_name, lines) => {
		setLine(CI, 10, '');
		setLine(CI, 9, lines.join('\n'));
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

	// In a flow collection, a colon right after a quoted key or a closed
	// collection starts a value even with no blank after it.
	it.each([
		['a double-quoted key', '      - {"uses":"actions/setup\\x2dnode@v2"}'],
		['a double-quoted key and a blank', '      - {"uses" :"actions/setup\\x2dnode@v2"}'],
		['a single-quoted key', `      - {'uses':"actions/setup\\x2dnode@v2"}`],
		['a closed flow sequence', '      - {[a]:"actions/setup\\x2dnode@v2"}']
	])(
		'an escaped setup-node in a flow mapping, after %s then a colon with no blank after it',
		(_name, text) => {
			setLine(CI, 11, text);
			failsWith(`${CI}:11 holds an escape in a double-quoted string, which this check cannot read`);
		}
	);

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
		setLine(
			CI,
			10,
			'          node-version-file: .nvmrc\n          ? node-version\n          : 26'
		);
		failsWith(`${CI}:11 uses a YAML explicit key (?), which this check cannot read`);
	});

	it('a quoted string that runs onto the next line', () => {
		setLine(CI, 1, 'name: "CI\n  main"');
		failsWith(
			`${CI}:1 leaves a quoted string open onto the next line, which this check cannot read`
		);
	});

	it('a tag before the action of uses:', () => {
		setLine(CI, 8, '      - uses: !!str actions/setup-node@v7');
		failsWith(`${CI}:8 actions/setup-node step is not written as a block mapping`);
	});

	// YWN0aW9ucy9zZXR1cC1ub2RlQHY3 is base64 for actions/setup-node@v7, and
	// bm9kZS12ZXJzaW9u for node-version. Line `at` becomes `text`, whose tag
	// is on line `line`.
	it.each([
		[
			'a !!binary uses: that decodes to setup-node, added as a step',
			11,
			'      - uses: !!binary YWN0aW9ucy9zZXR1cC1ub2RlQHY3',
			11
		],
		[
			'a verbatim tag on uses:',
			11,
			'      - uses: !<tag:yaml.org,2002:binary> YWN0aW9ucy9zZXR1cC1ub2RlQHY3',
			11
		],
		[
			'a !!binary key that decodes to node-version, beside node-version-file',
			10,
			'          node-version-file: .nvmrc\n          !!binary bm9kZS12ZXJzaW9u: 26',
			11
		],
		[
			'a !!str node-version key',
			10,
			'          node-version-file: .nvmrc\n          !!str node-version: 26',
			11
		],
		[
			'a !!binary key in a flow mapping outside any step',
			5,
			'    env: { !!binary bm9kZS12ZXJzaW9u: 26 }',
			5
		],
		[
			'a !!binary uses: after a JSON-style key with no blank after its colon',
			11,
			'      - {"uses":!!binary YWN0aW9ucy9zZXR1cC1ub2RlQHY3}',
			11
		]
	])('%s', (_name, at, text, line) => {
		setLine(CI, at, text);
		failsWith(`${CI}:${line} uses a YAML tag other than !!map, which this check cannot read`);
	});

	it('a local tag on the node-version-file value, which leaves the step reading none', () => {
		setLine(CI, 10, '          node-version-file: !pin .nvmrc');
		failsWith(
			`${CI}:10 uses a YAML tag other than !!map, which this check cannot read`,
			`${CI}:8 actions/setup-node step reads no node-version-file: .nvmrc`
		);
	});
});

// YAML reads the lines after an open [ or { inside the flow collection, where
// this reader would read them as keys: a node-version-file there would count
// as an input that setup-node never gets (#186).
describe('check-node-pins.sh fails on a flow mapping or sequence left open at the end of its line', () => {
	const openFlow = (line: number) =>
		`${CI}:${line} leaves a flow mapping or sequence open onto the next line, which this check cannot read`;

	it.each([
		['a flow mapping', '          scope: {a: 1,'],
		['a flow sequence', '          scope: [a,'],
		['a flow mapping whose comment starts before it closes', '          scope: {a: 1, # note']
	])('%s that holds the node-version-file of a setup-node step', (_name, opening) => {
		const closing = opening.includes('[') ? ']' : '}';
		setLine(
			CI,
			10,
			`${opening}\n          node-version-file: .nvmrc\n          ${closing}\n          cache: npm`
		);
		failsWith(openFlow(10));
	});

	// YAML reads no node-version input here. The check may still say that
	// line 12 hardcodes one: it does not read the collection across lines, so
	// it takes line 12 for an input.
	it('a flow mapping that holds node-version, beside a real node-version-file', () => {
		setLine(
			CI,
			10,
			`${ciLines[9]}\n          scope: {a: 1,\n          node-version: 26\n          }`
		);
		failsWith(openFlow(11));
	});

	it("a flow mapping under a job's env:, outside any setup-node step", () => {
		setLine(CI, 5, `${ciLines[4]}\n    env: {A: 1,\n      B: 2}`);
		failsWith(openFlow(6));
	});

	it('a flow mapping holding a quoted string left open, as the quoted string only', () => {
		setLine(CI, 10, `${ciLines[9]}\n          scope: {a: "x\n          y"}`);
		const err = failsWith(`${CI}:11 leaves a quoted string open onto the next line`);
		expect(err).not.toContain('leaves a flow mapping or sequence open');
	});
});

// This reader skips the body of a block scalar, so a uses: written as one
// would hide the action it names.
describe('check-node-pins.sh fails on a uses: written as a block scalar', () => {
	const blockUses = (line: number) =>
		`${CI}:${line} uses: names its action in a block scalar (| or >), which this check cannot read`;

	it.each([
		['- uses: >-', '      - uses: >-', 11],
		['- uses: |', '      - uses: |', 11],
		['- "uses": >-', '      - "uses": >-', 11],
		["- 'uses': |-", "      - 'uses': |-", 11],
		['uses: > under - name:', '      - name: Set up Node\n        uses: >', 12],
		['- &a uses: >-, an anchor before the key', '      - &a uses: >-', 11],
		['- uses: &a |, an anchor before the indicator', '      - uses: &a |', 11]
	])('%s that names setup-node', (_name, header, line) => {
		setLine(CI, 11, `${header}\n          actions/setup-node@v7`);
		failsWith(blockUses(line));
	});

	it('that names another action, which this reader cannot tell', () => {
		setLine(CI, 11, '      - uses: >-\n          actions/checkout@v7');
		failsWith(blockUses(11));
	});
});

// A block scalar header on a line of its own belongs to the key on the line
// before, and its body may sit shallower than the header, so this reader
// cannot tell where the body ends (#197).
describe('check-node-pins.sh fails on a block scalar header with no key and no dash on its line', () => {
	it.each([
		['under a key', '      - run:\n          |\n          npm ci', 12],
		['after an anchor, under a key', '      - run: &cmd\n          >-\n          npm ci', 12]
	])('%s', (_name, text, line) => {
		setLine(CI, 11, text);
		failsWith(
			`${CI}:${line} starts a block scalar (| or >) on a line with no key and no -, which this check cannot read`
		);
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

	it.each(['# the one pin\n24\n', '24\n26\n'])(
		'an .nvmrc of %j, which holds a second line',
		(text) => {
			write('.nvmrc', text);
			failsWith('.nvmrc holds more than one line');
		}
	);

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
		expect(
			failsWith('package.json has no @types/node in devDependencies or dependencies')
		).not.toMatch(/TypeError/);
	});

	it.each(['>=24', '^24 || ^26', '*', 'latest'])(
		'@types/node %s, which pins no one major',
		(range) => {
			writeTypesNode(range);
			failsWith(`package.json devDependencies @types/node '${range}' does not pin one Node major`);
		}
	);

	it('an @types/node that is not a string', () => {
		writeTypesNode(24);
		failsWith('package.json devDependencies @types/node is not a string');
	});

	it.each(['>=20', '^24 || ^26', 'lts/*'])(
		'an engines.node of %s, which pins no one major',
		(range) => {
			writePackage({ engines: { node: range }, devDependencies: { '@types/node': '^24.0.0' } });
			failsWith(
				`package.json engines.node '${range}' does not pin one Node major, and railpack reads it`
			);
		}
	);

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

// The check reads workflows with an awk line reader, since CI runs it before
// `npm ci`; each gap in that reader was found by hand (#183, #186, #187). Here
// a YAML parser reads the same workflows (#197). Each case rewrites one entry
// of the fixture's setup-node steps in one YAML form, and parses the result
// with eemeli/yaml, which resolves << merge keys as go-yaml does for Forgejo.
// The check may refuse any case. It must never exit 0 on one in which the
// parser finds a setup-node step that reads no .nvmrc or sets node-version.

// A mapping entry: a key and a scalar, or a key and the entries of a block
// mapping.
type Entry = [key: string, value: string | Entry[]];
// One YAML form: the lines of an entry whose key sits at column `at`, or
// null when the form does not apply to that entry.
type Form = (entry: Entry, at: number) => string[] | null;
// One form of a whole step: the lines of the list item whose dash sits at
// column `dash`.
type ItemForm = (entries: Entry[], dash: number) => string[];

const pad = (n: number) => ' '.repeat(n);
const hex = (s: string) => `\\x${s.charCodeAt(0).toString(16).padStart(2, '0')}`;

function block([key, value]: Entry, at: number, writtenKey = key): string[] {
	return typeof value === 'string'
		? [`${pad(at)}${writtenKey}: ${value}`]
		: [`${pad(at)}${writtenKey}:`, ...value.flatMap((entry) => block(entry, at + 2))];
}

function flow(entries: Entry[]): string {
	const items = entries.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : flow(v)}`);
	return `{ ${items.join(', ')} }`;
}

function json(entries: Entry[]): string {
	const items = entries.map(
		([k, v]) => `${JSON.stringify(k)}:${typeof v === 'string' ? JSON.stringify(v) : json(v)}`
	);
	return `{${items.join(',')}}`;
}

// A form that applies to scalar entries only, or to block mappings only.
const scalar =
	(write: (key: string, value: string, at: number) => string[]): Form =>
	([key, value], at) =>
		typeof value === 'string' ? write(key, value, at) : null;
const mapping =
	(write: (key: string, value: Entry[], at: number) => string[]): Form =>
	([key, value], at) =>
		typeof value === 'string' ? null : write(key, value, at);
// The block lines of an entry, with `text` (an anchor or a tag) written
// after its key.
const afterKey = (entry: Entry, at: number, text: string) => {
	const [first, ...rest] = block(entry, at);
	return [first!.replace(/:( |$)/, `: ${text}$1`), ...rest];
};

const forms: [name: string, form: Form][] = [
	['plain', (entry, at) => block(entry, at)],
	['a double-quoted key', (entry, at) => block(entry, at, `"${entry[0]}"`)],
	['a single-quoted key', (entry, at) => block(entry, at, `'${entry[0]}'`)],
	['a double-quoted value', scalar((k, v, at) => [`${pad(at)}${k}: "${v}"`])],
	['a single-quoted value', scalar((k, v, at) => [`${pad(at)}${k}: '${v}'`])],
	[
		'a comment after it',
		(entry, at) => {
			const [first, ...rest] = block(entry, at);
			return [`${first} # node-version: 26 uses: actions/setup-node@v7`, ...rest];
		}
	],
	[
		'a comment line before it',
		(entry, at) => [`${pad(at)}# with: { node-version: 26 }`, ...block(entry, at)]
	],
	['the !!str tag', scalar((k, v, at) => [`${pad(at)}${k}: !!str ${v}`])],
	['the !!map tag', mapping((k, v, at) => afterKey([k, v], at, '!!map'))],
	['the !!binary tag', scalar((k, v, at) => [`${pad(at)}${k}: !!binary ${btoa(v)}`])],
	['an anchor on the value', (entry, at) => afterKey(entry, at, '&v')],
	['an anchor on the key', (entry, at) => block(entry, at, `&k ${entry[0]}`)],
	[
		'an alias of an anchor on another key',
		([k, v], at) => [...afterKey([`x-${k}`, v], at, '&v'), `${pad(at)}${k}: *v`]
	],
	['a merge key', mapping((k, v, at) => [`${pad(at)}${k}:`, `${pad(at + 2)}<<: ${flow(v)}`])],
	['a flow mapping', mapping((k, v, at) => [`${pad(at)}${k}: ${flow(v)}`])],
	['a JSON-style flow mapping', mapping((k, v, at) => [`${pad(at)}${k}: ${json(v)}`])],
	[
		'a flow mapping over several lines',
		mapping((k, v, at) => [
			`${pad(at)}${k}: {`,
			...v.map(([ck, cv]) => `${pad(at + 4)}${ck}: ${typeof cv === 'string' ? cv : flow(cv)},`),
			`${pad(at + 2)}}`
		])
	],
	['a flow sequence', scalar((k, v, at) => [`${pad(at)}${k}: [${v}]`])],
	['a literal block scalar', scalar((k, v, at) => [`${pad(at)}${k}: |-`, `${pad(at + 2)}${v}`])],
	['a folded block scalar', scalar((k, v, at) => [`${pad(at)}${k}: >-`, `${pad(at + 2)}${v}`])],
	[
		'a block scalar after an anchor',
		scalar((k, v, at) => [`${pad(at)}${k}: &v |-`, `${pad(at + 2)}${v}`])
	],
	['the value on the next line', scalar((k, v, at) => [`${pad(at)}${k}:`, `${pad(at + 2)}${v}`])],
	[
		'a double-quoted value over two lines',
		scalar((k, v, at) => [`${pad(at)}${k}: "${v}`, `${pad(at + 2)}"`])
	],
	[
		'an escape in the key',
		(entry, at) => block(entry, at, `"${hex(entry[0])}${entry[0].slice(1)}"`)
	],
	['an escape in the value', scalar((k, v, at) => [`${pad(at)}${k}: "${hex(v)}${v.slice(1)}"`])],
	[
		'an explicit key',
		([k, v], at) =>
			typeof v === 'string'
				? [`${pad(at)}? ${k}`, `${pad(at)}: ${v}`]
				: [`${pad(at)}? ${k}`, `${pad(at)}:`, ...block([k, v], at).slice(1)]
	],
	// #197's forms A to E: the entry under another key, or as text in the body
	// of a block scalar.
	['under another key', (entry, at) => [`${pad(at)}other:`, ...block(entry, at + 2)]],
	[
		'in the body of a block scalar that is a list item',
		(entry, at) => [`${pad(at)}args:`, `${pad(at + 2)}- |`, ...block(entry, at + 4)]
	],
	[
		'in the body of a block scalar whose key holds a blank',
		(entry, at) => [`${pad(at)}my key: |`, ...block(entry, at + 2)]
	],
	[
		'in the body of a block scalar after an anchor',
		(entry, at) => [`${pad(at)}notes: &n |`, ...block(entry, at + 2)]
	],
	[
		'in the body of a block scalar whose quoted key holds a blank',
		(entry, at) => [`${pad(at)}"my key": |`, ...block(entry, at + 2)]
	]
];

const itemForms: [name: string, form: ItemForm][] = [
	['a flow mapping', (entries, dash) => [`${pad(dash)}- ${flow(entries)}`]],
	['a JSON-style flow mapping', (entries, dash) => [`${pad(dash)}- ${json(entries)}`]],
	// #187: {"uses":"actions/setup\x2dnode@v7"}.
	[
		'a JSON-style flow mapping with its dashes escaped',
		(entries, dash) => [`${pad(dash)}- ${json(entries).replaceAll('-', '\\x2d')}`]
	],
	[
		'a flow mapping over several lines',
		(entries, dash) => [
			`${pad(dash)}- {`,
			...entries.map(([k, v]) => `${pad(dash + 4)}${k}: ${typeof v === 'string' ? v : flow(v)},`),
			`${pad(dash + 2)}}`
		]
	],
	[
		'an anchor on the item',
		(entries, dash) => [`${pad(dash)}- &step`, ...entries.flatMap((e) => block(e, dash + 2))]
	],
	[
		'the !!map tag on the item',
		(entries, dash) => [`${pad(dash)}- !!map`, ...entries.flatMap((e) => block(e, dash + 2))]
	],
	['a merge key', (entries, dash) => [`${pad(dash)}- <<: ${flow(entries)}`]]
];

// The lines of a list item whose keys sit at column dash + 2, with the dash
// on its first line that is no comment.
function dashed(lines: string[], dash: number): string[] {
	const first = lines.findIndex((line) => !/^\s*#/.test(line));
	return lines.map((line, i) => (i === first ? `${pad(dash)}- ${line.slice(dash + 2)}` : line));
}

// The fixture's setup-node steps: the first line of the item, the column of
// its dash, the lines of its uses:, with: and node-version-file input (the
// last line of the step), the entries before uses:, the action and the
// inputs.
const NVF = 'node-version-file';
type Step = {
	item: number;
	dash: number;
	uses: number;
	with: number;
	input: number;
	entries: Entry[];
	action: string;
	inputs: Entry[];
};
const steps: Step[] = [
	{
		item: 8,
		dash: 6,
		uses: 8,
		with: 9,
		input: 10,
		entries: [],
		action: 'actions/setup-node@v7',
		inputs: [[NVF, '.nvmrc']]
	},
	{
		item: 14,
		dash: 6,
		uses: 15,
		with: 16,
		input: 20,
		entries: [['name', 'Set up Node']],
		action: 'actions/setup-node@v7',
		inputs: [
			['cache', 'npm'],
			[NVF, '.nvmrc']
		]
	},
	{
		item: 24,
		dash: 4,
		uses: 28,
		with: 29,
		input: 30,
		entries: [['name', 'Set up Node']],
		action: 'https://data.forgejo.org/actions/setup-node@v7',
		inputs: [[NVF, './.nvmrc']]
	}
];

// The fixture's ci.yml with line `at` (1-based) replaced by edits[at], which
// may hold no line or several.
function edited(edits: Record<number, string[]>): string {
	return `${ciLines.flatMap((line, i) => edits[i + 1] ?? [line]).join('\n')}\n`;
}

// Lines `from` to `to` replaced by `lines`.
function replaced(from: number, to: number, lines: string[]): Record<number, string[]> {
	const edits: Record<number, string[]> = { [from]: lines };
	for (let at = from + 1; at <= to; at++) edits[at] = [];
	return edits;
}

// A setup-node step that reads no .nvmrc, added after step a (line 10), in
// the fixture's layout: `- ` at column 6.
const addedStep = (lines: string[]) => edited({ 10: [ciLines[9]!, ...dashed(lines, 6)] });
const ADDED = 'a setup-node step added after line 10 that reads no .nvmrc';
const addedUses: Entry = ['uses', 'actions/setup-node@v7'];

type Case = { name: string; form: string; text: string };
const cases: Case[] = [{ name: 'the unmodified fixture', form: 'none', text: fixture[CI]! }];
function add(form: string, where: string, text: string | null): void {
	if (text !== null) cases.push({ name: `${form}: ${where}`, form, text });
}

for (const [name, form] of forms) {
	for (const step of steps) {
		// The step's keys sit two columns right of its dash, and its inputs two
		// more.
		const keys = step.dash + 2;
		const inputAt = keys + 2;
		const nvf = step.inputs.at(-1)![1] as string;
		// The uses: line, the first line of the item in step a.
		const uses = form(['uses', step.action], keys);
		const usesLines = uses && (step.uses === step.item ? dashed(uses, step.dash) : uses);
		add(name, `the uses: on line ${step.uses}`, usesLines && edited({ [step.uses]: usesLines }));
		// The with: block.
		const withBlock = (inputs: Entry[]) => {
			const lines = form(['with', inputs], keys);
			return lines && edited(replaced(step.with, step.input, lines));
		};
		add(name, `the with: on line ${step.with}`, withBlock(step.inputs));
		add(
			name,
			`the with: on line ${step.with}, plus node-version: 26`,
			withBlock([...step.inputs, ['node-version', '26']])
		);
		add(
			name,
			`the with: on line ${step.with}, with ${NVF} nested under extra:`,
			withBlock(step.inputs.map((e) => (e[0] === NVF ? ['extra', [e]] : e)))
		);
		// The node-version-file input.
		const input = form([NVF, nvf], inputAt);
		add(name, `the input on line ${step.input}`, input && edited({ [step.input]: input }));
		const pin = form(['node-version', '26'], inputAt);
		add(
			name,
			`node-version: 26 added after line ${step.input}`,
			pin && edited({ [step.input]: [ciLines[step.input - 1]!, ...pin] })
		);
		const nested = form([NVF, nvf], inputAt + 2);
		add(
			name,
			`the input on line ${step.input}, nested under extra:`,
			nested && edited({ [step.input]: [`${pad(inputAt)}extra:`, ...nested] })
		);
		// A line added to the step, before its with:.
		const id = form(['id', 'setup'], keys);
		add(
			name,
			`a line added after line ${step.uses}`,
			id && edited({ [step.uses]: [ciLines[step.uses - 1]!, ...id] })
		);
	}
	const uses = form(addedUses, 8);
	add(
		name,
		`the uses: of ${ADDED}`,
		uses && addedStep([...uses, ...block(['with', [['cache', 'npm']]], 8)])
	);
	const inputs = form(['with', [['cache', 'npm']]], 8);
	add(name, `the with: of ${ADDED}`, inputs && addedStep([...block(addedUses, 8), ...inputs]));
	const input = form([NVF, '.node-version'], 10);
	add(
		name,
		`the input of ${ADDED}`,
		input && addedStep([...block(addedUses, 8), '        with:', ...input])
	);
}

for (const [name, form] of itemForms) {
	const item = `the step as ${name}`;
	for (const step of steps) {
		const lines = form([...step.entries, ['uses', step.action], ['with', step.inputs]], step.dash);
		add(item, `on line ${step.item}`, edited(replaced(step.item, step.input, lines)));
	}
	add(
		item,
		ADDED,
		edited({ 10: [ciLines[9]!, ...form([addedUses, ['with', [['cache', 'npm']]]], 6)] })
	);
}

// The setup-node steps the parser reads that do not read .nvmrc, as
// `<job> step <n>`. A !!binary scalar is bytes here, which go-yaml hands
// Forgejo as text, so it is read as text. A workflow the parser rejects
// throws: the generator wrote no YAML.
function parserViolations(text: string): string[] {
	const doc = parseDocument(text, { merge: true });
	if (doc.errors.length > 0) {
		throw new Error(`the parser rejects this case: ${doc.errors[0]!.message}\n${text}`);
	}
	const asText = (v: unknown) =>
		typeof v === 'string' ? v : v instanceof Uint8Array ? new TextDecoder().decode(v) : undefined;
	const keys = (node: unknown) => (node instanceof Map ? [...node.keys()].map(asText) : []);
	const get = (node: unknown, key: string): unknown =>
		node instanceof Map ? [...node].find(([k]) => asText(k) === key)?.[1] : undefined;
	const violations: string[] = [];
	const jobs = get(doc.toJS({ mapAsMap: true }), 'jobs');
	for (const [job, body] of jobs instanceof Map ? jobs : []) {
		const jobSteps = get(body, 'steps');
		(Array.isArray(jobSteps) ? jobSteps : []).forEach((step: unknown, i) => {
			const uses = asText(get(step, 'uses'))?.toLowerCase();
			if (uses === undefined || !/^(.*\/)?actions\/setup-node@/.test(uses)) return;
			const inputs = get(step, 'with');
			const file = asText(get(inputs, NVF));
			if ((file !== '.nvmrc' && file !== './.nvmrc') || keys(inputs).includes('node-version')) {
				violations.push(`${asText(job)} step ${i + 1}`);
			}
		});
	}
	return violations;
}

function runAsync(target: string): Promise<{ code: number | null; out: string; err: string }> {
	return new Promise((resolve) => {
		execFile(scriptPath, [target], { encoding: 'utf8' }, (error, out, err) => {
			const code = error === null ? 0 : typeof error.code === 'number' ? error.code : null;
			resolve({ code, out, err });
		});
	});
}

describe('check-node-pins.sh compared with a YAML parser', () => {
	it('reads the unmodified fixture as the parser does: every step reads .nvmrc', () => {
		expect(parserViolations(fixture[CI]!)).toEqual([]);
		passesWith(ALL);
	});

	it('generates, for every form, a case the parser reads as a violation, each under its own name', () => {
		const names = [
			...forms.map(([name]) => name),
			...itemForms.map(([name]) => `the step as ${name}`)
		];
		const found = new Set(
			cases.filter((c) => parserViolations(c.text).length > 0).map((c) => c.form)
		);
		expect(names.filter((name) => !found.has(name))).toEqual([]);
		expect(new Set(cases.map((c) => c.name)).size).toBe(cases.length);
	});

	// Each case runs in its own directory, so the cases run side by side.
	describe.concurrent('never passes a case the parser reads as a violation', () => {
		// One it() per case rather than it.each, whose $name vitest cuts at 40
		// characters, before the line the name gives.
		for (const [i, { name, text }] of cases.entries()) {
			it(name, async ({ expect }) => {
				const violations = parserViolations(text);
				const at = path.join(base, 'yaml', String(i));
				mkdirSync(path.join(at, '.forgejo', 'workflows'), { recursive: true });
				for (const [file, content] of Object.entries({ ...fixture, [CI]: text })) {
					writeFileSync(path.join(at, file), content);
				}
				const { code, out, err } = await runAsync(at);
				expect([0, 1], `check-node-pins.sh exited ${code}:\n${out}${err}`).toContain(code);
				if (code === 0) expect(violations, `check-node-pins.sh passed on\n${text}`).toEqual([]);
			});
		}
	});
});

// flake.nix reads the dev shell's Node major from .nvmrc with its own
// builtins.match (#171), written to take the forms read_nvmrc takes (#181).
// Each case writes one form to .nvmrc beside a copy of the flake, evaluates
// the flake's outputs with a stand-in for nixpkgs, and runs the check on the
// same copy: both must read the same major, or both refuse the file. The
// cases need nix-instantiate on PATH, as in the dev shell, and no network.
// CI has no nix (#171), so they are skipped there.
const hasNix = spawnSync('nix-instantiate', ['--version']).error === undefined;

// Today both read a major from the forms before `2\r4` and refuse the rest.
// The cases assert only that the two agree, so a change to the forms both
// take still passes here; the cases above pin what the check takes.
const nvmrcForms = [
	'24\n',
	'24',
	'v24',
	'24.12.0',
	'  24  \n',
	'\n24\n\n',
	'24\r\n',
	'\r\n24\r\n\r\n',
	'  v24.12.0  \r\n',
	'\v24\f',
	'\t24\t',
	'24\r',
	'24\r\r\n',
	'24 ',
	'024',
	'26',
	'v26',
	'26.4.0',
	'2\r4',
	'24.x',
	'V24',
	'24 # c',
	'lts/*',
	'24\n26\n',
	'',
	'\n \n',
	'# the one pin\n24\n',
	'24.12.0.1',
	'24.',
	'.24',
	'v 24'
];

// mkShell returns its argument, and nodejs_<n> is the string n for every
// digit run in the forms, so the shell's one package names the major the
// flake's match takes, whichever part of a form that is.
const majors = [...new Set(nvmrcForms.flatMap((text) => text.match(/[0-9]+/g) ?? []))];
const nixpkgsStandIn = `{ ... }: { mkShell = shell: shell; ${majors.map((n) => `nodejs_${n} = "${n}";`).join(' ')} }\n`;
const devShellPackages =
	'((import ./flake.nix).outputs { self = { }; nixpkgs = ./nixpkgs; }).devShells.x86_64-linux.default.packages';

// The major the check reads from .nvmrc, or null when it refuses the file.
// It lists each pin only when it fails, as for 024, which differs from the
// fixture's @types/node 24.
function checkReads(): string | null {
	const { code, out, err } = run();
	if (code === 0) {
		const read = /pins read Node (\S+) \(\.nvmrc[,)]/.exec(out);
		if (read) return read[1]!;
	} else if (code === 1) {
		const listed = /^ {2}\.nvmrc {2}(\S+) \(/m.exec(err);
		if (listed) return listed[1]!;
		if (/^check-node-pins: \.nvmrc /m.test(err)) return null;
	}
	throw new Error(
		`check-node-pins.sh exited ${code} and neither read nor refused .nvmrc:\n${out}${err}`
	);
}

// The major of the flake's dev shell, or null when the flake throws its own
// .nvmrc message. Any other evaluation error throws, with nix's output.
function flakeReads(text: string): string | null {
	const p = spawnSync(
		'nix-instantiate',
		['--eval', '--strict', '--json', '--expr', devShellPackages],
		{
			cwd: dir,
			encoding: 'utf8',
			env: { ...process.env, NO_COLOR: '1' }
		}
	);
	if (p.status === 0) {
		const packages: unknown = JSON.parse(p.stdout);
		if (Array.isArray(packages) && packages.length === 1 && typeof packages[0] === 'string') {
			return packages[0];
		}
	} else {
		// Nix also prints the source line of the throw, so match the message
		// it evaluated, which holds .nvmrc as JSON, and read that back.
		const refused =
			/^\s*error: flake\.nix: \.nvmrc holds (".*"), not one Node version such as 24 or 24\.12\.0$/m.exec(
				p.stderr
			);
		if (refused) {
			expect(JSON.parse(refused[1]!), 'the .nvmrc the flake read').toBe(text);
			return null;
		}
	}
	throw new Error(
		`nix-instantiate exited ${p.status} on an .nvmrc of ${JSON.stringify(text)}:\n${p.stdout}${p.stderr}`
	);
}

describe.skipIf(!hasNix)('flake.nix reads .nvmrc as check-node-pins.sh does', () => {
	it.each(nvmrcForms)('on an .nvmrc of %j', (text) => {
		write('.nvmrc', text);
		copyFileSync(path.join(repo, 'flake.nix'), path.join(dir, 'flake.nix'));
		mkdirSync(path.join(dir, 'nixpkgs'));
		write('nixpkgs/default.nix', nixpkgsStandIn);
		expect(flakeReads(text), 'the major the flake reads, null when it refuses').toBe(checkReads());
	});
});
