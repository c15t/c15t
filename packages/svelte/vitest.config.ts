// NOTE: This package uses vitest (not bun test) because @testing-library/svelte
// requires the @sveltejs/vite-plugin-svelte transform pipeline for component
// compilation. This is an intentional exception to the CLAUDE.md guideline.
import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [svelte()],
		resolve: {
			alias: [
				{
					find: 'c15t/v3/modules/iframe-blocker',
					replacement: resolve(
						__dirname,
						'../core-v3/src/modules/iframe-blocker/index.ts'
					),
				},
				{
					find: 'c15t/v3/modules/network-blocker',
					replacement: resolve(
						__dirname,
						'../core-v3/src/modules/network-blocker/index.ts'
					),
				},
				{
					find: 'c15t/v3/modules/persistence',
					replacement: resolve(
						__dirname,
						'../core-v3/src/modules/persistence/index.ts'
					),
				},
				{
					find: 'c15t/v3/modules/script-loader',
					replacement: resolve(
						__dirname,
						'../core-v3/src/modules/script-loader/index.ts'
					),
				},
				{
					find: '@c15t/iab/v3',
					replacement: resolve(__dirname, '../iab-v3/src/index.ts'),
				},
				{
					find: 'c15t/v3',
					replacement: resolve(__dirname, '../core-v3/src/index.ts'),
				},
				{
					find: '~',
					replacement: resolve(__dirname, '../core/src'),
				},
			],
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
