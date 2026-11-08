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
	build: {
		// valid-guesses.txt loads as one lazy chunk of about 697 kB, past Vite's
		// 500 kB default; the home page waits for none of it (#195).
		chunkSizeWarningLimit: 750
	},
	test: {
		include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['src/tests/setup.ts'],
		globals: true,
		css: true,
		// The shared CI runner, loaded by other jobs, ran the tests in 140 s
		// against 16 s on sbrn, and one test took longer than vitest's 5 s
		// default (main at 8fdb037, #206). A minute, for tests and for hooks
		// such as a beforeEach that runs git, leaves room for that load.
		testTimeout: 60_000,
		hookTimeout: 60_000
	},
	resolve: {
		conditions: ['browser']
	}
});
