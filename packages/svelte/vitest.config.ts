import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [svelte()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
			conditions: ['browser'],
		},
		test: {
			include: [
				'src/**/*.test.ts',
				'src/**/*.test.svelte.ts',
				'src/**/*.spec.ts',
				'src/**/*.spec.svelte.ts',
			],
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
		},
	})
);
