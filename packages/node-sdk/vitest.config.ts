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
				// Appended to the base include list. Type tests run under tsc,
				// never under Vitest, so they would only count as uncovered.
				include: ['!**/*.type-test.ts'],
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 90,
					functions: 95,
					lines: 95,
					statements: 95,
				},
			},
			environment: 'node',
		},
	})
);
