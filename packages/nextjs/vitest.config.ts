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
			// oxlint-disable-next-line sort-keys -- Vite resolves aliases in declaration order, so subpaths must precede package roots.
			alias: {
				'~': resolve(__dirname, './src'),
				'@c15t/react/devtools': resolve(__dirname, '../react/src/devtools.tsx'),
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
				'@c15t/react/server': resolve(
					__dirname,
					'../react/dist/server/index.js'
				),
				'@c15t/react/headless': resolve(__dirname, '../react/dist/headless.js'),
				'@c15t/react': resolve(__dirname, '../react/dist/index.js'),
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
			browser: {
				enabled: true,
				instances: [{ browser: 'chromium' }],
				provider: playwright(),
			},
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
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
			],
		},
	})
);
