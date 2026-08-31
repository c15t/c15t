import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: [
				{
					find: '@c15t/translations/all',
					replacement: resolve(__dirname, '../translations/src/all.ts'),
				},
				{
					find: '@c15t/translations',
					replacement: resolve(__dirname, '../translations/src/index.ts'),
				},
				{
					find: '@c15t/core',
					replacement: resolve(__dirname, '../core/dist/index.js'),
				},
				{ find: '~', replacement: resolve(__dirname, './src') },
			],
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 45,
					functions: 65,
					lines: 45,
					statements: 45,
				},
			},
			environment: 'jsdom',
			include: [
				'src/**/__tests__/**/*.test.ts',
				'src/**/__tests__/**/*.test.tsx',
			],
		},
	})
);
