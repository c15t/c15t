import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import vue from '@vitejs/plugin-vue';
import { defineConfig, mergeConfig } from 'vitest/config';

const assignInOrder = Object.assign;

/**
 * `@c15t/translations/<lang>` for every language module, ahead of the
 * package-root alias, which would otherwise swallow them.
 */
const translationLanguages = Object.fromEntries(
	readdirSync(resolve(__dirname, '../translations/src/languages'))
		.filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
		.map((file) => [
			`@c15t/translations/${file.slice(0, -'.ts'.length)}`,
			resolve(__dirname, '../translations/src/languages', file),
		])
);

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [vue()],
		resolve: {
			alias: assignInOrder(
				{},
				{ '~': resolve(__dirname, './src') },
				{ '@c15t/core/build': resolve(__dirname, '../core/src/build.ts') },
				{ '#imports': resolve(__dirname, './src/runtime/vue/stubs.ts') },
				{
					'#c15t/composables': resolve(
						__dirname,
						'./src/runtime/composables/index.ts'
					),
				},
				{
					'#c15t/server-app-config': resolve(
						__dirname,
						'./src/__tests__/server-app-config.ts'
					),
				},
				{
					'#c15t/client-manifest-snapshot': resolve(
						__dirname,
						'./src/__tests__/manifest-snapshot.ts'
					),
					'#c15t/manifest-snapshot': resolve(
						__dirname,
						'./src/__tests__/manifest-snapshot.ts'
					),
					'#c15t/server-manifest-snapshot': resolve(
						__dirname,
						'./src/__tests__/manifest-snapshot.ts'
					),
				},
				{
					'@c15t/core/generated': resolve(
						__dirname,
						'../core/src/generated.ts'
					),
					'@c15t/core/modes': resolve(__dirname, '../core/src/modes.ts'),
					'@c15t/core/runtime/client-mode': resolve(
						__dirname,
						'../core/src/runtime/client-mode.ts'
					),
				},
				{
					'@c15t/core/modules/clear-on-revocation': resolve(
						__dirname,
						'../core/src/modules/clear-on-revocation/index.ts'
					),
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
					'@c15t/core/modules/network-hold': resolve(
						__dirname,
						'../core/src/modules/network-blocker/hold.ts'
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
					'@c15t/core/transports/manifest-browser': resolve(
						__dirname,
						'../core/src/transports/manifest-browser.ts'
					),
				},
				{
					'@c15t/core/transports/manifest': resolve(
						__dirname,
						'../core/src/transports/manifest.ts'
					),
				},
				{
					'@c15t/core/server': resolve(
						__dirname,
						'../core/src/server/index.ts'
					),
				},
				{
					'@c15t/core/surface-actions': resolve(
						__dirname,
						'../core/src/surface-actions/index.ts'
					),
				},
				{
					'@c15t/core/runtime/controls': resolve(
						__dirname,
						'../core/src/runtime/controls.ts'
					),
					'@c15t/core/runtime/on-demand': resolve(
						__dirname,
						'../core/src/runtime/on-demand.ts'
					),
					'@c15t/core/runtime/provider': resolve(
						__dirname,
						'../core/src/runtime/provider.ts'
					),
				},
				{
					'@c15t/core/preference-draft': resolve(
						__dirname,
						'../core/src/preference-draft/index.ts'
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
				translationLanguages,
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
