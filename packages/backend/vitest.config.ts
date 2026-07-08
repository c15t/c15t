import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseConfig } from '@c15t/vitest-config/base';
import { defineConfig, mergeConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default mergeConfig(
	baseConfig,
	defineConfig({
		resolve: {
			alias: {
				'~': path.resolve(__dirname, './src'),
				// Workaround: fumadb imports without extension, but Node ESM needs .js
				'semver/functions/compare': 'semver/functions/compare.js',
			},
		},
		test: {
			environment: 'node',
			server: {
				deps: {
					inline: ['fumadb'],
				},
			},
			coverage: {
				// Coverage ratchet: floors below current coverage so regressions
				// fail CI. Raise as coverage improves; never lower.
				thresholds: {
					lines: 55,
					statements: 55,
					functions: 50,
					branches: 60,
				},
			},
		},
	})
);
