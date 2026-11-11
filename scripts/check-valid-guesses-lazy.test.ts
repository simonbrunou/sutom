// @vitest-environment node
// scripts/check-valid-guesses-lazy.sh (#232) on a throwaway tree that each
// test builds afresh: the two word lists in src/lib/ and a build/ shaped like
// SvelteKit's, whose index.html modulepreloads some chunks, links a
// stylesheet and imports two entry files from its inline script. The
// valid-guesses list sits in a lazy chunk index.html does not name. A test
// changes one thing and asserts the exit code and the message, so each
// failing fixture breaks one rule only and a rule removed from the script
// turns its own test red.
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = path.join(repo, 'scripts', 'check-valid-guesses-lazy.sh');

const IMMUTABLE = 'build/_app/immutable';
const START = `${IMMUTABLE}/entry/start.js`;
const APP = `${IMMUTABLE}/entry/app.js`;
const SHARED = `${IMMUTABLE}/chunks/shared.js`;
const LAZY = `${IMMUTABLE}/chunks/lazy.js`;
const NODE0 = `${IMMUTABLE}/nodes/0.js`;
const NODE2 = `${IMMUTABLE}/nodes/2.js`;
const CSS = `${IMMUTABLE}/assets/0.css`;

const WORDS = ['ABACA', 'ABACULE', 'ABAISSA'];
// The two shapes a bundler can give the list: a template literal with real
// newlines (what Vite writes today), and a one-line string with \n escapes.
const SHAPES = {
	'a template literal with real newlines': `var e=\`${WORDS.join('\n')}\n\`;export{e as default};\n`,
	'a one-line string with \\n escapes': `var e="${WORDS.join('\\n')}\\n";export{e as default};\n`
};
const LIST_CHUNK = SHAPES['a template literal with real newlines'];

const PRELOADS = [START, SHARED, NODE0, NODE2];

function indexHtml(head: string, script: string): string {
	return `<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<title>SUTOM</title>
${head}
	</head>
	<body>
		<div style="display: contents">
			<script>
${script}
			</script>
		</div>
	</body>
</html>
`;
}

// The index.html SvelteKit writes, trimmed: the inline script imports
// start.js, which is modulepreloaded too, and app.js, which is not.
const HEALTHY_INDEX = indexHtml(
	[
		...PRELOADS.map((f) => `		<link href="./${f.slice('build/'.length)}" rel="modulepreload">`),
		`		<link href="./${CSS.slice('build/'.length)}" rel="stylesheet">`
	].join('\n'),
	`				import("./_app/immutable/entry/start.js").then(async (kit) => {
					const app = await import("./_app/immutable/entry/app.js");
					kit.start(app);
				});`
);

const base = mkdtempSync(path.join(tmpdir(), 'check-valid-guesses-lazy-'));
// The current test's tree: base/<test number>.
let tree = '';
let testNumber = 0;

afterAll(() => {
	rmSync(base, { recursive: true, force: true });
});

// Write each file (null deletes it).
function write(files: Record<string, string | null>): void {
	for (const [file, text] of Object.entries(files)) {
		const p = path.join(tree, file);
		if (text === null) {
			rmSync(p, { recursive: true, force: true });
		} else {
			mkdirSync(path.dirname(p), { recursive: true });
			writeFileSync(p, text);
		}
	}
}

beforeEach(() => {
	testNumber += 1;
	tree = path.join(base, String(testNumber));
	mkdirSync(tree, { recursive: true });
	write({
		'src/lib/valid-guesses.txt': `${WORDS.join('\n')}\n`,
		'src/lib/dictionary.txt': 'ABAISSA\nMAISON\n',
		'build/index.html': HEALTHY_INDEX,
		'build/404.html': HEALTHY_INDEX,
		[START]: 'export function start() {}\n',
		[APP]: 'import "./shared.js";\nexport const nodes = [];\n',
		[SHARED]: 'export const words = `ABAISSA\nMAISON\n`;\n',
		[NODE0]: 'export const layout = 1;\n',
		[NODE2]: 'const load = () => import("../chunks/lazy.js");\nexport { load };\n',
		[CSS]: 'body { margin: 0; }\n',
		[LAZY]: LIST_CHUNK
	});
});

