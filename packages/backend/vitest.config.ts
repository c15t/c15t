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
			deps: {
				inline: ['fumadb'],
			},
		},
	})
);
