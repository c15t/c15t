import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
	baseConfig,
	defineConfig({
		test: {
			environment: 'node',
			include: ['**/__tests__/**/*.test.ts'],
			passWithNoTests: true,
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 50,
					statements: 50,
					functions: 55,
					branches: 35,
				},
			},
		},
	})
);
