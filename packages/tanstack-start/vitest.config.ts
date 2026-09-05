import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

// oxlint-disable-next-line sort-keys -- Vite resolves aliases in declaration order, so subpaths must precede package roots.
const alias = {
	'~': resolve(__dirname, './src'),
	'@c15t/core/modules/script-loader': resolve(
		__dirname,
		'../core/src/modules/script-loader/index.ts'
	),
	'@c15t/core/modules/network-blocker': resolve(
		__dirname,
		'../core/src/modules/network-blocker/index.ts'
	),
	'@c15t/core/modules/iframe-blocker': resolve(
		__dirname,
		'../core/src/modules/iframe-blocker/index.ts'
	),
	'@c15t/core/modules/persistence': resolve(
		__dirname,
		'../core/src/modules/persistence/index.ts'
	),
	'@c15t/core/modules/window-debug': resolve(
		__dirname,
		'../core/src/modules/window-debug/index.ts'
	),
	'@c15t/core/transports/manifest-cache': resolve(
		__dirname,
		'../core/src/transports/manifest-cache.ts'
	),
	'@c15t/core/transports/manifest': resolve(
		__dirname,
		'../core/src/transports/manifest.ts'
	),
	'@c15t/core': resolve(__dirname, '../core/src/index.ts'),
	'@c15t/react/provider': resolve(__dirname, '../react/dist/provider.js'),
	'@c15t/react/hooks': resolve(__dirname, '../react/dist/hooks.js'),
	'@c15t/react/module-hooks': resolve(
		__dirname,
		'../react/dist/module-hooks.js'
	),
	'@c15t/react/server': resolve(__dirname, '../react/dist/server/index.js'),
	'@c15t/react/headless': resolve(__dirname, '../react/dist/headless.js'),
	'@c15t/react': resolve(__dirname, '../react/dist/index.js'),
	'@c15t/translations/all': resolve(__dirname, '../translations/src/all.ts'),
	'@c15t/translations/en': resolve(
		__dirname,
		'../translations/src/translations/en.ts'
	),
	'@c15t/translations': resolve(__dirname, '../translations/src/index.ts'),
	'@c15t/schema/geo': resolve(__dirname, '../schema/src/shared/geo-headers.ts'),
	'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
	'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
};

/** `vitest run` is run mode; a bare `vitest` or `--watch` is watch mode. */
const isVitestWatchMode = function isVitestWatchMode(): boolean {
	const args = process.argv.slice(2);
	if (args.includes('--watch')) {
		return true;
	}
	return !(args.includes('run') || args.includes('--run'));
};

export default mergeConfig(
	baseConfig,
	defineConfig({
		optimizeDeps: {
			// Build tooling reached through rslib.config.ts / shared rslib-utils
			// is not a browser dependency. Left to discovery, Vite pre-bundles
			// it on first sight mid-run and reloads the page, which
			// vitest-browser-react does not survive on a cold CI cache.
			exclude: [
				'@rsbuild/plugin-react',
				'@rslib/core',
				'@rsdoctor/rspack-plugin',
				'@rsdoctor/core',
				'@rspack/resolver',
				'@rspack/resolver-binding-wasm32-wasi',
			],
		},
		plugins: [react()],
		resolve: { alias },
		server: {
			// Sibling packages regenerate `src/version.ts` in their own prebuild
			// while these browser tests run against core source through the
			// aliases above. With a file watcher active that rewrite reloads a
			// test mid-run, which vitest-browser-react does not survive, so the
			// watcher is off for `vitest run` and left on for watch mode (the
			// `test:watch` scripts, or an explicit `--watch`).
			watch: isVitestWatchMode() ? undefined : null,
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 40,
					functions: 50,
					lines: 45,
					statements: 45,
				},
			},
			projects: [
				{
					extends: true,
					test: {
						environment: 'node',
						include: ['src/**/*.test.ts'],
						name: 'node',
					},
				},
				{
					extends: true,
					test: {
						browser: {
							enabled: true,
							instances: [{ browser: 'chromium' }],
							provider: playwright(),
						},
						include: ['src/**/*.test.tsx'],
						name: 'browser',
					},
				},
			],
		},
	})
);
