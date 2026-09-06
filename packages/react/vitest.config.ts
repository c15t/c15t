import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

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
			// it on first sight mid-run and reloads the page ("optimized
			// dependencies changed"), which vitest-browser-react does not
			// survive; a cold CI cache hits this on every run.
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
		resolve: {
			alias: Object.fromEntries([
				['~', resolve(__dirname, './src')],
				// Resolve core package to source so Vite can handle its dynamic
				// imports natively. rslib emits webpack-style chunks that Vite's
				// browser bundler cannot analyse.
				[
					'@c15t/core/modules/script-loader',
					resolve(__dirname, '../core/src/modules/script-loader/index.ts'),
				],
				[
					'@c15t/core/modules/network-blocker',
					resolve(__dirname, '../core/src/modules/network-blocker/index.ts'),
				],
				[
					'@c15t/core/modules/iframe-blocker',
					resolve(__dirname, '../core/src/modules/iframe-blocker/index.ts'),
				],
				[
					'@c15t/core/modules/persistence',
					resolve(__dirname, '../core/src/modules/persistence/index.ts'),
				],
				[
					'@c15t/core/modules/window-debug',
					resolve(__dirname, '../core/src/modules/window-debug/index.ts'),
				],
				['@c15t/core', resolve(__dirname, '../core/src/index.ts')],
				['@c15t/schema/types', resolve(__dirname, '../schema/src/types.ts')],
				[
					'@c15t/schema/config',
					resolve(__dirname, '../schema/src/config/index.ts'),
				],
				['@c15t/schema', resolve(__dirname, '../schema/src/index.ts')],
				[
					'@c15t/translations/all',
					resolve(__dirname, '../translations/src/all.ts'),
				],
				[
					'@c15t/translations/en',
					resolve(__dirname, '../translations/src/translations/en.ts'),
				],
				[
					'@c15t/translations',
					resolve(__dirname, '../translations/src/index.ts'),
				],
				[
					'@c15t/ui/primitives/collapsible',
					resolve(__dirname, '../ui/src/primitives/collapsible/index.ts'),
				],
				[
					'@c15t/ui/primitives/preference-item',
					resolve(__dirname, '../ui/src/primitives/preference-item/index.ts'),
				],
				[
					'@c15t/ui/primitives/tabs',
					resolve(__dirname, '../ui/src/primitives/tabs/index.ts'),
				],
				[
					'@c15t/ui/styles/primitives/collapsible',
					resolve(__dirname, '../ui/src/styles/primitives/collapsible.ts'),
				],
				[
					'@c15t/ui/styles/primitives/preference-item',
					resolve(__dirname, '../ui/src/styles/primitives/preference-item.ts'),
				],
				[
					'@c15t/ui/styles/primitives/tabs',
					resolve(__dirname, '../ui/src/styles/primitives/tabs.ts'),
				],
				// @c15t/iab depends on @iabtechlabtcf/core which is only
				// installed in the iab package's node_modules.
				[
					'@iabtechlabtcf/core',
					resolve(__dirname, '../iab/node_modules/@iabtechlabtcf/core'),
				],
				['@c15t/iab/headless', resolve(__dirname, '../iab/src/headless.ts')],
				['@c15t/iab', resolve(__dirname, '../iab/src/index.ts')],
				['react', resolve(__dirname, './node_modules/react')],
				['react-dom', resolve(__dirname, './node_modules/react-dom')],
			]),
		},
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
			browser: {
				enabled: true,
				instances: [{ browser: 'chromium' }],
				provider: playwright(),
			},
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				exclude: ['src/utils/test-helpers.tsx'],
				thresholds: {
					branches: 50,
					functions: 60,
					lines: 65,
					statements: 60,
				},
			},
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
			],
			retry: 2,
			setupFiles: ['./src/test-setup.browser.ts'],
		},
	})
);
