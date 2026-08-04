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
			// PGlite and SQLite get a fresh in-process database per test, so files
			// cannot interfere and run in parallel. MySQL is a real server sharing
			// one schema, so two files migrating it at once produce failures that
			// depend on scheduling — the tests pass individually and fail
			// together. Opting into MySQL therefore opts into sequential files.
			fileParallelism: process.env.C15T_TEST_MYSQL_URL === undefined,
			// No coverage thresholds yet: the package has no behaviour to cover.
			// RFC 0004 §6 sets the floor at the old package's 55% once the first
			// handlers land, and it ratchets up from there — it never ships below
			// parity with @c15t/backend.
		},
	})
);