function run(args: string[] = [tree], env: NodeJS.ProcessEnv = process.env) {
	const p = spawnSync(scriptPath, args, { encoding: 'utf8', env });
	return { code: p.status, out: p.stdout, err: p.stderr };
}

function passes(): string {
	const { code, out, err } = run();
	expect(code, err).toBe(0);
	expect(err).toBe('');
	expect(out.trim().split('\n')).toHaveLength(1);
	return out;
}

// Exit 1: the list is on the load path; the message names each file.
function findsListIn(...files: string[]): string {
	const { code, out, err } = run();
	expect(code, `${out}${err}`).toBe(1);
	expect(err).toContain("the valid-guesses list is back on the home page's load path (#195)");
	expect(err).toContain('loadValidGuesses');
	const named = err.split('\n').filter((line) => line.startsWith('  '));
	expect(named.map((line) => line.trim()).sort()).toEqual([...files].sort());
	return err;
}

// Exit 2: a premise of the check fails.
function refuses(...messages: string[]): string {
	const { code, out, err } = run();
	expect(code, `${out}${err}`).toBe(2);
	expect(out).toBe('');
	for (const message of messages) expect(err).toContain(message);
	return err;
}

describe('check-valid-guesses-lazy passes', () => {
	it('when the list sits only in a chunk index.html does not name, and prints one line', () => {
		// index.html, plus start, shared, nodes/0, nodes/2, the stylesheet and
		// app.js: start.js, named twice, counts once.
		expect(passes()).toBe(
			"check-valid-guesses-lazy: build/index.html and the 6 files it names under build/_app/ hold no ABACULE: the valid-guesses list stays off the home page's load path\n"
		);
	});

	it('when 404.html, which it does not read, holds the list', () => {
		write({ 'build/404.html': `${HEALTHY_INDEX}<!-- ${WORDS.join(' ')} -->\n` });
		passes();
	});
});

describe('check-valid-guesses-lazy finds the list', () => {
	it.each(Object.entries(SHAPES))('in the home page node chunk, as %s', (_, chunk) => {
		write({ [NODE2]: chunk });
		findsListIn(NODE2);
	});

	it('in a shared chunk index.html modulepreloads', () => {
		write({ [SHARED]: LIST_CHUNK });
		findsListIn(SHARED);
	});

	it('in a module only the inline script imports', () => {
		write({ [APP]: LIST_CHUNK });
		findsListIn(APP);
	});

	it('in index.html itself', () => {
		write({
			'build/index.html': HEALTHY_INDEX.replace(
				'</head>',
				`<script>const e = \`${WORDS.join('\n')}\`;</script></head>`
			)
		});
		findsListIn('build/index.html');
	});

	it('in every file that holds it, naming each', () => {
		write({ [NODE2]: LIST_CHUNK, [START]: LIST_CHUNK });
		findsListIn(NODE2, START);
	});

	it.each([
		['a root-absolute href', '<link href="/_app/immutable/chunks/lazy.js" rel="modulepreload">'],
		[
			'an href under a base path',
			'<link href="/sutom/_app/immutable/chunks/lazy.js" rel="modulepreload">'
		],
		['an href with no ./', '<link href="_app/immutable/chunks/lazy.js" rel="modulepreload">'],
		['a single-quoted href', "<link rel='modulepreload' href='./_app/immutable/chunks/lazy.js'>"],
		[
			'an unquoted href before a blank',
			'<link href=./_app/immutable/chunks/lazy.js rel=modulepreload>'
		],
		[
			'an unquoted src before >',
			'<script type=module src=./_app/immutable/chunks/lazy.js></script>'
		],
		['a module script', '<script type="module" src="./_app/immutable/chunks/lazy.js"></script>'],
		['a CSS url()', '<style>body { background: url(./_app/immutable/chunks/lazy.js); }</style>'],
		['a single-quoted import()', "<script>import('./_app/immutable/chunks/lazy.js')</script>"],
		[
			'an import() of a template literal',
			'<script>import(`./_app/immutable/chunks/lazy.js`)</script>'
		],
		[
			'a tag split over lines',
			'<link\n\t\trel="modulepreload"\n\t\thref="./_app/immutable/chunks/lazy.js"\n\t>'
		]
	])('in a file index.html names through %s', (_, tag) => {
		write({ 'build/index.html': HEALTHY_INDEX.replace('</head>', `${tag}\n</head>`) });
		findsListIn(LAZY);
	});
});

