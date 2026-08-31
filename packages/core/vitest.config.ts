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
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 65,

					functions: 65,
					lines: 65,
					statements: 65,
				},
			},
			environment: 'node',
			include: [
				'**/__tests__/**/**.test.ts',
				'**/__tests__/**/**.browser.test.ts',
			],
			mockReset: true,
			setupFiles: ['./vitest.setup.ts'],
		},
	})
);
