import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Lints the TypeScript game logic; Svelte components are type-checked by `npm run check`
// (svelte-check), matching the convention used across the other projects here.
export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			// ESLint allows intentionally-unused args/vars prefixed with `_`. `noUnusedLocals` in
			// tsconfig.json still fails `npm run check` on an unused local, `_` prefix or not.
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
