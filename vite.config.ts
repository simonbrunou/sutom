import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

type BasePath = '' | `/${string}`;

const isBasePath = (value: string): value is BasePath => value === '' || value.startsWith('/');

const base = process.env.BASE_PATH ?? '';
if (!isBasePath(base)) {
	throw new Error(`BASE_PATH must be empty or start with "/" (got "${base}")`);
}

export default defineConfig({
	plugins: [
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter({ fallback: '404.html' }),
			paths: { base }
		})
	],
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['src/tests/setup.ts'],
		globals: true,
		css: true
	},
	resolve: {
		conditions: ['browser']
	}
});
