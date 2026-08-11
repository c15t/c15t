import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: {
				'~/libs/determine-model': resolve(
					__dirname,
					'../core/src/libs/determine-model.ts'
				),
				'~/store/type': resolve(__dirname, '../core/src/store/type.ts'),
				'~/types/compliance': resolve(
					__dirname,
					'../core/src/types/compliance.ts'
				),
				'~/version': resolve(__dirname, '../core/src/version.ts'),
				'~': resolve(__dirname, './src'),
				'#imports': resolve(__dirname, './src/runtime/vue/stubs.ts'),
				'#c15t/composables': resolve(
					__dirname,
					'./src/runtime/composables/index.ts'
				),
				// Point c15t/v3 at source so v3 changes in core don't
				// need a rebuild before these tests can run.
				'@c15t/core/v3/modules/script-loader': resolve(
					__dirname,
					'../core/src/v3/modules/script-loader/index.ts'
				),
				'@c15t/core/v3/modules/network-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/network-blocker/index.ts'
				),
				'@c15t/core/v3/modules/iframe-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/iframe-blocker/index.ts'
				),
				'@c15t/core/v3/modules/persistence': resolve(
					__dirname,
					'../core/src/v3/modules/persistence/index.ts'
				),
				'@c15t/core/v3/modules/window-debug': resolve(
					__dirname,
					'../core/src/v3/modules/window-debug/index.ts'
				),
				'@c15t/core/v3/consent-record': resolve(
					__dirname,
					'../core/src/v3/consent-record/index.ts'
				),
				'@c15t/core/v3': resolve(__dirname, '../core/src/v3/index.ts'),
				'@c15t/core': resolve(__dirname, '../core/src/index.ts'),
				'@c15t/translations/all': resolve(
					__dirname,
					'../translations/src/all.ts'
				),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/conformance': resolve(
					__dirname,
					'../../internals/conformance/src/index.ts'
				),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema/config': resolve(
					__dirname,
					'../schema/src/config/index.ts'
				),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
			},
		},
		test: {
			environment: 'jsdom',
			include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
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
		},
	})
);
