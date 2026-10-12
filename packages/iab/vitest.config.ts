import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 35,

					functions: 55,
					lines: 50,
					statements: 50,
				},
			},
			environment: 'node',
			include: ['**/__tests__/**/*.test.ts'],
			passWithNoTests: true,
		},
	})
);