describe('check-valid-guesses-lazy refuses to check', () => {
	it('when the marker is not a line of valid-guesses.txt', () => {
		write({ 'src/lib/valid-guesses.txt': 'ABACA\nABACULES\nABAISSA\n' });
		refuses(
			'the marker ABACULE is not a line of src/lib/valid-guesses.txt',
			'pick another word found only in src/lib/valid-guesses.txt'
		);
	});

	it('when valid-guesses.txt is missing', () => {
		write({ 'src/lib/valid-guesses.txt': null });
		refuses('cannot read src/lib/valid-guesses.txt');
	});

	it('when the marker is a line of dictionary.txt', () => {
		write({ 'src/lib/dictionary.txt': 'ABACULE\nABAISSA\nMAISON\n' });
		refuses(
			'the marker ABACULE appears in src/lib/dictionary.txt',
			'pick another word found only in src/lib/valid-guesses.txt'
		);
	});

	it('when the marker is inside a longer word of dictionary.txt', () => {
		write({ 'src/lib/dictionary.txt': 'ABACULES\nABAISSA\nMAISON\n' });
		refuses('the marker ABACULE appears in src/lib/dictionary.txt');
	});

	it('when dictionary.txt is missing', () => {
		write({ 'src/lib/dictionary.txt': null });
		refuses('cannot read src/lib/dictionary.txt');
	});

	it('when build/index.html is missing', () => {
		write({ 'build/index.html': null });
		refuses('build/index.html is missing: run `npm run build` first');
	});

	it('when no file under build/ holds the marker', () => {
		write({ [LAZY]: 'var e=`ABACA\nABAISSA\n`;export{e as default};\n' });
		refuses('no file under build/ contains the marker ABACULE');
	});

	it('when index.html names no file under _app/', () => {
		write({ 'build/index.html': indexHtml('', '				console.log(1);') });
		refuses('build/index.html names no file under _app/ to load up front');
	});

	it('when a path in index.html names no file, even with the list in no file it names', () => {
		write({
			'build/index.html': HEALTHY_INDEX.replace(
				'</head>',
				'<link href="./_app/immutable/chunks/gone.js" rel="modulepreload">\n</head>'
			)
		});
		const err = refuses('build/index.html names paths that name no file under build/');
		expect(err).toContain('  _app/immutable/chunks/gone.js\n');
	});

	it('when a path in index.html names a directory', () => {
		write({
			'build/index.html': HEALTHY_INDEX.replace(
				'</head>',
				'<link href="./_app/immutable/chunks" rel="modulepreload">\n</head>'
			)
		});
		refuses('  _app/immutable/chunks\n');
	});

	it('when grep cannot read a file index.html names', () => {
		// chmod 000 stops no run as root, which CI's job is, so a grep first on
		// PATH fails on the home page node chunk the way a read error does.
		const realGrep = execFileSync('sh', ['-c', 'command -v grep'], { encoding: 'utf8' }).trim();
		write({
			'shim/grep': `#!/bin/sh
for a in "$@"; do
	case $a in */nodes/2.js) echo "grep: $a: Input/output error" >&2; exit 2 ;; esac
done
exec ${realGrep} "$@"
`
		});
		chmodSync(path.join(tree, 'shim/grep'), 0o755);
		const { code, out, err } = run([tree], {
			...process.env,
			PATH: `${path.join(tree, 'shim')}:${process.env.PATH}`
		});
		expect(code, `${out}${err}`).toBe(2);
		expect(out).toBe('');
		expect(err).toContain('nodes/2.js: Input/output error');
		expect(err).toContain('grep could not read every file build/index.html names (grep exit 2)');
	});
});

describe('check-valid-guesses-lazy usage', () => {
	it.each([[['-h']], [['a', 'b']]])('exits 2 on %j', (args) => {
		const { code, err } = run(args);
		expect(code).toBe(2);
		expect(err).toContain('usage: scripts/check-valid-guesses-lazy.sh [<repo dir>]');
	});

	it('exits 2 on a repo dir that is no directory', () => {
		const { code, err } = run([path.join(tree, 'nowhere')]);
		expect(code).toBe(2);
		expect(err).toContain('nowhere is not a directory');
	});
});
