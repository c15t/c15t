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
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				exclude: [
					// The TurboModule spec only resolves inside a React Native runtime
					// with the New Architecture enabled, so no Node test can load it.
					'src/specs/**',
				],
				thresholds: {
					branches: 90,
					functions: 90,
					lines: 90,
					statements: 90,
				},
			},
			environment: 'node',
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/build/**',
				'**/.cache/**',
				'**/coverage/**',
			],
			include: [
				'src/**/*.test.tsx',
				'src/**/*.test.ts',
				'src/**/*.spec.tsx',
				'src/**/*.spec.ts',
			],
		},
	})
);
