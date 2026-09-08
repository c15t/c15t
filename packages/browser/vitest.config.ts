import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: [{ find: '~', replacement: resolve(__dirname, './src') }],
		},
		test: {
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					branches: 60,
					functions: 70,
					lines: 70,
					statements: 70,
				},
			},
			environment: 'jsdom',
			include: ['src/**/__tests__/**/*.test.ts'],
		},
	})
);
