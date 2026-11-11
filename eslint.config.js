import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Lints the TypeScript game logic; Svelte components are type-checked by `npm run check`
// (svelte-check), matching the convention used across the other projects here.
export default defineConfig(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
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
