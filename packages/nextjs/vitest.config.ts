import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [react()],
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
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
				'@c15t/core/v3': resolve(__dirname, '../core/src/v3/index.ts'),
				'@c15t/core': resolve(__dirname, '../core/src/index.ts'),
				'@c15t/react/v3/provider': resolve(
					__dirname,
					'../react/dist/v3/provider.js'
				),
				'@c15t/react/v3/hooks': resolve(__dirname, '../react/dist/v3/hooks.js'),
				'@c15t/react/v3/module-hooks': resolve(
					__dirname,
					'../react/dist/v3/module-hooks.js'
				),
				'@c15t/react/v3/server': resolve(
					__dirname,
					'../react/dist/v3/server/index.js'
				),
				'@c15t/react/v3/headless': resolve(
					__dirname,
					'../react/dist/v3/headless.js'
				),
				'@c15t/react/v3': resolve(__dirname, '../react/dist/v3/index.js'),
				'@c15t/react/headless': resolve(__dirname, '../react/dist/headless.js'),
				'@c15t/translations/all': resolve(
					__dirname,
					'../translations/src/all.ts'
				),
				'@c15t/translations/en': resolve(
					__dirname,
					'../translations/src/translations/en.ts'
				),
				'@c15t/translations': resolve(
					__dirname,
					'../translations/src/index.ts'
				),
				'@c15t/schema/types': resolve(__dirname, '../schema/src/types.ts'),
				'@c15t/schema': resolve(__dirname, '../schema/src/index.ts'),
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
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 45,
					statements: 45,
					functions: 50,
					branches: 40,
				},
			},
		},
	})
);
