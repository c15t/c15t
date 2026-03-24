import { resolve } from 'node:path';
import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [react()],
		optimizeDeps: {
			exclude: [
				'@rsdoctor/rspack-plugin',
				'@rsdoctor/core',
				'@rspack/resolver',
				'@rspack/resolver-binding-wasm32-wasi',
			],
		},
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
				// Resolve core package to source so Vite can handle its dynamic
				// imports natively. rslib emits webpack-style chunks that Vite's
				// browser bundler cannot analyse.
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
				'@c15t/schema/types': resolve(
					__dirname,
					'../schema/src/types/index.ts'
				),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/translations/all': resolve(
					__dirname,
					'../translations/src/all.ts'
				),
				'@c15t/ui/primitives/collapsible': resolve(
					__dirname,
					'../ui/src/primitives/collapsible/index.ts'
				),
				'@c15t/ui/primitives/preference-item': resolve(
					__dirname,
					'../ui/src/primitives/preference-item/index.ts'
				),
				'@c15t/ui/primitives/tabs': resolve(
					__dirname,
					'../ui/src/primitives/tabs/index.ts'
				),
				'@c15t/ui/styles/primitives/collapsible': resolve(
					__dirname,
					'../ui/src/styles/primitives/collapsible.ts'
				),
				'@c15t/ui/styles/primitives/preference-item': resolve(
					__dirname,
					'../ui/src/styles/primitives/preference-item.ts'
				),
				'@c15t/ui/styles/primitives/tabs': resolve(
					__dirname,
					'../ui/src/styles/primitives/tabs.ts'
				),
				// @c15t/iab depends on @iabtechlabtcf/core which is only
				// installed in the iab package's node_modules.
				'@iabtechlabtcf/core': resolve(
					__dirname,
					'../iab/node_modules/@iabtechlabtcf/core'
				),
				'@c15t/iab': resolve(__dirname, '../iab/src/index.ts'),
				react: resolve(__dirname, './node_modules/react'),
				'react-dom': resolve(__dirname, './node_modules/react-dom'),
			},
		},
		test: {
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
			],
			browser: {
				enabled: true,
				provider: playwright(),
				instances: [{ browser: 'chromium' }],
			},
			setupFiles: ['./src/test-setup.browser.ts'],
			retry: 2,
		},
	})
);
