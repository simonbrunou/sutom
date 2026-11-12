import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Lints the TypeScript game logic with type information, so `@typescript-eslint/no-deprecated`
// can read `@deprecated` tags and fail `npm run lint` on a call to a deprecated API (#244).
// Svelte components are type-checked by `npm run check` (svelte-check), matching the convention
// used across the other projects here, and get no deprecation check: ESLint does not lint
// `.svelte` files, and svelte-check reports no error or warning for a deprecated call.
export default defineConfig(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				// Files outside tsconfig.json's `include` get type information from the project
				// service's default project instead of a wider tsconfig. typescript-eslint rejects
				// `**` in these globs. A new linted file that matches neither the tsconfig nor a glob
				// here fails `npm run lint` with "was not found by the project service": add a glob.
				projectService: { allowDefaultProject: ['*.js', 'scripts/*.mjs'] },
				tsconfigRootDir: import.meta.dirname
			}
		},
		rules: {
			'@typescript-eslint/no-deprecated': 'error',
			// ESLint allows intentionally-unused args/vars prefixed with `_`. `noUnusedLocals` in
			// tsconfig.json has its own, narrower `_` exemptions: an unused plain local such as
			// `const _x = 1` still fails `npm run check`.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	{
		// Node-run asset scripts.
		files: ['scripts/**/*.{js,mjs}'],
		languageOptions: { globals: { console: 'readonly', process: 'readonly' } }
	},
	{ ignores: ['.svelte-kit/', 'build/', 'node_modules/'] }
);
