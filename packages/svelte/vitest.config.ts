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
					find: '@c15t/core/runtime',
					replacement: resolve(__dirname, '../core/src/runtime/index.ts'),
				},
				{
					find: '@c15t/core/modules/iframe-blocker',
					replacement: resolve(
						__dirname,
						'../core/src/modules/iframe-blocker/index.ts'
					),
				},
				{
					find: '@c15t/core/modules/network-blocker',
					replacement: resolve(
						__dirname,
						'../core/src/modules/network-blocker/index.ts'
					),
				},
				{
					find: '@c15t/core/modules/persistence',
					replacement: resolve(
						__dirname,
						'../core/src/modules/persistence/index.ts'
					),
				},
				{
					find: '@c15t/core/modules/script-loader',
					replacement: resolve(
						__dirname,
						'../core/src/modules/script-loader/index.ts'
					),
				},
				{
					find: '@c15t/core/modules/window-debug',
					replacement: resolve(
						__dirname,
						'../core/src/modules/window-debug/index.ts'
					),
				},
				{
					find: '@c15t/iab',
					replacement: resolve(__dirname, '../iab/src/index.ts'),
				},
				{
					find: '@c15t/schema/types',
					replacement: resolve(__dirname, '../schema/src/types.ts'),
				},
				{
					find: '@c15t/schema/config',
					replacement: resolve(__dirname, '../schema/src/config/index.ts'),
				},
				{
					find: '@c15t/schema',
					replacement: resolve(__dirname, '../schema/src/index.ts'),
				},
				{
					find: '@c15t/core',
					replacement: resolve(__dirname, '../core/src/index.ts'),
				},
				{
					find: '~',
					replacement: resolve(__dirname, '../core/src'),
				},
			],
			conditions: ['browser'],
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 30,

					functions: 45,
					lines: 50,
					statements: 50,
				},
			},
			environment: 'jsdom',
			include: [
				'src/**/*.test.ts',
				'src/**/*.test.svelte.ts',
				'src/**/*.spec.ts',
				'src/**/*.spec.svelte.ts',
			],
			setupFiles: ['./src/__tests__/setup.ts'],
		},
	})
);
