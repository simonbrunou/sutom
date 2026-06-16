import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Lints the TypeScript game logic; Svelte components are type-checked by `npm run check`
// (svelte-check), matching the convention used across the other projects here.
export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			// Allow intentionally-unused args/vars prefixed with `_`.
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
		}
	},
	{
		// Node-run config + asset scripts.
		files: ['svelte.config.js', 'scripts/**/*.{js,mjs}'],
		languageOptions: { globals: { console: 'readonly', process: 'readonly' } }
	},
	{ ignores: ['.svelte-kit/', 'build/', 'node_modules/'] }
);
