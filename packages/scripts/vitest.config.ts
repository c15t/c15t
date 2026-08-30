import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': resolve(__dirname, './src'),
			},
		},
		test: {
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
				'src/**/*.e2e.test.tsx',
				'src/**/*.e2e.test.ts',
				'live-vendors/**/*.test.ts',
			],
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.cache/**',
				'**/coverage/**',
			],
			coverage: {
				// The live-vendor monitor drives real vendor endpoints from a
				// scheduled workflow rather than from unit tests, so it is
				// measured by its own run, not by this package's ratchet.
				exclude: ['live-vendors/**'],
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 85,
					statements: 85,
					functions: 90,
					branches: 80,
				},
			},
		},
	})
);
