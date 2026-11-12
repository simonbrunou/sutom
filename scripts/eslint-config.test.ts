// @vitest-environment node
// eslint.config.js runs `@typescript-eslint/no-deprecated` at `error` with type information
// (#244). Each case lints a text through the repo's real config that declares its own
// `@deprecated` function, so a dependency update that drops a third-party deprecation cannot turn
// a case red. A parse error also has severity 2, so each case lints the same text without the
// deprecated call and asserts no error. The project service parses only files that exist on
// disk, so each case lints under a path that exists: one inside tsconfig.json's `include` (this
// file) and one that only `allowDefaultProject` covers (eslint.config.js).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const repo = fileURLToPath(new URL('..', import.meta.url));
// One instance: the shared CI runner runs the tests several times slower than sbrn (#206), and
// each new instance builds its own TypeScript program.
const eslint = new ESLint({ cwd: repo });

const declaration = '/** @deprecated use g */\nexport function f() {\n\treturn 1;\n}\n';
const cases = [
	{ input: 'a path inside tsconfig.json', filePath: fileURLToPath(import.meta.url) },
	{ input: 'a root *.js path', filePath: path.join(repo, 'eslint.config.js') }
];

async function errors(text: string, filePath: string): Promise<Linter.LintMessage[]> {
	const [result] = await eslint.lintText(text, { filePath });
	return result.messages.filter((message) => message.severity === 2);
}

describe('eslint.config.js no-deprecated', () => {
	describe.each(cases)('$input', ({ filePath }) => {
		it('fails on a call to a @deprecated function', async () => {
			const found = await errors(`${declaration}export const x = f();\n`, filePath);
			expect(found.map(({ ruleId, line, message }) => ({ ruleId, line, message }))).toEqual([
				{
					ruleId: '@typescript-eslint/no-deprecated',
					line: 5,
					message: '`f` is deprecated. use g'
				}
			]);
		});

		it('passes the same text without the call', async () => {
			expect(await errors(`${declaration}export const x = 2;\n`, filePath)).toEqual([]);
		});
	});
});
