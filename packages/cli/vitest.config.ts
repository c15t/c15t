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
				// Functions/branches currently measure below 30%, so only
				// lines/statements are enforced for now.
				thresholds: {
					lines: 30,
					statements: 30,
				},
			},
		},
	})
);
