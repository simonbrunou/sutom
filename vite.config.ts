import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'jsdom',
		setupFiles: ['src/tests/setup.ts'],
		globals: true,
		css: true,
		alias: {
			'$lib': path.resolve(__dirname, 'src/lib')
		}
	},
	resolve: {
		conditions: ['browser']
	}
});
