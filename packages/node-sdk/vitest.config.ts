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
			environment: 'node',
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 75,
					statements: 75,
					functions: 65,
					branches: 75,
				},
			},
		},
	})
);
