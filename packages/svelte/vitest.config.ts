// NOTE: This package uses vitest (not bun test) because @testing-library/svelte
// requires the @sveltejs/vite-plugin-svelte transform pipeline for component
// compilation. This is an intentional exception to the CLAUDE.md guideline.
//
// Two projects, because Svelte 5 dual-compiles components:
// - `client` resolves the `browser` condition and gets client-compiled
//   components, which is what `mount` and @testing-library/svelte need.
// - `ssr` resolves `svelte`/`node` and gets server-compiled components, which
//   is what `render()` from `svelte/server` needs. Files ending in
//   `.ssr.test.ts` run here.
import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, mergeConfig } from 'vitest/config';

const workspaceAliases = [
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
		replacement: resolve(__dirname, '../core/src/modules/persistence/index.ts'),
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
		find: '@c15t/core/server',
		replacement: resolve(__dirname, '../core/src/server/index.ts'),
	},
	// Before the bare specifier: Vite matches string aliases by prefix, so
	// `@c15t/iab` alone would rewrite `@c15t/iab/headless` into a path that
	// does not exist.
	{
		find: '@c15t/iab/headless',
		replacement: resolve(__dirname, '../iab/src/headless.ts'),
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
];

const SSR_TEST_GLOB = 'src/**/*.ssr.test.ts';

export default mergeConfig(
	baseConfig,
	defineConfig({
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
			projects: [
				{
					plugins: [svelte()],
					resolve: {
						alias: workspaceAliases,
						conditions: ['browser'],
					},
					test: {
						environment: 'jsdom',
						exclude: [SSR_TEST_GLOB],
						include: [
							'src/**/*.test.ts',
							'src/**/*.test.svelte.ts',
							'src/**/*.spec.ts',
							'src/**/*.spec.svelte.ts',
						],
						name: 'client',
						setupFiles: ['./src/__tests__/setup.ts'],
					},
				},
				{
					plugins: [svelte()],
					resolve: {
						alias: workspaceAliases,
						conditions: ['svelte', 'node'],
					},
					test: {
						environment: 'node',
						include: [SSR_TEST_GLOB],
						name: 'ssr',
					},
				},
			],
		},
	})
);
