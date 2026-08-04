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
			},
		},
		test: {
			environment: 'node',
			// No coverage thresholds yet: the package has no behaviour to cover.
			// RFC 0004 §6 sets the floor at the old package's 55% once the first
			// handlers land, and it ratchets up from there — it never ships below
			// parity with @c15t/backend.
		},
	})
);
