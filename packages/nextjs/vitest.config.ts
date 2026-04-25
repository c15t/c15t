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
				'c15t/v3/modules/script-loader': resolve(
					__dirname,
					'../core/src/v3/modules/script-loader/index.ts'
				),
				'c15t/v3/modules/network-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/network-blocker/index.ts'
				),
				'c15t/v3/modules/iframe-blocker': resolve(
					__dirname,
					'../core/src/v3/modules/iframe-blocker/index.ts'
				),
				'c15t/v3/modules/persistence': resolve(
					__dirname,
					'../core/src/v3/modules/persistence/index.ts'
				),
				'c15t/v3': resolve(__dirname, '../core/src/v3/index.ts'),
				c15t: resolve(__dirname, '../core/src/index.ts'),
				'@c15t/react/v3': resolve(__dirname, '../react/src/v3/index.ts'),
				'@c15t/react/server': resolve(
					__dirname,
					'../react/src/server/index.ts'
				),
				'@c15t/react': resolve(__dirname, '../react/src/index.ts'),
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
		},
	})
);
