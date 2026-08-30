import { resolve } from 'node:path';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			environment: 'jsdom',
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
			],
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 60,
					statements: 60,
					functions: 85,
					branches: 65,
				},
			},
		},
	})
);
