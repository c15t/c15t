import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig } from 'vitest/config';

const assignInOrder = Object.assign;

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: assignInOrder(
				{},
				{ '~': resolve(__dirname, './src') },
				{ '#imports': resolve(__dirname, './src/runtime/vue/stubs.ts') },
				{
					'#c15t/composables': resolve(
						__dirname,
						'./src/runtime/composables/index.ts'
					),
				},
				{
					'@c15t/core/modules/script-loader': resolve(
						__dirname,
						'../core/src/modules/script-loader/index.ts'
					),
				},
				{
					'@c15t/core/modules/network-blocker': resolve(
						__dirname,
						'../core/src/modules/network-blocker/index.ts'
					),
				},
				{
					'@c15t/core/modules/iframe-blocker': resolve(
						__dirname,
						'../core/src/modules/iframe-blocker/index.ts'
					),
				},
				{
					'@c15t/core/modules/persistence': resolve(
						__dirname,
						'../core/src/modules/persistence/index.ts'
					),
				},
				{
					'@c15t/core/modules/window-debug': resolve(
						__dirname,
						'../core/src/modules/window-debug/index.ts'
					),
				},
				{
					'@c15t/core/consent-record': resolve(
						__dirname,
						'../core/src/consent-record/index.ts'
					),
				},
				{
					'@c15t/core/transports/manifest-cache': resolve(
						__dirname,
						'../core/src/transports/manifest-cache.ts'
					),
				},
				{
					'@c15t/core/transports/manifest': resolve(
						__dirname,
						'../core/src/transports/manifest.ts'
					),
				},
				{
					'@c15t/core/runtime': resolve(
						__dirname,
						'../core/src/runtime/index.ts'
					),
				},
				{ '@c15t/core': resolve(__dirname, '../core/src/index.ts') },
				{
					'@c15t/translations/all': resolve(
						__dirname,
						'../translations/src/all.ts'
					),
				},
				{
					'@c15t/translations/en': resolve(
						__dirname,
						'../translations/src/translations/en.ts'
					),
				},
				{
					'@c15t/translations': resolve(
						__dirname,
						'../translations/src/index.ts'
					),
				},
				{
					'@c15t/conformance': resolve(
						__dirname,
						'../../internals/conformance/src/index.ts'
					),
				},
				{ '@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts') },
				{
					'@c15t/schema/config': resolve(
						__dirname,
						'../schema/src/config/index.ts'
					),
				},
				{ '@c15t/schema': resolve(__dirname, '../schema/src/index.ts') }
			),
		},
		test: {
			coverage: {
				exclude: ['playground/**'],
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				// Statements/functions/branches currently measure below 30%
				// (untested files in the include glob inflate the denominator),
				// so only lines is enforced for now.
				thresholds: {
					lines: 45,
				},
			},
			environment: 'jsdom',
			include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		},
	})
);
