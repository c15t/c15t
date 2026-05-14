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
				'c15t-v3/modules/script-loader': resolve(
					__dirname,
					'../core-v3/src/modules/script-loader/index.ts'
				),
				'c15t-v3/modules/network-blocker': resolve(
					__dirname,
					'../core-v3/src/modules/network-blocker/index.ts'
				),
				'c15t-v3/modules/iframe-blocker': resolve(
					__dirname,
					'../core-v3/src/modules/iframe-blocker/index.ts'
				),
				'c15t-v3/modules/persistence': resolve(
					__dirname,
					'../core-v3/src/modules/persistence/index.ts'
				),
				'c15t-v3': resolve(__dirname, '../core-v3/src/index.ts'),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
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
				'@iabtechlabtcf/core': resolve(
					__dirname,
					'../iab/node_modules/@iabtechlabtcf/core'
				),
				'@c15t/iab-v3': resolve(__dirname, '../iab-v3/src/index.ts'),
				'@c15t/iab': resolve(__dirname, '../iab/src/index.ts'),
				react: resolve(__dirname, './node_modules/react'),
				'react-dom': resolve(__dirname, './node_modules/react-dom'),
			},
		},
		test: {
			include: [
				'src/v3/**/*.test.tsx',
				'src/v3/**/*.test.ts',
				'src/v3/**/*.spec.tsx',
				'src/v3/**/*.spec.ts',
				'src/v3/**/*.e2e.test.tsx',
			],
			exclude: [
				'src/v3/components/iab-consent-dialog/__tests__/legitimate-interest-ui.test.tsx',
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
